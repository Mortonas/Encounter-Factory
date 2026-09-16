import { motion } from "motion/react";
import { cn } from "../../lib/utils";

interface SegmentedControlProps {
  options: { label: string; value: any; hint?: string }[];
  value: any;
  onChange: (value: any) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn("relative flex p-1 bg-zinc-950/50 border border-white/5 rounded-xl", className)}>
      <motion.div
        className="absolute inset-y-1 bg-primary rounded-lg shadow-[0_0_15px_rgba(var(--color-primary),0.3)]"
        initial={false}
        animate={{
          left: `calc(${(options.findIndex(o => o.value === value) / options.length) * 100}% + 4px)`,
          width: `calc(${100 / options.length}% - 8px)`,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 flex-1 py-2 px-3 text-xs font-bold uppercase tracking-widest transition-colors duration-300",
            value === option.value ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {option.label}
          {option.hint && <span className="block text-[10px] font-medium normal-case opacity-50">{option.hint}</span>}
        </button>
      ))}
    </div>
  );
}
