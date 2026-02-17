import { open } from '@tauri-apps/plugin-dialog';
import { ScrcpyConfig } from '../hooks/useScrcpy';
import Tooltip from './Tooltip';
import { Coffee, MonitorOff, Volume2, Layers, Maximize, Square, Circle, Folder, Settings2 } from 'lucide-react';

interface SessionBehaviorProps {
    config: ScrcpyConfig;
    setConfig: (c: ScrcpyConfig) => void;
}

export default function SessionBehavior({ config, setConfig }: SessionBehaviorProps) {
    const handleChange = (field: keyof ScrcpyConfig, value: any) => {
        const newConfig = { ...config, [field]: value };
        setConfig(newConfig);
        if (field === 'recordPath') {
            localStorage.setItem('scrcpy_record_path', value);
        }
    };

    const handlePickFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Recording Folder'
            });
            if (selected) {
                handleChange('recordPath', selected);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const Toggle = ({ checked, onChange, icon: Icon, label, tooltip, danger = false }: { checked: boolean, onChange: (v: boolean) => void, icon: any, label: string, tooltip: string, danger?: boolean }) => (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between gap-3 group cursor-pointer py-1 bg-zinc-950/30 rounded-lg px-2 border border-transparent hover:border-zinc-800 transition-all"
        >
            <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1 rounded-md shrink-0 transition-colors ${checked ? (danger ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary') : 'bg-zinc-800/50 text-zinc-500 group-hover:text-zinc-300'}`}>
                    <Icon size={12} />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-tight truncate transition-colors ${checked ? (danger ? 'text-red-400' : 'text-zinc-200') : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                        {label}
                    </span>
                    <div className="shrink-0">
                        <Tooltip text={tooltip} />
                    </div>
                </div>
            </div>
            <div className={`w-6 h-3.5 shrink-0 rounded-full p-0.5 transition-all duration-300 ${checked ? (danger ? 'bg-red-600' : 'bg-primary') : 'bg-zinc-800'}`}>
                <div className={`w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-transform duration-300 ${checked ? 'translate-x-2.5' : 'translate-x-0'}`} />
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="glass p-3.5 rounded-2xl space-y-2 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
                <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-1.5 mb-1">
                    <Settings2 size={12} className="text-zinc-500" />
                    <h2 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Session Behavior</h2>
                </div>

                <div className="flex flex-col gap-1">
                    <Toggle
                        checked={config.stayAwake || false}
                        onChange={(v) => handleChange('stayAwake', v)}
                        icon={Coffee}
                        label="Stay Awake"
                        tooltip="Keep the device awake while mirroring is active."
                    />
                    <Toggle
                        checked={config.turnOff || false}
                        onChange={(v) => handleChange('turnOff', v)}
                        icon={MonitorOff}
                        label="Screen Off"
                        tooltip="Turn off the device screen while mirroring to save battery."
                    />
                    <Toggle
                        checked={config.audioEnabled || false}
                        onChange={(v) => handleChange('audioEnabled', v)}
                        icon={Volume2}
                        label="Forward Audio"
                        tooltip="Forward device audio to your computer."
                    />
                    <Toggle
                        checked={config.alwaysOnTop || false}
                        onChange={(v) => handleChange('alwaysOnTop', v)}
                        icon={Layers}
                        label="Always On Top"
                        tooltip="Keep the scrcpy window on top of other windows."
                    />
                    <Toggle
                        checked={config.fullscreen || false}
                        onChange={(v) => handleChange('fullscreen', v)}
                        icon={Maximize}
                        label="Full Screen"
                        tooltip="Launch scrcpy in full screen mode."
                    />
                    <Toggle
                        checked={config.borderless || false}
                        onChange={(v) => handleChange('borderless', v)}
                        icon={Square}
                        label="Borderless"
                        tooltip="Launch scrcpy without window borders."
                    />
                    <Toggle
                        checked={config.record || false}
                        onChange={(v) => handleChange('record', v)}
                        icon={Circle}
                        label="Record Feed"
                        tooltip="Record the screen/camera feed to a file."
                        danger={true}
                    />
                </div>

                <div className="pt-2 border-t border-zinc-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <Folder size={12} className="text-zinc-500" />
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Record Path</span>
                        </div>
                        <button
                            onClick={handlePickFolder}
                            className="text-[8px] font-black uppercase text-primary hover:text-white transition-colors"
                        >
                            Change
                        </button>
                    </div>
                    <div className="bg-black/40 border border-zinc-800/50 rounded-lg px-2.5 py-1.5">
                        <p className="text-[9px] text-zinc-500 font-mono truncate leading-none">
                            {config.recordPath || 'Default (Videos Folder)'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
