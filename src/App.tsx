import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import Sidebar from "./components/Sidebar";
import ControlPanel from "./components/ControlPanel";
import LogPanel from "./components/LogPanel";
import Header from "./components/Header";
import SessionBehavior from "./components/SessionBehavior";
import ShortcutsPanel from "./components/ShortcutsPanel";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import { useScrcpy } from "./hooks/useScrcpy";

function App() {
  const {
    devices,
    logs,
    activeDevice,
    setActiveDevice,
    refreshDevices,
    runScrcpy,
    stopScrcpy,
    downloadScrcpy,
    checkScrcpy,
    scrcpyStatus,
    setLogs,
    isDownloading,
    downloadProgress,
    pairDevice,
    connectDevice,
    listScrcpyOptions,
    runTerminalCommand,
    isAutoConnect,
    toggleAutoConnect,
    runningDevices,
    isRefreshing,
    sessionRunning,
    clearLogs,
    detectedCameras,
    config,
    setConfig,
    theme,
    setTheme,
    pushFile,
    installApk,
    historyDevices,
    clearHistory
  } = useScrcpy();

  useEffect(() => {
    // Initial check (once on mount) - Silent to avoid log clatter
    checkScrcpy(config.scrcpyPath);
    refreshDevices(config.scrcpyPath, true);
  }, []);

  useEffect(() => {
    // Global Drag and Drop Listener (re-bind only if activeDevice changes)
    const unlisten = getCurrentWindow().listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
      if (!activeDevice) {
        setLogs(prev => [...prev.slice(-100), "[WARN] No device selected for drag-and-drop operation."]);
        return;
      }

      const paths = event.payload.paths;
      if (paths && paths.length > 0) {
        paths.forEach(path => handleFileOperation(path));
      }
    });

    return () => {
      unlisten.then(f => f());
    };
  }, [activeDevice]);

  useEffect(() => {
    if (activeDevice) {
      setConfig(prev => ({ ...prev, device: activeDevice }));
    }
  }, [activeDevice]);

  const handleStart = async () => {
    if (!activeDevice) return;
    await runScrcpy(config);
  };

  const handleStop = async () => {
    if (!activeDevice) return;
    await stopScrcpy(activeDevice);
  };

  const handleRefresh = () => {
    refreshDevices();
  };

  const handleKillAdb = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('kill_adb', { customPath: config.scrcpyPath });
      refreshDevices(config.scrcpyPath);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileOperation = async (path: string) => {
    if (!activeDevice) return;

    const isApk = path.toLowerCase().endsWith('.apk');
    if (isApk) {
      await installApk(activeDevice, path);
    } else {
      await pushFile(activeDevice, path);
    }
  };

  const handleFileBrowse = async () => {
    if (!activeDevice) return;
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'All Files',
            extensions: ['*']
          },
          {
            name: 'Android App (APK)',
            extensions: ['apk']
          }
        ]
      });

      if (selected) {
        if (Array.isArray(selected)) {
          selected.forEach(path => handleFileOperation(path));
        } else {
          handleFileOperation(selected);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetPath = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: config.scrcpyPath || undefined
      });
      if (selected && typeof selected === 'string') {
        setConfig(prev => ({ ...prev, scrcpyPath: selected }));
        setLogs(prev => [...prev.slice(-100), `[SYSTEM] Custom scrcpy path set to: ${selected}`]);
        // Trigger a check with the new path
        setTimeout(() => checkScrcpy(selected), 100);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetPath = async () => {
    setConfig(prev => ({ ...prev, scrcpyPath: undefined }));
    setLogs(prev => [...prev.slice(-100), `[SYSTEM] Custom scrcpy path cleared. Using system default.`]);
    // Trigger a check with no custom path
    setTimeout(() => checkScrcpy(undefined), 100);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen text-zinc-200 font-sans selection:bg-primary selection:text-white overflow-hidden flex flex-col transition-colors duration-500" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
        <div className="fixed top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col h-screen transition-all duration-700">
          <Header
            onThemeChange={setTheme}
            currentTheme={theme}
            binaryStatus={scrcpyStatus}
            onDownload={downloadScrcpy}
            onSetPath={handleSetPath}
            onResetPath={handleResetPath}
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
          />

          <div className="flex-1 overflow-y-auto flex flex-col pt-6 custom-scrollbar">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 px-6 pb-6">
              <div className="lg:col-span-3 flex flex-col">
                <div className="transition-all duration-700">
                  <Sidebar
                    devices={devices}
                    runningDevices={runningDevices}
                    onRefresh={handleRefresh}
                    onKillAdb={handleKillAdb}
                    selectedDevice={activeDevice}
                    onSelectDevice={setActiveDevice}
                    onPair={pairDevice}
                    onConnect={connectDevice}
                    isAutoConnect={isAutoConnect}
                    onToggleAuto={toggleAutoConnect}
                    isRefreshing={isRefreshing}
                    onFilePush={handleFileBrowse}
                    historyDevices={historyDevices}
                    clearHistory={clearHistory}
                  />
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col gap-6 relative z-20">
                <div className="relative z-30">
                  <ControlPanel
                    config={config}
                    setConfig={setConfig}
                    onStart={handleStart}
                    onStop={handleStop}
                    isRunning={sessionRunning}
                    detectedCameras={detectedCameras}
                    onListOptions={(arg) => {
                      if (activeDevice) {
                        listScrcpyOptions(activeDevice, arg);
                      }
                    }}
                  />
                </div>
                <div className="relative z-10">
                  <LogPanel
                    logs={logs}
                    onClear={clearLogs}
                    onAddLog={(msg) => setLogs((prev: string[]) => [...prev.slice(-100), msg])}
                    onRunCommand={runTerminalCommand}
                  />
                </div>
              </div>

              <div className="lg:col-span-3 flex flex-col gap-6">
                <SessionBehavior config={config} setConfig={setConfig} />
                <ShortcutsPanel />
              </div>
            </div>

            <Footer />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
