import React from "react";
import { motion } from "motion/react";
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight,
  Clock,
  Trash2,
  X,
  Check
} from "lucide-react";
import type { Job } from "@/server/types";
import { clsx } from "clsx";

interface JobDashboardProps {
  jobs: Job[];
  onResume: (jobId: string) => void;
  onViewResults: (jobId: string) => void;
  onDelete: (jobId: string) => void;
}

export const JobDashboard: React.FC<JobDashboardProps> = ({ jobs, onResume, onViewResults, onDelete }) => {
  if (jobs.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
        <p className="text-white/40 font-medium">No active or recent tactical audits found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white/50">
          Tactical Command History
        </h3>
        <span className="text-[10px] text-white/30 uppercase tracking-widest">
          Last 24 Hours
        </span>
      </div>

      <div className="grid gap-3">
        {jobs.map((job) => (
          <JobCard 
            key={job.id} 
            job={job} 
            onResume={() => onResume(job.id)}
            onViewResults={() => onViewResults(job.id)}
            onDelete={() => onDelete(job.id)}
          />
        ))}
      </div>
    </div>
  );
};

const JobCard: React.FC<{ 
  job: Job; 
  onResume: () => void;
  onViewResults: () => void;
  onDelete: () => void;
}> = ({ job, onResume, onViewResults, onDelete }) => {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const isDone = job.status === "done";
  const isError = job.status === "error";
  const isRunning = job.status === "running";
  const isPending = job.status === "pending";

  const timeAgo = new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Status Indicator */}
          <div className="relative">
            {isPending && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
            )}
            {isRunning && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {isDone && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
            {isError && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ruby-500/20 text-ruby-500 shadow-[0_0_15px_rgba(224,30,90,0.2)]">
                <AlertCircle className="h-5 w-5 animate-bounce" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="truncate font-semibold text-white/90">
                {job.setup.sessionName || "Unnamed Encounter"}
              </h4>
              <span className="text-[10px] text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded uppercase">
                {job.id.split('-')[0]}
              </span>
            </div>
            <p className="truncate text-xs text-white/40">
              {job.setup.setting} • {job.setup.difficulty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-2 hidden sm:block">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Created</p>
            <p className="text-xs font-medium text-white/60">{timeAgo}</p>
          </div>

          {!isDone ? (
            <button
              onClick={onResume}
              className="flex items-center gap-2 rounded-lg bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-400 border border-violet-500/30 transition-all hover:bg-violet-600/30 hover:border-violet-500/50 group-hover:scale-105 active:scale-95"
            >
              {isError ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isError ? "Retry" : isRunning ? "Join" : "Resume"}
            </button>
          ) : (
            <button
              onClick={onViewResults}
              className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/20 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40 group-hover:scale-105 active:scale-95"
            >
              View Results
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Delete Action */}
          <div className="ml-2 flex items-center border-l border-white/10 pl-4">
            {!isConfirming ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsConfirming(true);
                }}
                className="p-2 text-white/20 hover:text-ruby-400 transition-colors rounded-lg hover:bg-ruby-500/10"
                title="Delete Job"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                  title="Confirm Delete"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirming(false);
                  }}
                  className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar for Running Jobs */}
      {isRunning && job.events.length > 0 && (
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            initial={{ width: 0 }}
            animate={{ width: `${(job.events.length / 8) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </motion.div>
  );
};
