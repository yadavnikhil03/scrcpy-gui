import React from 'react';
import { Smartphone, RefreshCw, Usb, Wifi, UploadCloud, Zap } from 'lucide-react';

export interface SidebarProps {
    devices: string[];
    runningDevices: string[];
    onRefresh: () => void;
    onKillAdb: () => void;
    selectedDevice: string;
    onSelectDevice: (d: string) => void;
    onPair: (ip: string, code: string) => Promise<any>;
    onConnect: (ip: string) => Promise<any>;
    isAutoConnect: boolean;
    onToggleAuto: (val: boolean) => void;
    isRefreshing?: boolean;
    onFilePush: () => void;
    // History props
    historyDevices?: string[];
    clearHistory?: () => void;
}

export default function Sidebar({
    devices,
    runningDevices,
    onRefresh,
    onKillAdb,
    selectedDevice,
    onSelectDevice,
    onPair,
    onConnect,
    isAutoConnect,
    onToggleAuto,
    isRefreshing,
    onFilePush,
    historyDevices = [],
    clearHistory = () => { }
}: SidebarProps) {
    const [activeTab, setActiveTab] = React.useState<'usb' | 'wireless'>('usb');
    const [connectIp, setConnectIp] = React.useState('');
    const [pairIp, setPairIp] = React.useState('');
    const [pairCode, setPairCode] = React.useState('');
    const pairCodeRef = React.useRef<HTMLInputElement>(null);

    const handleConnect = async (ip: string) => {
        if (!ip) return;
        await onConnect(ip);
    };

    return (
        <aside className="lg:col-span-3 space-y-4">
            <div className="glass p-4 rounded-xl space-y-4 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md">
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2 mb-1">
                    <h2 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-zinc-400">
                        <Smartphone size={14} className="text-primary" />
                        Device Hub
                    </h2>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={onKillAdb}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter text-zinc-600 hover:text-red-400 hover:bg-red-500/5 transition-all group/zap"
                            title="Force kill all adb operations"
                        >
                            <Zap size={10} className="group-hover/zap:fill-red-400 group-hover/zap:scale-110 transition-all" />
                            Kill ADB
                        </button>
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className={`flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/50 hover:bg-primary/20 border border-zinc-800 hover:border-primary/30 rounded-md text-[9px] font-black uppercase tracking-widest text-primary hover:text-white transition-all group/refresh ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RefreshCw size={10} className={`group-hover/refresh:rotate-180 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Syncing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                        {devices.length === 0 ? (
                            <div className="text-[10px] text-zinc-600 italic py-4 text-center border border-dashed border-zinc-800/50 rounded-lg bg-black/20">No devices detected</div>
                        ) : (
                            devices.map(d => {
                                const isRunning = runningDevices.includes(d);
                                const isSelected = selectedDevice === d;
                                return (
                                    <button
                                        key={d}
                                        onClick={() => onSelectDevice(d)}
                                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left group ${isSelected ? 'bg-primary/5 border-primary/30' : 'bg-black/20 border-zinc-800/50 hover:border-zinc-700'}`}
                                    >
                                        <div className={`p-1.5 rounded-md transition-colors ${isSelected ? 'bg-primary text-black' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}>
                                            <Smartphone size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[11px] font-bold truncate tracking-tight ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{d}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {isRunning ? (
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] animate-pulse" />
                                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Ready</span>
                                                )}
                                                {d.includes('.') ? (
                                                    <span className="flex items-center gap-1 bg-primary/10 px-1 py-0.5 rounded border border-primary/20">
                                                        <Wifi size={8} className="text-primary" />
                                                        <span className="text-[7px] font-black text-primary uppercase tracking-tighter">Wi-Fi</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">
                                                        <Usb size={8} className="text-zinc-400" />
                                                        <span className="text-[7px] font-black text-zinc-400 uppercase tracking-tighter">USB</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="bg-black/40 p-1 rounded-lg flex gap-1 border border-zinc-800/50">
                        <button
                            onClick={() => setActiveTab('usb')}
                            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-md transition-all ${activeTab === 'usb' ? 'bg-primary text-black shadow-lg translate-y-[-1px]' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Usb size={11} /> USB
                        </button>
                        <button
                            onClick={() => setActiveTab('wireless')}
                            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-md transition-all ${activeTab === 'wireless' ? 'bg-primary text-black shadow-lg translate-y-[-1px]' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Wifi size={11} /> Wireless
                        </button>
                    </div>

                    {activeTab === 'usb' && (
                        <div className="pt-1">
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-primary rounded-full" />
                                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">USB Setup Tip</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                    Enable <span className="text-zinc-300 underline decoration-primary/30 decoration-dashed">Developer Options</span> and <span className="text-zinc-300 underline decoration-primary/30 decoration-dashed">USB Debugging</span> on your phone.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'wireless' && (
                        <div className="space-y-5 pt-2">
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-primary rounded-full" />
                                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">Wireless Setup Tip</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                                    Connect device to <span className="text-zinc-300 underline decoration-primary/30 decoration-dashed">Same Wi-Fi</span> and enable <span className="text-zinc-300 underline decoration-primary/30 decoration-dashed">Wireless Debugging</span>.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-zinc-800/50 pb-1.5">
                                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">IP Connect</span>
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => onToggleAuto(!isAutoConnect)}>
                                        <div className={`w-3 h-3 rounded-[2px] border flex items-center justify-center transition-colors ${isAutoConnect ? 'bg-primary border-primary' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                                            {isAutoConnect && <div className="w-1.5 h-1.5 bg-black rounded-[0.5px]" />}
                                        </div>
                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">Auto</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Wifi size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                                        <input
                                            type="text"
                                            placeholder="192.168.x.x:5555"
                                            value={connectIp}
                                            onChange={(e) => setConnectIp(e.target.value)}
                                            className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-200 focus:border-primary/40 focus:bg-black/60 transition-all outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleConnect(connectIp)}
                                        disabled={isRefreshing}
                                        className={`px-4 bg-zinc-800 hover:bg-primary text-zinc-400 hover:text-black rounded-lg text-[10px] font-black uppercase transition-all active:scale-95 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isRefreshing ? '...' : 'Connect'}
                                    </button>
                                </div>

                            </div>

                            {/* Recent Devices History */}
                            {historyDevices.length > 0 && (
                                <div className="space-y-3 pt-1">
                                    <div className="flex items-center justify-between border-b border-zinc-800/50 pb-1.5">
                                        <span className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Recent Devices</span>
                                        <button
                                            onClick={clearHistory}
                                            className="text-[9px] text-zinc-600 hover:text-red-400 font-bold uppercase tracking-tighter transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {historyDevices.map((ip, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setConnectIp(ip);
                                                    handleConnect(ip);
                                                }}
                                                className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-800/20 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Wifi size={10} className="text-zinc-500 group-hover:text-zinc-300" />
                                                    <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200">{ip}</span>
                                                </div>
                                                <div className="text-[8px] text-primary opacity-0 group-hover:opacity-100 uppercase font-black tracking-tighter">
                                                    Connect
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pairing Setup */}
                            <div className="space-y-3 pt-1">
                                <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest border-b border-zinc-800/50 block pb-1.5">2. Pair Device (Android 11+)</span>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="IP:Port"
                                        value={pairIp}
                                        onChange={(e) => setPairIp(e.target.value)}
                                        className="w-full bg-black/40 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:border-primary/40 transition-all outline-none"
                                    />
                                    <input
                                        ref={pairCodeRef}
                                        type="text"
                                        placeholder="Pairing Code"
                                        value={pairCode}
                                        onChange={(e) => setPairCode(e.target.value)}
                                        className={`w-full bg-black/40 border rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 transition-all outline-none ${pairIp ? 'border-amber-400/50 focus:border-amber-400' : 'border-zinc-800 focus:border-primary/40'}`}
                                    />
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!pairIp || !pairCode || isRefreshing) return;
                                        const res = await onPair(pairIp, pairCode);
                                        if (res.success) {
                                            const ipOnly = pairIp.split(':')[0];
                                            const connectTarget = ipOnly + ":5555";
                                            setConnectIp(connectTarget);
                                            setPairCode('');
                                            // Auto-connect attempt
                                            handleConnect(connectTarget);
                                        }
                                    }}
                                    disabled={isRefreshing}
                                    className={`w-full py-1.5 border border-zinc-800 hover:border-primary/50 hover:bg-primary/5 text-zinc-500 hover:text-primary rounded-lg text-[10px] font-black uppercase transition-all active:scale-[0.98] ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isRefreshing ? 'Synchronizing...' : 'Start Pairing'}
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            </div>

            <div
                onClick={onFilePush}
                className="glass p-5 rounded-xl flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-primary/5 transition-all border-2 border-dashed border-zinc-800/50 hover:border-primary/30 group bg-zinc-900/40 backdrop-blur-md"
            >
                <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                    <UploadCloud className="text-primary group-hover:scale-110 transition-transform" size={24} />
                </div>
                <div className="text-center">
                    <h3 className="text-[11px] font-black text-zinc-300 uppercase tracking-widest">Flash / Push Files</h3>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter mt-1 opacity-60">Drag & drop ANY FILE OR APK</p>
                </div>
            </div>
        </aside>
    );
}
