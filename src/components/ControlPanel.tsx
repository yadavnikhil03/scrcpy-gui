import { useState, useEffect, useRef } from 'react';
import { Play, Square, Monitor, Camera, LayoutGrid, ChevronDown, Lock, Unlock, Settings2, Video, ExternalLink } from 'lucide-react';
import { ScrcpyConfig } from '../hooks/useScrcpy';
import Tooltip from './Tooltip';

interface ControlPanelProps {
    config: ScrcpyConfig;
    setConfig: (c: ScrcpyConfig) => void;
    onStart: () => void;
    onStop: () => void;
    isRunning: boolean;
    onListOptions: (arg: string) => void;
    detectedCameras?: { id: string, name: string }[];
}

const BitrateControl = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
    const [localValue, setLocalValue] = useState(value);

    // Sync from parent if parent changes externally (e.g. preset load)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center h-4">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Bitrate</label>
                <span className="text-[10px] font-black text-primary tabular-nums">{localValue}M</span>
            </div>
            <input
                type="range"
                min="1"
                max="50"
                value={localValue}
                onChange={(e) => setLocalValue(parseInt(e.target.value))}
                onMouseUp={() => onChange(localValue)}
                onTouchEnd={() => onChange(localValue)}
                className="w-full h-1 accent-primary bg-zinc-800 rounded-full appearance-none cursor-pointer hover:bg-zinc-700 transition-colors"
            />
        </div>
    );
};

const VDSlider = ({ label, value, min, max, unit = "", onChange }: { label: string, value: number, min: number, max: number, unit?: string, onChange: (val: number) => void }) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => setLocalValue(value), [value]);

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center h-4">
                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</label>
                <span className="text-[10px] font-black text-primary tabular-nums">{localValue}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={localValue}
                onChange={(e) => setLocalValue(parseInt(e.target.value))}
                onMouseUp={() => onChange(localValue)}
                className="w-full h-1 accent-primary bg-zinc-800 rounded-full appearance-none cursor-pointer"
            />
        </div>
    );
};

