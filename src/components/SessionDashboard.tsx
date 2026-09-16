import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { QueuedSession } from "../types";
import { cn } from "../lib/utils";
import { SessionQueue } from "./dashboard/SessionQueue";
import { ForgeAnalytics } from "./dashboard/ForgeAnalytics";
import { CompletedArchivePanel } from "./dashboard/CompletedArchivePanel";
import { operatorFetch } from "../utils/operatorAuth";

interface SessionDashboardProps {
  onEngage: (session: QueuedSession) => void;
}

export function SessionDashboard({ onEngage }: SessionDashboardProps) {
  const [sessions, setSessions] = useState<QueuedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "archive">("queue");

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await operatorFetch("/api/sessions?status=new,reviewed,processing");
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const deleteSession = async (id: string) => {
    try {
      await operatorFetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleEngage = async (session: QueuedSession) => {
    try {
      const response = await operatorFetch(`/api/sessions/${session.id}`);
      if (!response.ok) {
        throw new Error("Failed to load session detail.");
      }
      onEngage(await response.json());
    } catch (err) {
      console.error("Failed to engage session:", err);
    }
  };

  const handleExportLogs = async () => {
    try {
      setLoading(true);
      const response = await operatorFetch("/api/export-logs");
      const fullData = await response.json();

      const dataStr = JSON.stringify(fullData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `forge-full-logs-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export full session logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMassCrystallize = () => {
    console.log("Initializing Mass Crystallization sequence...");
  };

  const handleExportSessionLogs = async (session: QueuedSession) => {
    try {
      setLoading(true);
      const response = await operatorFetch(`/api/sessions/${session.id}/export`);
      const data = await response.json();

      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const sessionTitle = session.title || session.data?.sessionName || "session";
      link.download = `forge-session-log-${sessionTitle.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export individual session logs:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">
              Contractor Console
            </h2>
            <p className="text-zinc-500 font-medium">Manage incoming mission briefings and the assembly queue.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Live</span>
          </div>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="p-2 hover:bg-zinc-800 rounded-full transition-all text-zinc-500 hover:text-primary disabled:opacity-50"
        >
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-white/5">
        {(["queue", "archive"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab ? "border-b-2 border-primary text-primary" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab === "queue" ? "Queue" : "Archive"}
          </button>
        ))}
      </div>

      {activeTab === "archive" ? (
        <CompletedArchivePanel />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-3">
            <SessionQueue
              sessions={sessions}
              onEngage={handleEngage}
              onDelete={deleteSession}
              onExportSessionLogs={handleExportSessionLogs}
            />
          </div>

          <div className="md:col-span-1">
            <ForgeAnalytics
              sessions={sessions}
              onExportLogs={handleExportLogs}
              onMassCrystallize={handleMassCrystallize}
              isLoading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
