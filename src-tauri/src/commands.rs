use tauri::{State, Window, Emitter, Manager};
use std::process::{Command as StdCommand, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::Path;
use serde_json::json;
use crate::ScrcpyState;
use tokio::process::Command as TokioCommand;
use tokio::io::{BufReader, AsyncBufReadExt};
use tokio::time::{timeout, Duration};
use serde::Deserialize;
use flate2::read::GzDecoder;
use tar::Archive;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn get_binary_path(binary_name: &str, custom_folder: Option<String>) -> String {
    let exe_ext = std::env::consts::EXE_EXTENSION;
    let binary_filename = if exe_ext.is_empty() {
        binary_name.to_string()
    } else {
        format!("{}.{}", binary_name, exe_ext)
    };

    if let Some(folder) = custom_folder {
        let full_path = Path::new(&folder).join(&binary_filename);
        if full_path.exists() {
            return full_path.to_string_lossy().to_string();
        }
    }
    
    // Check local scrcpy-bin folder automatically (current dir)
    if let Ok(current_dir) = std::env::current_dir() {
        let local_bin = current_dir.join("scrcpy-bin").join(&binary_filename);
        if local_bin.exists() {
            return local_bin.to_string_lossy().to_string();
        }
    }

    // Check relative to executable (for portable/production)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
             let local_bin = exe_dir.join("scrcpy-bin").join(&binary_filename);
             if local_bin.exists() {
                 return local_bin.to_string_lossy().to_string();
             }
        }
    }
    // Return simple name to rely on PATH
    binary_name.to_string()
}

fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> std::io::Result<()> {
    std::fs::create_dir_all(&dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}



#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn create_command<S: AsRef<std::ffi::OsStr>>(program: S) -> TokioCommand {
    let mut cmd = TokioCommand::new(program);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[tauri::command]
pub async fn check_scrcpy(custom_path: Option<String>) -> serde_json::Value {
    let exe_path = get_binary_path("scrcpy", custom_path);
    
    // Check version to verify it exists and is runnable
    let output = create_command(&exe_path)
        .arg("--version")
        .output()
        .await;

    match output {
        Ok(o) if o.status.success() => {
             json!({ "found": true, "message": "Scrcpy Ready" })
        },
        Ok(_) => {
             json!({ "found": false, "message": "Failed to start scrcpy (Exit Code != 0)" })
        },
        Err(_) => {
             json!({ "found": false, "message": "Scrcpy not found" })
        }
    }
}

#[tauri::command]
pub async fn get_devices(custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("devices")
        .output()
        .await;

    match output {
        Ok(o) => {
             if o.status.success() {
                 let out_str = String::from_utf8_lossy(&o.stdout);
                 let devices: Vec<String> = out_str.lines()
                    .skip(1) // Skip "List of devices attached"
                    .filter(|l| l.contains("\tdevice"))
                    .map(|l| l.split('\t').next().unwrap_or("").trim().to_string())
                    .filter(|s| !s.is_empty() && !s.contains("._tcp") && !s.contains("._udp"))
                    .collect();
                 
                 json!({ "error": false, "devices": devices })
             } else {
                 json!({ "error": true, "message": "ADB returned error" })
             }
        },
        Err(e) => {
             json!({ "error": true, "message": e.to_string() })
         }
    }
}

#[tauri::command]
pub async fn get_mdns_devices(custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("mdns")
        .arg("services")
        .output()
        .await;

    match output {
        Ok(o) => {
            if o.status.success() {
                let out_str = String::from_utf8_lossy(&o.stdout);
                let mut services = Vec::new();
                let mut seen = std::collections::HashSet::new();
                for line in out_str.lines().skip(1) {
                    let parts: Vec<&str> = line.split('\t').collect();
                    if parts.len() >= 3 {
                        let name = parts[0].trim();
                        let service = parts[1].trim();
                        let address = parts[2].trim();
                        let key = format!("{}|{}|{}", name, service, address);
                        if !seen.contains(&key) {
                            services.push(json!({
                                "name": name,
                                "service": service,
                                "address": address
                            }));
                            seen.insert(key);
                        }
                    }
                }
                json!({ "error": false, "services": services })
            } else {
                json!({ "error": true, "message": "ADB mdns returned error" })
            }
        },
        Err(e) => {
            json!({ "error": true, "message": e.to_string() })
        }
    }
}

#[tauri::command]
pub async fn adb_connect(window: Window, ip: String, custom_path: Option<String>) -> Result<serde_json::Value, String> {
    let adb_path = get_binary_path("adb", custom_path);
    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Attempting wireless connection to {}...", ip));
    
    let child = create_command(&adb_path)
        .arg("connect")
        .arg(&ip)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start adb connect: {}", e))?;

    // Implement 5s timeout
    let output_res = timeout(Duration::from_secs(5), child.wait_with_output()).await;

    match output_res {
        Ok(Ok(output)) => {
            let out_text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let err_text = String::from_utf8_lossy(&output.stderr).trim().to_string();
            
            // Log everything to terminal for visibility
            if !out_text.is_empty() { let _ = window.emit("scrcpy-log", format!("[ADB] {}", out_text)); }
            if !err_text.is_empty() { let _ = window.emit("scrcpy-log", format!("[ADB ERROR] {}", err_text)); }

            let success = output.status.success() && !out_text.contains("cannot connect") && !out_text.contains("failed");
            Ok(json!({ "success": success, "message": if out_text.is_empty() { err_text } else { out_text } }))
        }
        Ok(Err(e)) => Err(e.to_string()),
        Err(_) => {
            let _ = window.emit("scrcpy-log", format!("[SYSTEM] Connection to {} timed out after 5s.", ip));
            Ok(json!({ "success": false, "message": "connection timed out" }))
        }
    }
}

#[tauri::command]
pub async fn adb_pair(window: Window, ip: String, code: String, custom_path: Option<String>) -> Result<serde_json::Value, String> {
    let adb_path = get_binary_path("adb", custom_path);
    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Pairing with {}...", ip));

    let output = create_command(&adb_path)
        .arg("pair")
        .arg(&ip)
        .arg(&code)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let out_text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let err_text = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if !out_text.is_empty() { let _ = window.emit("scrcpy-log", format!("[ADB] {}", out_text)); }
    if !err_text.is_empty() { let _ = window.emit("scrcpy-log", format!("[ADB ERROR] {}", err_text)); }

    let success = output.status.success() && (out_text.contains("Successfully paired") || err_text.contains("Successfully paired"));

    Ok(json!({ "success": success, "message": if out_text.is_empty() { err_text } else { out_text } }))
}

#[tauri::command]
pub async fn adb_shell(device: String, command: String, custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("-s")
        .arg(&device)
        .arg("shell")
        .arg(&command)
        .output()
        .await;

    match output {
        Ok(o) => {
             json!({ "success": o.status.success(), "output": String::from_utf8_lossy(&o.stdout).to_string() })
        },
        Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

#[tauri::command]
pub async fn run_terminal_command(device: Option<String>, cmd: String, custom_path: Option<String>) -> serde_json::Value {
    let mut parts = split_args(&cmd).unwrap_or_else(|_| cmd.split_whitespace().map(|s| s.to_string()).collect());
    if parts.is_empty() { return json!({ "success": false, "message": "No command provided" }); }

    let first_part = parts[0].to_lowercase();
    let is_scrcpy = first_part == "scrcpy";
    let is_adb = first_part == "adb";

    let binary_name = if is_scrcpy { "scrcpy" } else { "adb" };
    let exe_path = get_binary_path(binary_name, custom_path);

    // If they explicitly typed "adb" or "scrcpy", remove it from arguments
    if is_adb || is_scrcpy {
        parts.remove(0);
    }

    let mut args = Vec::new();
    
    // Auto-inject device ID for ADB/Scrcpy commands if a device is active and not already specified
    let has_serial_flag = parts.contains(&"-s".to_string()) || parts.contains(&"--serial".to_string());
    
    if !has_serial_flag {
        if let Some(ref d) = device {
            if !d.is_empty() {
                // For ADB, don't inject for certain global commands
                let is_global_adb = binary_name == "adb" && !parts.is_empty() && (parts[0] == "devices" || parts[0] == "connect" || parts[0] == "pair");
                
                if !is_global_adb {
                    args.push("-s".to_string());
                    args.push(d.clone());
                }
            }
        }
    }

    for part in parts {
        args.push(part);
    }

    let output = create_command(&exe_path)
        .args(&args)
        .output()
        .await;

    match output {
        Ok(o) => {
             json!({ 
                 "success": o.status.success(), 
                 "binary": binary_name,
                 "stdout": String::from_utf8_lossy(&o.stdout).to_string(),
                 "stderr": String::from_utf8_lossy(&o.stderr).to_string()
             })
        },
        Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

fn split_args(s: &str) -> Result<Vec<String>, String> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = s.chars();

    while let Some(c) = chars.next() {
        if c == '"' {
            in_quotes = !in_quotes;
        } else if c.is_whitespace() && !in_quotes {
            if !current.is_empty() {
                args.push(current.clone());
                current.clear();
            }
        } else {
            current.push(c);
        }
    }
    if !current.is_empty() {
        args.push(current);
    }
    if in_quotes {
        return Err("Unclosed quotes".to_string());
    }
    Ok(args)
}

#[tauri::command]
pub async fn push_file(device: String, file_path: String, custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("-s")
        .arg(&device)
        .arg("push")
        .arg(&file_path)
        .arg("/sdcard/Download/")
        .output()
        .await;

    match output {
         Ok(o) => {
             if o.status.success() {
                 json!({ "success": true, "message": "File pushed to Downloads" })
             } else {
                 json!({ "success": false, "message": "Transfer failed" })
             }
         },
         Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

#[tauri::command]
pub async fn install_apk(device: String, file_path: String, custom_path: Option<String>) -> serde_json::Value {
    let adb_path = get_binary_path("adb", custom_path);
    
    let output = create_command(&adb_path)
        .arg("-s")
        .arg(&device)
        .arg("install")
        .arg(&file_path)
        .output()
        .await;

     match output {
        Ok(o) => {
             let out_text = String::from_utf8_lossy(&o.stdout);
             let err_text = String::from_utf8_lossy(&o.stderr);
             
             if o.status.success() {
                 json!({ "success": true, "message": out_text.trim() })
             } else {
                 json!({ "success": false, "message": err_text.trim() })
             }
        },
        Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

#[tauri::command]
pub async fn kill_adb(window: Window, custom_path: Option<String>) -> Result<serde_json::Value, String> {
    let adb_path = get_binary_path("adb", custom_path);
    let _ = window.emit("scrcpy-log", "[SYSTEM] Terminating ADB stack...".to_string());
    
    let mut child = create_command(&adb_path)
        .arg("kill-server")
        .spawn()
        .map_err(|e| e.to_string())?;
        
    let _ = child.wait().await;

    // Force kill adb process via OS specifics
    #[cfg(target_os = "windows")]
    {
        let _ = TokioCommand::new("taskkill")
            .args(&["/F", "/IM", "adb.exe", "/T"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .await;
    }

    #[cfg(not(target_os = "windows"))]
    {
         let _ = TokioCommand::new("pkill")
            .arg("adb")
            .output()
            .await;
    }

    let _ = window.emit("scrcpy-log", "[SYSTEM] ADB Stack Terminated.".to_string());
    Ok(json!({ "success": true, "message": "ADB Stack Terminated" }))
}

#[tauri::command]
pub async fn list_scrcpy_options(device: String, arg: String, custom_path: Option<String>) -> serde_json::Value {
    let exe_path = get_binary_path("scrcpy", custom_path);
    
    let mut command = create_command(&exe_path);
    command.arg("-s").arg(&device).arg(&arg);
    
    let output = command.output().await;

    match output {
        Ok(o) => {
             let out_text = String::from_utf8_lossy(&o.stdout);
             let err_text = String::from_utf8_lossy(&o.stderr); // scrcpy often prints lists to stderr
             let combined = format!("{}{}", out_text, err_text);
             json!({ "success": o.status.success(), "output": combined })
        },
        Err(e) => json!({ "success": false, "message": e.to_string() })
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrcpyConfig {
    device: String,
    session_mode: String,
    // ... other fields matching JS ...
    bitrate: Option<u32>,
    fps: Option<u32>,
    stay_awake: Option<bool>,
    turn_off: Option<bool>,
    audio_enabled: Option<bool>,
    always_on_top: Option<bool>,
    fullscreen: Option<bool>,
    borderless: Option<bool>,
    record: Option<bool>,
    record_path: Option<String>,
    scrcpy_path: Option<String>,
    otg_enabled: Option<bool>,
    otg_pure: Option<bool>,
    camera_facing: Option<String>,
    camera_id: Option<String>,
    codec: Option<String>,
    camera_ar: Option<String>,
    camera_high_speed: Option<bool>,
    vd_width: Option<u32>,
    vd_height: Option<u32>,
    vd_dpi: Option<u32>,
    rotation: Option<String>,
    res: Option<String>,
}

fn build_scrcpy_args(config: &ScrcpyConfig, video_dir_fallback: Option<String>) -> Vec<String> {
    let mut args = Vec::new();
    
    // Construct arguments based on config
    if !config.device.is_empty() {
        args.push("-s".to_string());
        args.push(config.device.clone());
    }

    let codec = config.codec.as_deref().unwrap_or("h264");
    args.push(format!("--video-codec={}", codec));

    let otg_enabled = config.otg_enabled.unwrap_or(false);
    let otg_pure = config.otg_pure.unwrap_or(false);

    if config.session_mode == "mirror" && otg_enabled && otg_pure {
        if config.device.contains('.') || config.device.contains(':') {
             args.push("--no-video".to_string());
             args.push("--no-audio".to_string());
             args.push("--keyboard=uhid".to_string());
             args.push("--mouse=uhid".to_string());
        } else {
             args.push("--otg".to_string());
        }
    } else {
        if let Some(bitrate) = config.bitrate {
            args.push("--video-bit-rate".to_string());
            args.push(format!("{}M", bitrate));
        }
        
        if let Some(audio) = config.audio_enabled { if !audio { args.push("--no-audio".to_string()); } }
        if let Some(aot) = config.always_on_top { if aot { args.push("--always-on-top".to_string()); } }
        if let Some(fs) = config.fullscreen { if fs { args.push("--fullscreen".to_string()); } }
        if let Some(bl) = config.borderless { if bl { args.push("--window-borderless".to_string()); } }
        
        if let Some(rot) = &config.rotation {
            if rot != "0" {
                args.push("--orientation".to_string());
                args.push(rot.clone());
            }
        }

        let can_control = config.session_mode != "camera";
        if can_control {
             if let Some(sa) = config.stay_awake { if sa { args.push("--stay-awake".to_string()); } }
             if let Some(to) = config.turn_off { if to { args.push("--turn-screen-off".to_string()); args.push("--no-power-on".to_string()); } }
        }

        if config.session_mode == "camera" {
            args.push("--video-source=camera".to_string());
            if let Some(cid) = &config.camera_id {
                if !cid.is_empty() { args.push(format!("--camera-id={}", cid)); }
                else if let Some(facing) = &config.camera_facing { args.push(format!("--camera-facing={}", facing)); }
            } else if let Some(facing) = &config.camera_facing { args.push(format!("--camera-facing={}", facing)); }
            
             // Resolution logic simplified for brevity (can expand)
            if let Some(ar) = &config.camera_ar { if ar != "0" { args.push(format!("--camera-ar={}", ar)); } }
            if let Some(chs) = config.camera_high_speed { if chs { args.push("--camera-high-speed".to_string()); } }
             // fps handled generically below
        } else if config.session_mode == "desktop" {
             let w = config.vd_width.unwrap_or(1920);
             let h = config.vd_height.unwrap_or(1080);
             let dpi = config.vd_dpi.unwrap_or(420);
             args.push(format!("--new-display={}x{}/{}", w, h, dpi));
             args.push("--video-buffer=100".to_string());
        } else {
             if otg_enabled {
                 args.push("--keyboard=uhid".to_string());
                 args.push("--mouse=uhid".to_string());
             }
        }
        
        if let Some(fps) = config.fps {
            if config.session_mode == "camera" {
                args.push("--camera-fps".to_string());
            } else {
                args.push("--max-fps".to_string());
            }
            args.push(fps.to_string());
        } else if config.session_mode == "camera" && config.camera_high_speed.unwrap_or(false) {
            args.push("--camera-fps".to_string());
            args.push("60".to_string());
        }

        // Shared resolution logic (applies to mirror and camera in scrcpy 3.x)
        if let Some(res) = &config.res { 
            if res != "0" { 
                args.push("--max-size".to_string()); 
                args.push(res.clone()); 
            } 
        }
        
        if let Some(rec) = config.record {
             if rec {
                 let mut path = config.record_path.clone().unwrap_or_default();
                 
                 // If path is empty, try to get Video dir fallback
                 if path.trim().is_empty() {
                    path = video_dir_fallback.unwrap_or_else(|| ".".to_string());
                 }

                 let filename = format!("scrcpy_{}_{}.mkv", config.device.replace(":", "-"), chrono::Local::now().format("%Y%m%d_%H%M%S"));
                 let full_path = std::path::Path::new(&path).join(filename);
                 args.push(format!("--record={}", full_path.to_string_lossy()));
             }
        }
    }
    
    args
}

#[tauri::command]
pub async fn run_scrcpy(window: Window, state: State<'_, ScrcpyState>, config: ScrcpyConfig, app_handle: tauri::AppHandle) -> Result<(), String> {
    
    let video_dir = app_handle.path().video_dir().ok().map(|p| p.to_string_lossy().to_string());
    let args = build_scrcpy_args(&config, video_dir);

    let exe_path = get_binary_path("scrcpy", config.scrcpy_path);
    
    // Log the session details for the user
    let mode_label = match config.session_mode.as_str() {
        "camera" => "Camera Mode",
        "desktop" => "Desktop Mode",
        _ => "Screen Mirroring",
    };
    
    let res_label = config.res.as_ref().map(|r| if r == "0" { "Original" } else { r }).unwrap_or("Original");
    let bitrate_label = format!("{}Mbps", config.bitrate.unwrap_or(8));
    let fps_label = format!("{}fps", config.fps.unwrap_or(60));
    
    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Starting {} session...", mode_label));
    let _ = window.emit("scrcpy-log", format!("[SYSTEM] Target: {} | Config: {} @ {}, {}", config.device, res_label, bitrate_label, fps_label));
    
    if config.record.unwrap_or(false) {
        let path = config.record_path.as_ref().map(|p| if p.is_empty() { "Videos" } else { p }).unwrap_or("Videos");
        let _ = window.emit("scrcpy-log", format!("[SYSTEM] Recording enabled -> output to {}", path));
    }

    let command_str = format!("> scrcpy {}", args.join(" "));
    let _ = window.emit("scrcpy-log", command_str);

    let mut command = create_command(&exe_path);
    command.args(&args);
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|e| e.to_string())?;
    
    let stdout = child.stdout.take().expect("Failed to capture stdout");
    let stderr = child.stderr.take().expect("Failed to capture stderr");
    
    let window_clone = window.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = window_clone.emit("scrcpy-log", line);
        }
    });

    let window_clone2 = window.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = window_clone2.emit("scrcpy-log", line); // Scrcpy sends logs to stderr mostly
        }
    });

    // Store process
    state.processes.lock().unwrap().insert(config.device.clone(), child);
    let _ = window.emit("scrcpy-status", json!({ "device": config.device, "running": true }));

    // Monitor for exit
    let device_mon = config.device.clone();
    let window_mon = window.clone();
    let app_handle = window.app_handle().clone();

    tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            
            let state_mon = app_handle.state::<ScrcpyState>();
            let mut processes = state_mon.processes.lock().unwrap();
            if let Some(child) = processes.get_mut(&device_mon) {
                // Explicitly use tokio's try_wait to help inference
                match child.try_wait() {
                    Ok(Some(status)) => {
                        let _ = window_mon.emit("scrcpy-log", format!("[SYSTEM] Scrcpy process exited with status: {}", status));
                        let _ = window_mon.emit("scrcpy-status", json!({ "device": device_mon, "running": false }));
                        processes.remove(&device_mon);
                        break;
                    }
                    Ok(None) => {
                        // Still running
                    }
                    Err(e) => {
                        let _ = window_mon.emit("scrcpy-log", format!("[SYSTEM] Error waiting for scrcpy: {}", e));
                        let _ = window_mon.emit("scrcpy-status", json!({ "device": device_mon, "running": false }));
                        processes.remove(&device_mon);
                        break;
                    }
                }
            } else {
                // Process removed manually (stop_scrcpy) or was never added (rare error)
                // We emit just in case to sync UI
                let _ = window_mon.emit("scrcpy-status", json!({ "device": device_mon, "running": false }));
                break;
            }
        }
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_scrcpy_args_mirror_defaults() {
        let config = ScrcpyConfig {
            device: "device1".to_string(),
            session_mode: "mirror".to_string(),
            bitrate: None,
            fps: None,
            stay_awake: None,
            turn_off: None,
            audio_enabled: None,
            always_on_top: None,
            fullscreen: None,
            borderless: None,
            record: None,
            record_path: None,
            scrcpy_path: None,
            otg_enabled: None,
            otg_pure: None,
            camera_facing: None,
            camera_id: None,
            codec: None,
            camera_ar: None,
            camera_high_speed: None,
            vd_width: None,
            vd_height: None,
            vd_dpi: None,
            rotation: None,
            res: None,
        };

        let args = build_scrcpy_args(&config, None);
        assert!(args.contains(&"-s".to_string()));
        assert!(args.contains(&"device1".to_string()));
        assert!(args.contains(&"--video-codec=h264".to_string()));
    }

    #[test]
    fn test_build_scrcpy_args_camera_mode() {
        let config = ScrcpyConfig {
            device: "device1".to_string(),
            session_mode: "camera".to_string(),
            bitrate: None,
            fps: Some(30),
            stay_awake: None,
            turn_off: None,
            audio_enabled: None,
            always_on_top: None,
            fullscreen: None,
            borderless: None,
            record: None,
            record_path: None,
            scrcpy_path: None,
            otg_enabled: None,
            otg_pure: None,
            camera_facing: Some("front".to_string()),
            camera_id: None,
            codec: None,
            camera_ar: None,
            camera_high_speed: None,
            vd_width: None,
            vd_height: None,
            vd_dpi: None,
            rotation: None,
            res: None,
        };

        let args = build_scrcpy_args(&config, None);
        assert!(args.contains(&"--video-source=camera".to_string()));
        assert!(args.contains(&"--camera-facing=front".to_string()));
        assert!(args.contains(&"--camera-fps".to_string()));
        assert!(args.contains(&"30".to_string()));
    }

    #[test]
    fn test_build_scrcpy_args_bitrate_and_fps() {
        let config = ScrcpyConfig {
            device: "device1".to_string(),
            session_mode: "mirror".to_string(),
            bitrate: Some(8),
            fps: Some(60),
            stay_awake: None,
            turn_off: None,
            audio_enabled: None,
            always_on_top: None,
            fullscreen: None,
            borderless: None,
            record: None,
            record_path: None,
            scrcpy_path: None,
            otg_enabled: None,
            otg_pure: None,
            camera_facing: None,
            camera_id: None,
            codec: None,
            camera_ar: None,
            camera_high_speed: None,
            vd_width: None,
            vd_height: None,
            vd_dpi: None,
            rotation: None,
            res: None,
        };

        let args = build_scrcpy_args(&config, None);
        assert!(args.contains(&"--video-bit-rate".to_string()));
        assert!(args.contains(&"8M".to_string()));
        assert!(args.contains(&"--max-fps".to_string()));
        assert!(args.contains(&"60".to_string()));
    }
}

#[tauri::command]
pub async fn stop_scrcpy(state: State<'_, ScrcpyState>, device: String) -> Result<(), String> {
    let child = {
        let mut processes = state.processes.lock().unwrap();
        processes.remove(&device)
    };

    if let Some(mut c) = child {
        if let Some(pid) = c.id() {
             #[cfg(target_os = "windows")]
             {
                let _ = StdCommand::new("taskkill")
                    .args(&["/PID", &pid.to_string()])
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();
             }
             
             #[cfg(not(target_os = "windows"))]
             {
                 // Try graceful termination first via SIGTERM
                 let _ = StdCommand::new("kill")
                    .arg(pid.to_string())
                    .output();
             }

            // Give it a moment to finalize, but don't block too long
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        } else {
            let _ = c.kill().await;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn download_scrcpy(window: Window) -> Result<(), String> {
    use std::io::Write;
    
    let (os_tag, arch_tag, extension) = if cfg!(target_os = "windows") {
        let arch = if cfg!(target_arch = "x86_64") { "win64" } else { "win32" };
        (arch, arch, ".zip")
    } else if cfg!(target_os = "linux") {
        ("linux", "linux-x86_64", ".tar.gz")
    } else if cfg!(target_os = "macos") {
        let arch = if cfg!(target_arch = "aarch64") { "macos-aarch64" } else { "macos-x86_64" };
        ("macos", arch, ".tar.gz")
    } else {
        return Err("Unsupported OS for auto-download".to_string());
    };

    window.emit("scrcpy-log", format!("[SYSTEM] Detecting platform: {} ({})", os_tag, arch_tag)).unwrap();
    window.emit("scrcpy-status", json!({ "type": "downloading", "success": true, "message": format!("Fetching latest {} release...", arch_tag) })).unwrap();

    let client = reqwest::Client::builder().user_agent("ScrcpyGui-Downloader").build().map_err(|e| e.to_string())?;
    
    // Attempt to get the latest release via API, but fallback to redirect scraping if rate limited
    let mut download_url = String::new();
    let mut filename = String::new();

    let api_url = "https://api.github.com/repos/Genymobile/scrcpy/releases/latest";
    let api_resp = client.get(api_url).send().await;

    let mut used_fallback = false;

    if let Ok(resp) = api_resp {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(assets) = json["assets"].as_array() {
                    for asset in assets {
                        let name = asset["name"].as_str().unwrap_or("");
                        if name.contains(arch_tag) && name.ends_with(extension) {
                            download_url = asset["browser_download_url"].as_str().unwrap_or("").to_string();
                            filename = name.to_string();
                            break;
                        }
                    }
                }
            }
        } else if resp.status() == reqwest::StatusCode::FORBIDDEN {
            window.emit("scrcpy-log", "[SYSTEM] API rate limited, attempting fallback discovery...").unwrap();
            used_fallback = true;
        }
    } else {
        used_fallback = true;
    }

    if used_fallback || download_url.is_empty() {
        // Fallback: Follow redirect of /releases/latest to get the tag name
        let redirect_res = client.get("https://github.com/Genymobile/scrcpy/releases/latest")
            .send().await.map_err(|e| format!("Fallback failed: {}", e))?;
        
        let final_url = redirect_res.url().as_str();
        // URL is like https://github.com/Genymobile/scrcpy/releases/tag/v2.7
        if let Some(tag) = final_url.split('/').last() {
            if tag.starts_with('v') {
                filename = format!("scrcpy-{}-{}{}", arch_tag, tag, extension);
                download_url = format!("https://github.com/Genymobile/scrcpy/releases/download/{}/{}", tag, filename);
                window.emit("scrcpy-log", format!("[SYSTEM] Discovered latest tag via fallback: {}", tag)).unwrap();
            }
        }
    }
    
    if download_url.is_empty() {
        return Err(format!("Could not find {} binary. (API rate limit might be active)", arch_tag));
    }

    window.emit("scrcpy-log", format!("[SYSTEM] Found asset: {}", filename)).unwrap();
    
    let current_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap());
        
    let temp_archive_path = current_dir.join(format!("scrcpy_temp{}", extension));
    let extract_path = current_dir.join("scrcpy-bin");
    
    {
        let mut file = std::fs::File::create(&temp_archive_path).map_err(|e| format!("Failed to create archive file: {}", e))?;
        let mut download_resp = client.get(&download_url).send().await.map_err(|e| format!("Failed to connect to download URL: {}", e))?;
        let total_size = download_resp.content_length().unwrap_or(0);
        
        window.emit("scrcpy-log", format!("[SYSTEM] Downloading: {} MB", total_size / 1024 / 1024)).unwrap();

        let mut downloaded: u64 = 0;
        while let Some(chunk) = download_resp.chunk().await.map_err(|e| e.to_string())? {
            file.write_all(&chunk).map_err(|e| format!("Failed to write chunk: {}", e))?;
            downloaded += chunk.len() as u64;
            if total_size > 0 {
                let percent = (downloaded * 100) / total_size;
                let _ = window.emit("download-progress", json!({ "percent": percent }));
            }
        }
    }
    
    window.emit("scrcpy-log", "[SYSTEM] Download finished. Starting extraction...").unwrap();
    window.emit("scrcpy-status", json!({ "type": "downloading", "success": true, "message": "Extracting binaries..." })).unwrap();

    if extract_path.exists() {
        let _ = std::fs::remove_dir_all(&extract_path);
    }
    
    let temp_extract_dir = current_dir.join("temp_extract");
    if temp_extract_dir.exists() {
        let _ = std::fs::remove_dir_all(&temp_extract_dir);
    }
    std::fs::create_dir_all(&temp_extract_dir).map_err(|e| e.to_string())?;

    if extension == ".zip" {
        window.emit("scrcpy-log", "[SYSTEM] Decompressing ZIP archive...").unwrap();
        let file = std::fs::File::open(&temp_archive_path).map_err(|e| format!("Failed to open zip: {}", e))?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip archive: {}", e))?;
        archive.extract(&temp_extract_dir).map_err(|e| format!("Failed to extract: {}", e))?;
    } else {
        window.emit("scrcpy-log", "[SYSTEM] Decompressing TAR.GZ archive...").unwrap();
        let file = std::fs::File::open(&temp_archive_path).map_err(|e| format!("Failed to open tar.gz: {}", e))?;
        let tar = GzDecoder::new(file);
        let mut archive = Archive::new(tar);
        archive.unpack(&temp_extract_dir).map_err(|e| format!("Failed to extract tar: {}", e))?;
    }
    
    // Verify entries and move to scrcpy-bin
    let entries = std::fs::read_dir(&temp_extract_dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_dir() {
            // Usually scrcpy archives contain a single root folder
            let _ = std::fs::rename(&path, &extract_path).or_else(|_| {
                copy_dir_all(&path, &extract_path)
            });
            break; 
        } else {
            // If files are in root, rename the whole temp dir
            let _ = std::fs::rename(&temp_extract_dir, &extract_path).or_else(|_| {
                copy_dir_all(&temp_extract_dir, &extract_path)
            });
            break;
        }
    }
    
    // Cleanup
    if temp_extract_dir.exists() { let _ = std::fs::remove_dir_all(&temp_extract_dir); }
    if temp_archive_path.exists() { let _ = std::fs::remove_file(&temp_archive_path); }

    window.emit("scrcpy-status", json!({ "type": "download-complete", "success": true, "message": extract_path.to_string_lossy() })).unwrap();
    Ok(())
}

#[tauri::command]
pub async fn get_videos_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    app_handle.path().video_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_report(app_handle: tauri::AppHandle, content: String, name: String) -> Result<String, String> {
    use std::fs;
    use tauri::Manager;

    let downloads = app_handle.path().download_dir()
        .map_err(|e| e.to_string())?;
    
    let path = downloads.join(&name);
    fs::write(&path, content).map_err(|e| e.to_string())?;
    
    Ok(path.to_string_lossy().to_string())
}


