import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface ScrcpyConfig {
    device: string;
    sessionMode: string;
    bitrate?: number;
    fps?: number;
    stayAwake?: boolean;
    turnOff?: boolean;
    audioEnabled?: boolean;
    alwaysOnTop?: boolean;
    fullscreen?: boolean;
    borderless?: boolean;
    record?: boolean;
    recordPath?: string;
    scrcpyPath?: string;
    otgEnabled?: boolean;
    otgPure?: boolean;
    cameraFacing?: string;
    cameraId?: string;
    codec?: string;
    cameraAr?: string;
    cameraHighSpeed?: boolean;
    vdWidth?: number;
    vdHeight?: number;
    vdDpi?: number;
    rotation?: string;
    res?: string;
    aspectRatioLock?: boolean;
}

export function useScrcpy() {
    const [devices, setDevices] = useState<string[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [activeDevice, setActiveDevice] = useState<string>("");
    const [status, setStatus] = useState<string>("");
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [scrcpyStatus, setScrcpyStatus] = useState<{ found: boolean, message: string }>({ found: false, message: "Checking..." });
    const [isAutoConnect, setIsAutoConnect] = useState<boolean>(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [runningDevices, setRunningDevices] = useState<string[]>([]);
    const [defaultRecordPath, setDefaultRecordPath] = useState<string>("");
    const [detectedCameras, setDetectedCameras] = useState<{ id: string, name: string }[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    // Removed mdnsDevices state
    const [theme, setTheme] = useState("ultraviolet");
    const [config, setConfig] = useState<ScrcpyConfig>({
        device: "",
        sessionMode: "mirror",
        bitrate: 8,
        fps: 60,
        stayAwake: false,
        turnOff: false,
        audioEnabled: true,
        alwaysOnTop: false,
        res: "0",
        recordPath: "",
        vdWidth: 1920,
        vdHeight: 1080,
        vdDpi: 420,
        aspectRatioLock: true
    });
    const prevDevicesRef = useRef<string[]>([]);

    useEffect(() => {

        const savedAuto = localStorage.getItem('scrcpy_auto_connect');
        if (savedAuto !== null) {
            setIsAutoConnect(savedAuto === 'true');
        }

        const savedTheme = localStorage.getItem('scrcpy_theme');
        if (savedTheme) {
            setTheme(savedTheme);
        }

        const savedConfig = localStorage.getItem('scrcpy_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setConfig(prev => ({ ...prev, ...parsed }));
                // Initial check with saved path if it exists
                if (parsed.scrcpyPath) {
                    checkScrcpy(parsed.scrcpyPath);
                }
            } catch (e) {
                console.error("Failed to parse saved config", e);
            }
        }

        // Fetch default Videos dir
        const initPaths = async () => {
            try {
                const defaultDir: string = await invoke('get_videos_dir');
                setDefaultRecordPath(defaultDir);

                // If no saved path in config, set it now
                setConfig(prev => {
                    if (!prev.recordPath) {
                        return { ...prev, recordPath: defaultDir };
                    }
                    return prev;
                });

                return defaultDir;
            } catch (e) {
                console.error("Failed to fetch videos dir", e);
                return "";
            }
        };

        initPaths();
        setIsInitialized(true);
    }, []);

    // Persist changes
    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem('scrcpy_config', JSON.stringify(config));
    }, [config, isInitialized]);

    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem('scrcpy_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme, isInitialized]);

    // Clear detected cameras when device changes
    useEffect(() => {
        setDetectedCameras([]);
    }, [activeDevice]);



    const toggleAutoConnect = (val: boolean) => {
        setIsAutoConnect(val);
        localStorage.setItem('scrcpy_auto_connect', val.toString());
    };

    useEffect(() => {
        const unlistenLog = listen<string>('scrcpy-log', (event) => {
            setLogs(prev => [...prev.slice(-100), event.payload]);
        });

        const unlistenStatus = listen<any>('scrcpy-status', (event) => {
            const data = event.payload;
            if (data.device && typeof data.running === 'boolean') {
                setRunningDevices(prev => {
                    if (data.running) {
                        return [...new Set([...prev, data.device])];
                    } else {
                        return prev.filter(d => d !== data.device);
                    }
                });
            } else if (data.type === 'downloading') {
                setIsDownloading(true);
                setStatus(data.message);
            } else if (data.type === 'download-progress') {
                setDownloadProgress(data.percent);
            } else if (data.type === 'download-complete') {
                setIsDownloading(false);
                setStatus("Download Complete");
                refreshDevices(data.message);
                checkScrcpy(); // Re-check binary status
            }
        });

        return () => {
            unlistenLog.then(f => f());
            unlistenStatus.then(f => f());
        };
    }, []);

    const [historyDevices, setHistoryDevices] = useState<string[]>([]);

    // Load history on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('scrcpy_history');
        if (savedHistory) {
            try {
                setHistoryDevices(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        }
    }, []);

    const addToHistory = (ip: string) => {
        if (!ip.includes(':')) return; // Only add valid IP:Port combos
        setHistoryDevices(prev => {
            const next = [ip, ...prev.filter(d => d !== ip)].slice(0, 10); // Keep last 10 unique
            localStorage.setItem('scrcpy_history', JSON.stringify(next));
            return next;
        });
    };

    const clearHistory = () => {
        setHistoryDevices([]);
        localStorage.removeItem('scrcpy_history');
    };

    const refreshDevices = async (customPath?: string, silent: boolean = false) => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const res: any = await invoke('get_devices', { customPath: customPath || config.scrcpyPath });

            if (!res.error) {
                const newDevices = res.devices as string[];
                const prevDevices = prevDevicesRef.current;

                // Identify connections/disconnections
                const added = newDevices.filter(d => !prevDevices.includes(d));
                const removed = prevDevices.filter(d => !newDevices.includes(d));

                added.forEach(device => {
                    setLogs(prev => [...prev.slice(-100), `[SYSTEM] New device discovered: ${device}`]);
                });

                removed.forEach(device => {
                    setLogs(prev => [...prev.slice(-100), `[SYSTEM] Device disconnected: ${device}`]);
                });

                setDevices(newDevices);
                prevDevicesRef.current = newDevices;

                if (!silent && added.length === 0 && removed.length === 0) {
                    setLogs(prev => [...prev.slice(-100), `[SYSTEM] Discovery active: ${newDevices.length} device(s) found.`]);
                }

                if (newDevices.length > 0 && !activeDevice) {
                    setActiveDevice(newDevices[0]);
                }
            } else {
                setLogs(prev => [...prev.slice(-100), `[SYSTEM] Discovery error: ${res.error}`]);
            }
        } catch (e) {
            console.error(e);
            setLogs(prev => [...prev.slice(-100), `[SYSTEM] Error refreshing devices: ${e}`]);
        } finally {
            setIsRefreshing(false);
        }
    };

    const runScrcpy = async (config: ScrcpyConfig) => {
        try {
            setLogs(prev => [...prev.slice(-100), `[SYSTEM] Initializing scrcpy session for ${config.device}...`]);
            await invoke('run_scrcpy', { config });
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), `[ERROR] Failed to start scrcpy: ${e}`]);
        }
    };

    const stopScrcpy = async (device: string) => {
        try {
            await invoke('stop_scrcpy', { device });
        } catch (e) {
            console.error(e);
        }
    };

    const downloadScrcpy = async () => {
        try {
            setIsDownloading(true);
            await invoke('download_scrcpy');
        } catch (e: any) {
            setIsDownloading(false);
            setLogs(prev => [...prev, `Download Error: ${e}`]);
        }
    };

    const checkScrcpy = async (customPath?: string) => {
        try {
            // If customPath is explicitly provided (even as undefined/null for reset), use it.
            // Otherwise, use the saved path from config.
            const pathToCheck = customPath !== undefined ? customPath : config.scrcpyPath;
            const res: any = await invoke('check_scrcpy', { customPath: pathToCheck });
            setScrcpyStatus(res);
            return res.found;
        } catch (e: any) {
            setScrcpyStatus({ found: false, message: `Error: ${e}` });
            return false;
        }
    };

    const pairDevice = async (ip: string, code: string, customPath?: string) => {
        try {
            const res: any = await invoke('adb_pair', { ip, code, customPath: customPath || config.scrcpyPath });
            if (res.success) {
                setLogs(prev => [...prev.slice(-100), `[SYSTEM] Successfully paired with ${ip}`]);
                await refreshDevices(customPath, true);
            } else {
                setLogs(prev => {
                    const msgs = [`[SYSTEM] Pairing failed: ${res.message}`];
                    if (typeof res.message === 'string' && res.message.includes('protocol fault')) {
                        msgs.push(`[TIP] Protocol fault usually means the ADB server is stuck. Try "Kill ADB" in the sidebar.`);
                    }
                    return [...prev.slice(-100), ...msgs];
                });
            }
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), `[ERROR] Pairing error: ${e}`]);
            return { success: false, message: e };
        }
    };

    const connectDevice = async (ip: string, customPath?: string) => {
        setIsRefreshing(true);
        try {
            // Attempt 1: Connect
            let res: any = await invoke('adb_connect', { ip, customPath: customPath || config.scrcpyPath });

            // Retry Logic: If failed, try to disconnect first then reconnect
            if (!res.success && typeof res.message === 'string' && (res.message.includes('failed to connect') || res.message.includes('cannot connect'))) {
                setLogs(prev => [...prev.slice(-100), `[SYSTEM] Connection failed, retrying with cleanup...`]);
                // Force disconnect to clear ghost state
                await invoke('run_terminal_command', { cmd: `adb disconnect ${ip}`, customPath: customPath || config.scrcpyPath });
                // Small delay
                await new Promise(r => setTimeout(r, 500));
                // Attempt 2
                res = await invoke('adb_connect', { ip, customPath: customPath || config.scrcpyPath });
            }

            if (res.success) {
                setLogs(prev => [...prev.slice(-100), `[SYSTEM] CONNECTED TO ${ip} SUCCESSFULLY.`]);
                addToHistory(ip);

                // Allow ADB to settle and state to update
                await new Promise(r => setTimeout(r, 1000));

                setIsRefreshing(false); // Enable refreshDevices to run
                await refreshDevices(customPath || config.scrcpyPath, true);
            } else {
                setLogs(prev => {
                    const msgs = [`[SYSTEM] Connection failed: ${res.message}`];
                    // Smart tip for stale ports
                    if (typeof res.message === 'string' && (res.message.includes('failed to connect') || res.message.includes('cannot connect'))) {
                        msgs.push(`[TIP] Port might be stale. Try "Kill ADB" to refresh discovery.`);
                    }
                    return [...prev.slice(-100), ...msgs];
                });
            }
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), `[ERROR] Connection error: ${e}`]);
            return { success: false, message: e };
        } finally {
            setIsRefreshing(false);
        }
    };

    const listScrcpyOptions = async (device: string, arg: string, customPath?: string) => {
        try {
            setLogs(prev => [...prev.slice(-100), `Running scrcpy ${arg}...`]);
            const res: any = await invoke('list_scrcpy_options', { device, arg, customPath: customPath || config.scrcpyPath });
            if (res.output) {
                const lines = res.output.split('\n');
                setLogs(prev => [...prev.slice(-100), ...lines]);

                // Parse cameras if requested
                if (arg === '--list-cameras') {
                    const cameras: { id: string, name: string }[] = [];
                    lines.forEach((line: string) => {
                        const trimmedLine = line.trim();
                        // New format (scrcpy 3.x): "    --camera-id=0    (back, 4080x3060, fps=[15, 20, 24, 30])"
                        // Old format: "    - [0] (3264x2448) back, macro"
                        const newMatch = trimmedLine.match(/--camera-id=(\w+)\s*\((.*?)\)/);
                        const oldMatch = trimmedLine.match(/^(?:-\s*)?\[(\w+)\]\s*\((.*?)\)\s*(.*)/);

                        if (newMatch) {
                            const id = newMatch[1];
                            const details = newMatch[2]; // e.g. "back, 4080x3060, fps=[...]"
                            cameras.push({
                                id,
                                name: `${id}: ${details}`
                            });
                        } else if (oldMatch) {
                            const id = oldMatch[1];
                            const resolution = oldMatch[2];
                            const metadata = oldMatch[3].replace(/\r$/, '').trim();
                            cameras.push({
                                id,
                                name: `${id}: ${metadata || 'Camera'} (${resolution})`
                            });
                        }
                    });
                    if (cameras.length > 0) {
                        setDetectedCameras(cameras);
                    } else {
                        setLogs(prev => [...prev, "[SYSTEM] No cameras parsed from output. Please check the console above."]);
                    }
                }
            }
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), `Error: ${e}`]);
            return { success: false, message: e };
        }
    };

    const pushFile = async (device: string, filePath: string, customPath?: string) => {
        try {
            setLogs(prev => [...prev.slice(-100), `[SYSTEM] Pushing file to ${device}: ${filePath}...`]);
            const res: any = await invoke('push_file', { device, filePath, customPath: customPath || config.scrcpyPath });
            setLogs(prev => [...prev.slice(-100), `[ADB] ${res.message}`]);
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), `Error: ${e}`]);
            return { success: false, message: e };
        }
    };

    const installApk = async (device: string, filePath: string, customPath?: string) => {
        try {
            setLogs(prev => [...prev.slice(-100), `[SYSTEM] Installing APK on ${device}: ${filePath}...`]);
            const res: any = await invoke('install_apk', { device, filePath, customPath: customPath || config.scrcpyPath });
            setLogs(prev => [...prev.slice(-100), `[ADB] ${res.message}`]);
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), `Error: ${e}`]);
            return { success: false, message: e };
        }
    };

    const runTerminalCommand = async (command: string, customPath?: string) => {
        try {
            // Check if user specifically typed scrcpy or adb to format log nicely
            const lower = command.trim().toLowerCase();
            const prefix = (lower.startsWith('scrcpy') || lower.startsWith('adb')) ? '' : 'adb ';
            setLogs(prev => [...prev.slice(-100), `> ${prefix}${command}`]);

            const res: any = await invoke('run_terminal_command', {
                device: activeDevice,
                cmd: command,
                customPath: customPath || config.scrcpyPath
            });

            if (res.stdout) {
                const lines = res.stdout.trim().split('\n');
                setLogs(prev => [...prev.slice(-100), ...lines]);
            }
            if (res.stderr) {
                const lines = res.stderr.trim().split('\n').map((l: string) => `[${res.binary?.toUpperCase() || 'ERR'}] ${l}`);
                setLogs(prev => [...prev.slice(-100), ...lines]);
            }
            return res;
        } catch (e: any) {
            setLogs(prev => [...prev.slice(-100), `[ERROR] Command failed: ${e}`]);
            return { success: false, message: e };
        }
    };

    const clearLogs = () => setLogs([]);

    return {
        devices,
        logs,
        setLogs,
        clearLogs,
        isDownloading,
        downloadProgress,
        status,
        refreshDevices,
        runScrcpy,
        stopScrcpy,
        downloadScrcpy,
        activeDevice,
        setActiveDevice,
        checkScrcpy,
        scrcpyStatus,
        pairDevice,
        connectDevice,
        listScrcpyOptions,
        runTerminalCommand,
        isAutoConnect,
        toggleAutoConnect,
        runningDevices,
        defaultRecordPath,
        detectedCameras,
        isRefreshing,
        config,
        setConfig,
        theme,
        setTheme,
        pushFile,
        installApk,
        historyDevices,
        clearHistory,
        sessionRunning: runningDevices.includes(activeDevice || '')
    };
}
