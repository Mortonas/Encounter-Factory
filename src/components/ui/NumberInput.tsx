import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/utils";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function NumberInput({ value, onChange, min = 1, max = 20, label, className, compact = false }: NumberInputProps) {
  const increment = () => {
    if (max === undefined || value < max) {
      onChange(value + 1);
    }
  };

  const decrement = () => {
    if (min === undefined || value > min) {
      onChange(value - 1);
    }
  };

  return (
    <div className={cn(label ? "space-y-2" : "", className)}>
      {label && <label className="section-label">{label}</label>}
      <div className={cn(
        "flex items-center gap-0.5 bg-zinc-950/50 border border-white/5 rounded-xl group hover:border-primary/30 transition-all w-fit shrink-0",
        compact ? "p-0.5" : "p-1"
      )}>
        <button
          type="button"
          onClick={decrement}
          className={cn(
            "hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all active:scale-90",
            compact ? "p-1" : "p-2"
          )}
        >
          <Minus className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
        </button>
        
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) onChange(val);
          }}
          className={cn(
            "bg-transparent text-center font-black text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            compact ? "w-7 text-xs" : "w-10 text-lg"
          )}
        />

        <button
          type="button"
          onClick={increment}
          className={cn(
            "hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all active:scale-90",
            compact ? "p-1" : "p-2"
          )}
        >
          <Plus className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
        </button>
      </div>
    </div>
  );
}