export default function ControlPanel({ config, setConfig, onStart, onStop, isRunning, onListOptions, detectedCameras = [] }: ControlPanelProps) {
    const handleChange = (field: keyof ScrcpyConfig, value: any) => {
        setConfig({ ...config, [field]: value });
    };

    const CustomSelect = ({ value, onChange, options, label, className = "" }: { value: any, onChange: (val: any) => void, options: { value: any, label: string }[], label?: string, className?: string }) => {
        const [isOpen, setIsOpen] = useState(false);
        const containerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            if (isOpen) document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isOpen]);

        const selectedOption = options.find(opt => opt.value === value) || { value, label: "Custom" };

        return (
            <div className={`relative ${className}`} ref={containerRef}>
                {label && <label className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter mb-1 block">{label}</label>}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-[11px] text-zinc-300 flex items-center justify-between hover:border-primary/60 hover:bg-black transition-all group"
                >
                    <span className="truncate">{selectedOption?.label}</span>
                    <ChevronDown size={14} className={`text-zinc-500 group-hover:text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl z-[100] py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl">
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`px-2 py-1.5 text-[11px] cursor-pointer transition-colors ${opt.value === value ? 'bg-primary/20 text-primary font-bold' : 'text-zinc-400 hover:bg-primary hover:text-black font-medium'}`}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // BitrateControl removed from here

    const PerformanceGrid = ({ showResolution = true }: { showResolution?: boolean }) => (
        <div className={`grid ${showResolution ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
            {showResolution && (
                <CustomSelect
                    label="Resolution"
                    value={config.res || "0"}
                    onChange={(val) => handleChange('res', val)}
                    options={[
                        { value: "0", label: "Original" },
                        { value: "3840", label: "4K" },
                        { value: "2560", label: "2K" },
                        { value: "1920", label: "1080p" },
                        { value: "1600", label: "900p" },
                        { value: "1280", label: "720p" },
                        { value: "1024", label: "576p" },
                        { value: "800", label: "480p" },
                    ]}
                />
            )}
            <CustomSelect
                label="FPS"
                value={config.fps || 60}
                onChange={(val) => handleChange('fps', parseInt(val))}
                options={[
                    { value: 30, label: "30" },
                    { value: 60, label: "60" },
                    { value: 90, label: "90" },
                    { value: 120, label: "120" },
                ]}
            />
            <CustomSelect
                label="Rotation"
                value={config.rotation || "0"}
                onChange={(val) => handleChange('rotation', val)}
                options={[
                    { value: "0", label: "0°" },
                    { value: "270", label: "-90°" },
                    { value: "90", label: "+90°" },
                    { value: "180", label: "180°" },
                ]}
            />
        </div>
    );

    return (
        <main className="lg:col-span-6 space-y-4">
            <div className="glass p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Capture Source</label>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-950/50 p-1 rounded-xl border border-zinc-800">
                    <button
                        onClick={() => handleChange('sessionMode', 'mirror')}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-all ${config.sessionMode === 'mirror' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-primary hover:bg-zinc-950 transition-all'}`}
                    >
                        <Monitor size={18} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-wider">Screen</span>
                    </button>
                    <button
                        onClick={() => handleChange('sessionMode', 'camera')}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-all ${config.sessionMode === 'camera' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-primary hover:bg-zinc-950 transition-all'}`}
                    >
                        <Camera size={18} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-wider">Camera</span>
                    </button>
                    <button
                        onClick={() => handleChange('sessionMode', 'desktop')}
                        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg transition-all ${config.sessionMode === 'desktop' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-primary hover:bg-zinc-950 transition-all'}`}
                    >
                        <LayoutGrid size={18} strokeWidth={2.5} />
                        <span className="text-[9px] font-black uppercase tracking-wider">Desktop</span>
                    </button>
                </div>
            </div>

            <div className="glass p-3.5 rounded-xl space-y-3 transition-all duration-300 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md relative z-20">
                <div className="flex justify-between items-center border-b border-zinc-800/60 pb-1.5 mb-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[11px] font-black uppercase text-zinc-400 tracking-widest">Engine Configuration</h2>
                        <div className="flex gap-1.5">
                            {config.sessionMode === 'mirror' && config.otgEnabled && config.otgPure && (
                                <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-500/80 border border-red-500/20">
                                    OTG Only
                                </span>
                            )}
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${isRunning ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800/30 text-zinc-600 border-zinc-700/30'}`}>
                                {isRunning ? 'Active' : 'Ready'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5 relative z-30">
                    {/* Screen Config */}
                    {config.sessionMode === 'mirror' && (
                        <>
                            <div className={`space-y-2.5 p-2 rounded-xl border transition-all ${config.otgEnabled ? 'bg-zinc-950/40 border-zinc-800' : 'bg-transparent border-transparent'}`}>
                                <div
                                    className="flex items-center gap-3 cursor-pointer group"
                                    onClick={() => {
                                        const newState = !config.otgEnabled;
                                        const updates: Partial<ScrcpyConfig> = { otgEnabled: newState };
                                        if (!newState) updates.otgPure = false;
                                        setConfig({ ...config, ...updates });
                                    }}
                                >
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${config.otgEnabled ? 'bg-primary border-primary' : 'border-zinc-700 group-hover:border-primary'}`}>
                                        {config.otgEnabled && <div className="w-1.5 h-1.5 bg-black rounded-[1px]" />}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase text-zinc-300 tracking-wide group-hover:text-primary transition-colors">HID Input (OTG Style)</span>
                                </div>

                                {config.otgEnabled && (
                                    <div
                                        className="flex items-center gap-3 ml-6.5 cursor-pointer group animate-in slide-in-from-top-1 duration-200"
                                        onClick={() => handleChange('otgPure', !config.otgPure)}
                                    >
                                        <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${config.otgPure ? 'bg-red-500 border-red-500' : 'border-zinc-700 group-hover:border-red-500'}`}>
                                            {config.otgPure && <div className="w-1 h-1 bg-white rounded-[1px]" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${config.otgPure ? 'text-red-400' : 'text-zinc-500 group-hover:text-red-400'}`}>Pure OTG (No Mirror)</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`space-y-2.5 pt-0.5 transition-all duration-300 ${config.otgPure ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                                <PerformanceGrid />
                                <BitrateControl value={config.bitrate || 8} onChange={(v) => handleChange('bitrate', v)} />
                            </div>
                        </>
                    )}

                    {/* Camera Config */}
                    {config.sessionMode === 'camera' && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            {/* Webcam Pro Tip */}
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-3 group/tip hover:bg-primary/10 transition-all">
                                <div className="mt-1">
                                    <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                                        <Video size={14} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Webcam Pro Tip</h4>
                                        <a
                                            href="https://obsproject.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] font-bold text-zinc-500 hover:text-primary flex items-center gap-1 transition-colors"
                                        >
                                            Get OBS <ExternalLink size={10} />
                                        </a>
                                    </div>
                                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                                        Use your phone as a high-quality webcam in Zoom/Teams by capturing this Scrcpy window in <span className="text-zinc-200 font-bold">OBS Studio</span> and starting its <span className="text-zinc-200 font-bold">Virtual Camera</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <CustomSelect
                                    label="Facing"
                                    value={config.cameraFacing || "back"}
                                    onChange={(val) => handleChange('cameraFacing', val)}
                                    options={[
                                        { value: "back", label: "Back" },
                                        { value: "front", label: "Front" },
                                        { value: "external", label: "Ext" },
                                    ]}
                                />
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center h-4">
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">Camera Device</label>
                                            <Tooltip text="Select a specific lens (e.g. Ultra-Wide, Front) from the list." placement="top" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Tooltip text="Click to scan for available camera lenses." placement="top" />
                                            <button
                                                onClick={() => onListOptions("--list-cameras")}
                                                className="text-[8px] font-black uppercase text-primary hover:text-white transition-colors"
                                            >
                                                Refresh Lenses
                                            </button>
                                        </div>
                                    </div>
                                    <CustomSelect
                                        value={config.cameraId || ""}
                                        onChange={(val) => handleChange('cameraId', val)}
                                        options={[
                                            { value: "", label: "Auto Select" },
                                            ...detectedCameras.map(cam => ({ value: cam.id, label: cam.name }))
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <CustomSelect
                                    label="Codec"
                                    value={config.codec || "h264"}
                                    onChange={(val) => handleChange('codec', val)}
                                    options={[
                                        { value: "h264", label: "H.264" },
                                        { value: "h265", label: "H.265" },
                                        { value: "av1", label: "AV1" },
                                    ]}
                                />
                                <CustomSelect
                                    label="Aspect"
                                    value={config.cameraAr || "0"}
                                    onChange={(val) => handleChange('cameraAr', val)}
                                    options={[
                                        { value: "0", label: "Default" },
                                        { value: "16:9", label: "16:9" },
                                        { value: "4:3", label: "4:3" },
                                    ]}
                                />
                            </div>

                            <div className={`space-y-2.5 pt-0.5`}>
                                <PerformanceGrid />
                                <BitrateControl value={config.bitrate || 8} onChange={(v) => handleChange('bitrate', v)} />
                            </div>
                        </div>
                    )}

                    {/* Desktop Config */}
                    {config.sessionMode === 'desktop' && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-4">
                                <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2">
                                    <div className="flex items-center gap-2">
                                        <Settings2 size={12} className="text-primary" />
                                        <h3 className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">Virtual Display Engine</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleChange('aspectRatioLock', !config.aspectRatioLock)}
                                            className={`flex items-center gap-1.5 transition-colors ${config.aspectRatioLock ? 'text-primary' : 'text-zinc-600 hover:text-zinc-400'}`}
                                            title="Lock Aspect Ratio"
                                        >
                                            {config.aspectRatioLock ? <Lock size={10} /> : <Unlock size={10} />}
                                            <span className="text-[8px] font-black uppercase tracking-tighter">Ratio Lock</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <VDSlider
                                        label="Width"
                                        value={config.vdWidth || 1920}
                                        min={480} max={3840}
                                        unit="px"
                                        onChange={(val: number) => {
                                            if (config.aspectRatioLock && config.vdWidth && config.vdHeight) {
                                                const ratio = config.vdHeight / config.vdWidth;
                                                setConfig({ ...config, vdWidth: val, vdHeight: Math.round(val * ratio) });
                                            } else {
                                                handleChange('vdWidth', val);
                                            }
                                        }}
                                    />
                                    <VDSlider
                                        label="Height"
                                        value={config.vdHeight || 1080}
                                        min={360} max={2160}
                                        unit="px"
                                        onChange={(val: number) => {
                                            if (config.aspectRatioLock && config.vdWidth && config.vdHeight) {
                                                const ratio = config.vdWidth / config.vdHeight;
                                                setConfig({ ...config, vdHeight: val, vdWidth: Math.round(val * ratio) });
                                            } else {
                                                handleChange('vdHeight', val);
                                            }
                                        }}
                                    />
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center h-4">
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">UI Scaling (DPI)</label>
                                                <Tooltip text="Lower DPI = Desktop/Tablet feel (larger UI). Higher DPI = Phone feel (smaller, denser UI)." placement="top" />
                                            </div>
                                            <span className="text-[10px] font-black text-primary tabular-nums">{config.vdDpi || 420} DPI</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={120}
                                            max={640}
                                            value={config.vdDpi || 420}
                                            onChange={(e) => handleChange('vdDpi', parseInt(e.target.value))}
                                            className="w-full h-1 accent-primary bg-zinc-800 rounded-full appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <CustomSelect
                                        label="Quick Presets"
                                        value={(() => {
                                            const w = config.vdWidth;
                                            const h = config.vdHeight;
                                            if (w === 1920 && h === 1080) return "1080p";
                                            if (w === 2560 && h === 1440) return "1440p";
                                            if (w === 3840 && h === 2160) return "4k";
                                            if (w === 2560 && h === 1080) return "ultrawide";
                                            return "custom";
                                        })()}
                                        onChange={(val: string) => {
                                            if (val === '1080p') setConfig({ ...config, vdWidth: 1920, vdHeight: 1080 });
                                            if (val === '1440p') setConfig({ ...config, vdWidth: 2560, vdHeight: 1440 });
                                            if (val === '4k') setConfig({ ...config, vdWidth: 3840, vdHeight: 2160 });
                                            if (val === 'ultrawide') setConfig({ ...config, vdWidth: 2560, vdHeight: 1080 });
                                        }}
                                        options={[
                                            { value: "1080p", label: "1080p Standard" },
                                            { value: "1440p", label: "1440p High" },
                                            { value: "4k", label: "4K Ultra" },
                                            { value: "ultrawide", label: "21:9 Ultra-Wide" },
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5 pt-0.5">
                                <PerformanceGrid showResolution={false} />
                                <BitrateControl value={config.bitrate || 8} onChange={(v) => handleChange('bitrate', v)} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2 relative z-10">
                {!isRunning ? (
                    <button
                        onClick={onStart}
                        className="w-full py-3.5 rounded-2xl text-base font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group active:scale-[0.98]"
                    >
                        {/* Pulse Glow Layer */}
                        <div className="absolute inset-0 bg-primary opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-primary animate-ping opacity-20 group-hover:opacity-40 pointer-events-none" />

                        <span className="relative z-10 flex items-center justify-center gap-3 text-black">
                            <Play fill="black" size={18} className="group-hover:scale-110 transition-transform" />
                            {config.sessionMode === 'mirror' ? (config.otgEnabled && config.otgPure ? 'Initialize OTG' : 'Start Mission') :
                                config.sessionMode === 'camera' ? 'Engage Camera' : 'Eject to Desktop'}
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={onStop}
                        className="w-full py-3.5 rounded-2xl text-base font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group active:scale-[0.98] border border-red-500/50"
                    >
                        {/* Dark Red Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-900 group-hover:from-red-500 group-hover:to-red-800 transition-all" />

                        <span className="relative z-10 flex items-center justify-center gap-3 text-white">
                            <Square fill="white" size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                            Stop Session
                        </span>
                    </button>
                )}
            </div>
        </main>
    );
}
