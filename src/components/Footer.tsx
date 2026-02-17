import { Github, Youtube, Globe, Heart, Coffee } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full p-6 mt-4 glass border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex flex-col items-center justify-center space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">About Scrcpy GUI</h3>

            <div className="flex gap-8">
                <a href="https://github.com/kil0bit-kb" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                    <Github size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
                    <span className="text-[9px] font-bold text-zinc-600 group-hover:text-white uppercase tracking-wider">Github</span>
                </a>
                <a href="https://www.youtube.com/@kilObit" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                    <Youtube size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
                    <span className="text-[9px] font-bold text-zinc-600 group-hover:text-white uppercase tracking-wider">Youtube</span>
                </a>
                <a href="https://kil0bit.blogspot.com/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                    <Globe size={16} className="text-zinc-600 group-hover:text-white transition-colors" />
                    <span className="text-[9px] font-bold text-zinc-600 group-hover:text-white uppercase tracking-wider">Website</span>
                </a>
                <a href="https://www.patreon.com/cw/KB_kilObit" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group">
                    <Coffee size={16} className="text-primary group-hover:text-primary/80 transition-colors animate-pulse" />
                    <span className="text-[9px] font-bold text-primary group-hover:text-primary/80 uppercase tracking-wider">Support</span>
                </a>
            </div>

            {/* Tech Attributions */}
            <div className="pt-2 flex flex-wrap justify-center gap-x-5 gap-y-1.5 opacity-40 hover:opacity-100 transition-opacity divide-x divide-zinc-800">
                <div className="flex items-center gap-1.5 pl-5 first:pl-0">
                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">Core</span>
                    <a href="https://github.com/Genymobile/scrcpy" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-zinc-400 hover:text-primary transition-colors hover:underline underline-offset-2">scrcpy</a>
                </div>
                <div className="flex items-center gap-1.5 pl-5">
                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">Client</span>
                    <a href="https://tauri.app/" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-zinc-400 hover:text-primary transition-colors hover:underline underline-offset-2">Tauri</a>
                </div>
                <div className="flex items-center gap-1.5 pl-5">
                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">UI</span>
                    <a href="https://react.dev/" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-zinc-400 hover:text-primary transition-colors hover:underline underline-offset-2">React</a>
                </div>
                <div className="flex items-center gap-1.5 pl-5">
                    <span className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">Assets</span>
                    <a href="https://lucide.dev/" target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-zinc-400 hover:text-primary transition-colors hover:underline underline-offset-2">Lucide</a>
                </div>
            </div>

            <div className="text-[10px] text-zinc-600 flex items-center gap-1 mt-2">
                APP VERSION v3.1 • CREATED WITH <Heart size={10} className="text-red-500 fill-red-500" /> BY KB
            </div>
        </footer>
    );
}
