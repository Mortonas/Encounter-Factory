import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ClipboardList, 
  Trash2, 
  ChevronRight, 
  Clock, 
  User, 
  History,
  Search,
  Shield,
  FileJson,
  CheckCircle2,
  ClipboardCheck,
  Loader2
} from "lucide-react";
import { QueuedSession } from "../../types";
import { cn } from "../../lib/utils";

interface SessionQueueProps {
  sessions: QueuedSession[];
  onEngage: (session: QueuedSession) => void;
  onDelete: (id: string) => void;
  onExportSessionLogs: (session: QueuedSession) => void;
}

export function SessionQueue({ sessions, onEngage, onDelete, onExportSessionLogs }: SessionQueueProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "new" | "processing" | "completed">("all");

  const getStatusMeta = (status: QueuedSession["status"]) => {
    switch (status) {
      case "new":
        return {
          label: "Pending Operator Review",
          shortLabel: "Pending Review",
          action: "Review Brief",
          icon: ClipboardCheck,
          card: "border-primary/25 bg-primary/[0.03]",
          rail: "bg-primary",
          badge: "bg-primary/15 text-primary border-primary/30",
          iconBox: "bg-primary/10 text-primary border-primary/20"
        };
      case "processing":
      case "reviewed":
        return {
          label: status === "reviewed" ? "Reviewed, Ready To Forge" : "Processing In Forge",
          shortLabel: status === "reviewed" ? "Reviewed" : "Processing",
          action: status === "reviewed" ? "Start Forge" : "Resume Audit",
          icon: Loader2,
          card: "border-amber-500/25 bg-amber-500/[0.03]",
          rail: "bg-amber-500",
          badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          iconBox: "bg-amber-500/10 text-amber-300 border-amber-500/20"
        };
      case "completed":
        return {
          label: "Completed Manifest Ready",
          shortLabel: "Completed",
          action: "View Manifest",
          icon: CheckCircle2,
          card: "border-emerald-500/25 bg-emerald-500/[0.03]",
          rail: "bg-emerald-500",
          badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          iconBox: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
        };
      default:
        return {
          label: "Archived Session",
          shortLabel: "Archived",
          action: "View Archive",
          icon: ClipboardList,
          card: "border-zinc-700/60 bg-zinc-900/[0.03]",
          rail: "bg-zinc-600",
          badge: "bg-zinc-700/40 text-zinc-300 border-zinc-600/50",
          iconBox: "bg-zinc-800 text-zinc-400 border-zinc-700"
        };
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions
      .filter(s => {
        const matchesSearch = 
          (s.title || s.data?.sessionName || "").toLowerCase().includes(search.toLowerCase()) ||
          (s.clientName || "").toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" || s.status === filter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, search, filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients or sessions..." 
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-xs font-medium outline-none focus:border-primary/50 transition-all text-zinc-200"
          />
        </div>
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(["all", "new", "processing", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f ? "bg-primary text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filteredSessions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="premium-card p-20 text-center space-y-4 border-dashed border-2 opacity-50"
          >
            <ClipboardList className="w-12 h-12 text-zinc-700 mx-auto" />
            <div className="space-y-1">
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                {search ? "No Matches Found" : "Waiting for Client Submissions..."}
              </p>
              {search && <p className="text-[10px] text-zinc-600 font-medium italic">Adjust your search parameters and try again.</p>}
            </div>
          </motion.div>
        ) : (
          filteredSessions.map(session => {
            const statusMeta = getStatusMeta(session.status);
            const StatusIcon = statusMeta.icon;

            return (
            <motion.div
              key={session.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("premium-card group hover:border-primary/30 transition-all overflow-hidden relative", statusMeta.card)}
            >
              <div className={cn("absolute left-0 top-0 h-full w-1", statusMeta.rail)} />
              <div className="p-6 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border transition-colors", statusMeta.iconBox)}>
                    <StatusIcon className={cn("w-6 h-6", session.status === "processing" && "animate-spin")} />
                  </div>
                  <div className="space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black uppercase tracking-tight text-lg italic text-white">
                        {session.title || session.data?.sessionName || "Untitled Mission"}
                      </h3>
                      <span className={cn("text-[9px] font-black uppercase px-2.5 py-1 rounded-full border tracking-widest", statusMeta.badge)}>
                        {statusMeta.shortLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1 text-zinc-200">
                        <User className="w-3 h-3 text-primary" />
                        <span className="text-zinc-600">Client</span>
                        {session.clientName}
                      </span>
                      <span className="text-zinc-700">|</span>
                      <span className={cn("flex items-center gap-1", session.status === "new" ? "text-primary" : session.status === "completed" ? "text-emerald-300" : "text-amber-300")}>
                        <StatusIcon className="w-3 h-3" />
                        Status: {statusMeta.label}
                      </span>
                      <span className="text-zinc-700">|</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(session.createdAt).toLocaleTimeString()}</span>
                      {session.data?.pcs && (
                        <>
                          <span className="text-zinc-700">|</span>
                          <span className="flex items-center gap-1"><History className="w-3 h-3" /> {session.data.pcs.length} Heroes {session.data.pcs.filter(p => p.burstPotential === "high").length > 0 && <span className="text-primary">(+{session.data.pcs.filter(p => p.burstPotential === "high").length} Nova)</span>}</span>
                        </>
                      )}
                      <span className="text-zinc-700">|</span>
                      <span className="flex items-center gap-1 text-zinc-300">
                        <Shield className="w-3 h-3 text-primary" />
                        {session.data?.encounterStructure || session.sessionType || "encounter"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {session.status !== "new" && (
                    <button 
                      onClick={() => onExportSessionLogs(session)}
                      title="Export Reasoning Logs"
                      className="p-2 text-zinc-600 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <FileJson className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => onDelete(session.id)}
                    title="Delete Briefing"
                    className="p-2 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => onEngage(session)}
                    className="bg-primary hover:bg-red-600 text-white px-6 py-2 rounded-full font-black italic uppercase tracking-tighter text-xs flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                  >
                    {statusMeta.action}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {session.data?.gmNotes && (
                <div className="px-6 pb-4 border-t border-zinc-800/50 pt-3 flex items-center justify-between">
                  <p className="text-[10px] text-zinc-500 italic line-clamp-1 font-medium group-hover:text-zinc-400 transition-colors max-w-[70%]">
                    Client Rant: "{session.data.gmNotes}"
                  </p>
                  {session.data?.oneFightDay && (
                    <span className="text-[8px] font-black uppercase bg-red-500/10 text-primary px-2 py-0.5 rounded border border-primary/20 animate-pulse">
                      Total Arsenal Engagement Active
                    </span>
                  )}
                </div>
              )}
            </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}
