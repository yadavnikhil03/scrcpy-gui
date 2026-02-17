import { useState } from 'react';
import { Download, FolderOpen, RefreshCcw, Palette, HelpCircle, X, ExternalLink } from 'lucide-react';

interface HeaderProps {
    onThemeChange: (theme: string) => void;
    currentTheme: string;
    binaryStatus: { found: boolean, message: string };
    onDownload: () => void;
    onSetPath: () => void;
    onResetPath: () => void;
    isDownloading: boolean;
    downloadProgress: number;
}

export default function Header({ onThemeChange, currentTheme, binaryStatus, onDownload, onSetPath, onResetPath, isDownloading, downloadProgress }: HeaderProps) {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2 py-4">
            {showHelp && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="glass max-w-md w-full p-6 rounded-2xl border border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200 bg-zinc-950/90">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <HelpCircle size={18} /> Manual Setup Guide
                            </h3>
                            <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs leading-relaxed text-zinc-300">
                            <p>If the automatic download fails or you prefer to use your own scrcpy version:</p>

                            <ol className="list-decimal list-inside space-y-3 font-medium">
                                <li>
                                    Download the latest version for your OS from
                                    <a href="https://github.com/Genymobile/scrcpy/releases/latest" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 mt-1 ml-4">
                                        GitHub Releases <ExternalLink size={10} />
                                    </a>
                                </li>
                                <li>Unzip the downloaded archive to a folder on your computer.</li>
                                <li>
                                    Click the <span className="text-white font-bold inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 shadow-sm mx-1"><FolderOpen size={10} /> Browse</span> icon in the header.
                                </li>
                                <li>Select the unzipped folder containing the <code className="text-primary font-bold">scrcpy</code> executable.</li>
                            </ol>

                            <div className="pt-3 border-t border-zinc-800/50">
                                <p className="text-zinc-500 italic">Note: ScrcpyGUI will remember this custom path for future sessions.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowHelp(false)}
                            className="w-full mt-6 py-3 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-primary/90 active:scale-95"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {/* Theme Switcher - Far Left */}
            <div className="flex-1 flex justify-start">
                <div className="flex items-center gap-3 group/header">
                    <div className="flex items-center gap-1.5 grayscale opacity-50 group-hover/header:grayscale-0 group-hover/header:opacity-100 transition-all">
                        <Palette size={12} className="text-primary" />
                        <span className="text-[9px] uppercase font-black text-zinc-500 tracking-tighter">Theme</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {[
                            { id: 'ultraviolet', color: '#8b5cf6', label: 'Ultraviolet' },
                            { id: 'astro', color: '#3b82f6', label: 'Astro Blue' },
                            { id: 'carbon', color: '#ffffff', label: 'Carbon Stealth' },
                            { id: 'emerald', color: '#10b981', label: 'Emerald' },
                            { id: 'bloodmoon', color: '#ef4444', label: 'Blood Moon' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => onThemeChange(t.id)}
                                className={`w-4 h-4 rounded-full transition-all hover:scale-125 active:scale-95 relative group/swatch ${currentTheme === t.id ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-40 hover:opacity-100'}`}
                                style={{ backgroundColor: t.color }}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[9px] font-bold uppercase tracking-widest text-white opacity-0 group-hover/swatch:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                    {t.label}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Branding - Center */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="flex items-baseline gap-2">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase italic">
                        scrcpy <span className="text-primary not-italic">GUI</span>
                    </h1>
                    <div className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 mt-1">
                        <span className="text-[10px] font-black text-zinc-400 tracking-wider">V3.1</span>
                    </div>
                </div>
                <p className="text-zinc-600 text-[9px] uppercase tracking-[0.3em] font-black mt-1 ml-0.5">
                    Mirror & Control Android <span className="text-zinc-800">//</span> Devices Easily
                </p>
            </div>

            {/* Binary Status - Far Right */}
            <div className="flex flex-wrap gap-3 items-center flex-1 justify-end">
                {!binaryStatus.found && (
                    <button
                        onClick={() => setShowHelp(true)}
                        className="px-4 py-2 glass rounded-xl border border-primary/50 text-primary hover:text-white transition-all hover:scale-105 hover:bg-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.2)] flex items-center gap-2 group/help animate-pulse hover:animate-none"
                        title="Get help setting up scrcpy"
                    >
                        <HelpCircle size={18} className="group-hover/help:rotate-12 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Setup Help</span>
                    </button>
                )}

                <div className="glass px-4 py-2 rounded-xl flex items-center gap-4 w-full md:w-auto justify-between md:justify-start border border-zinc-800 bg-zinc-950/50 backdrop-blur-2xl shadow-2xl relative group overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex flex-col min-w-[110px] relative z-10">
                        <div className="flex items-center gap-1.5 mb-1 text-zinc-500">
                            <span className="text-[10px] uppercase font-black tracking-widest">Scrcpy Engine</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${binaryStatus.found ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-[pulse_2s_infinite]' : 'bg-yellow-500 animate-pulse'}`} />
                        </div>
                        <div className={`text-xs font-black uppercase tracking-tighter truncate max-w-[150px] ${binaryStatus.found ? 'text-emerald-400 animate-[pulse_4s_infinite]' : 'text-yellow-500'}`}>
                            {isDownloading ? (
                                `Syncing Components ${downloadProgress}%`
                            ) : binaryStatus.found ? (
                                "Scrcpy Ready"
                            ) : (
                                binaryStatus.message
                            )}
                        </div>
                        {isDownloading && (
                            <div className="w-full bg-zinc-800 h-1 rounded-full mt-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${downloadProgress}%` }}></div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 items-center border-l border-zinc-800 pl-3 relative z-10">
                        {!binaryStatus.found && !isDownloading && (
                            <button onClick={onDownload} className="px-2 py-0.5 bg-emerald-500 text-black border border-emerald-400 rounded-md text-[9px] font-black hover:bg-emerald-400 transition-all uppercase tracking-tighter shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-1">
                                <Download size={10} /> Install Core
                            </button>
                        )}
                        <button onClick={onSetPath} className="p-1 hover:text-primary text-zinc-500 transition-colors" title="Select Folder"><FolderOpen size={16} /></button>
                        <button onClick={onResetPath} className="p-1 hover:text-red-400 text-zinc-500 transition-colors" title="Reset Path"><RefreshCcw size={16} /></button>
                    </div>
                </div>
            </div>
        </header>
    );
}
