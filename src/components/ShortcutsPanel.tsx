import { Maximize, Home, ChevronLeft, List, Power, RotateCw, Clipboard, MonitorOff, Keyboard } from 'lucide-react';

export default function ShortcutsPanel() {
    const shortcuts = [
        { label: "Full", key: "F", icon: Maximize },
        { label: "Home", key: "H", icon: Home },
        { label: "Back", key: "B", icon: ChevronLeft },
        { label: "Recents", key: "S", icon: List },
        { label: "Power", key: "P", icon: Power },
        { label: "Rotate", key: "R", icon: RotateCw },
        { label: "Paste", key: "V", icon: Clipboard },
        { label: "Off", key: "O", icon: MonitorOff },
    ];

    return (
        <div className="glass p-3.5 rounded-2xl space-y-2 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-1.5 mb-1">
                <Keyboard size={12} className="text-zinc-500" />
                <h2 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Shortcuts (Alt +)</h2>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {shortcuts.map(s => (
                    <div key={s.key} className="group relative flex flex-col items-center justify-center bg-zinc-950/30 p-1.5 rounded-lg border border-transparent hover:border-zinc-700 transition-all cursor-help">
                        {/* Tooltip on Hover */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-zinc-300 text-[9px] font-bold px-2 py-1 rounded border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {s.label}
                        </div>

                        <s.icon size={14} className="text-zinc-500 group-hover:text-primary transition-colors mb-1" />
                        <kbd className="min-w-[14px] h-3.5 flex items-center justify-center text-[9px] font-black bg-zinc-800/50 text-zinc-400 group-hover:text-white group-hover:bg-primary/20 px-1 rounded border border-zinc-800 group-hover:border-primary/50 transition-all">
                            {s.key}
                        </kbd>
                    </div>
                ))}
            </div>
        </div>
    );
}
