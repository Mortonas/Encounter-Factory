import { Swords, LayoutDashboard, FileText } from "lucide-react";
import { cn } from "../../lib/utils";

interface LayoutProps {
  children: React.ReactNode;
  view: string;
  setView: (view: any) => void;
}

export function Layout({ children, view, setView }: LayoutProps) {
  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-primary/30">
      <header className="border-b border-zinc-800/50 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer" 
              onClick={() => setView("dashboard")}
            >
              <Swords className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic">
              Encounter Factory <span className="text-primary text-[10px] not-italic align-top ml-1">WORKER CONSOLE</span>
            </h1>
          </div>
          <nav className="flex items-center gap-4">
            <button 
              onClick={() => setView("dashboard")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                view === "dashboard" ? "bg-primary text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <LayoutDashboard className="w-3 h-3" /> Dashboard
            </button>
            <a 
              href="/form" 
              target="_blank"
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-all border border-zinc-800"
            >
              <FileText className="w-3 h-3" /> Public Form
            </a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {children}
      </main>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
        .red-glow {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.1);
        }
      `}</style>
    </div>
  );
}
