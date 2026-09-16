import { Info } from "lucide-react";
import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [align, setAlign] = useState<"left" | "right" | "center">("center");
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      
      // Tooltip is 256px wide
      const tooltipWidth = 256;
      const halfWidth = tooltipWidth / 2;
      
      // Calculate preferred center position
      const centerX = rect.left + rect.width / 2;
      
      let newAlign: "left" | "right" | "center" = "center";
      let left = centerX;

      if (centerX < halfWidth + 16) {
        newAlign = "left";
        left = rect.left;
      } else if (centerX > screenWidth - halfWidth - 16) {
        newAlign = "right";
        left = rect.right;
      }

      setAlign(newAlign);
      setCoords({ 
        top: rect.top + window.scrollY, 
        left: left + window.scrollX,
        width: rect.width 
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  return (
    <div 
      ref={triggerRef} 
      className="group/tooltip relative inline-block ml-1 cursor-help align-middle"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Info className="w-3.5 h-3.5 text-zinc-500 hover:text-primary transition-colors" />
      
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ 
              position: "absolute",
              top: coords.top - 12, // Offset above the icon
              left: coords.left,
              zIndex: 9999,
              pointerEvents: "none"
            }}
            className={cn(
              "px-4 py-3 bg-zinc-900/98 backdrop-blur-xl border border-white/10 text-[11px] text-zinc-100 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-64 font-medium leading-relaxed tracking-wide ring-1 ring-white/5",
              align === "center" && "-translate-x-1/2 -translate-y-full",
              align === "left" && "translate-x-0 -translate-y-full",
              align === "right" && "-translate-x-full -translate-y-full"
            )}
          >
            <div className="relative">
              {text}
              {/* Arrow */}
              <div className={cn(
                "absolute top-[calc(100%+12px)] w-2.5 h-2.5 bg-zinc-900 border-r border-b border-white/10 rotate-45",
                align === "center" && "left-1/2 -translate-x-1/2",
                align === "left" && "left-2",
                align === "right" && "right-2"
              )} />
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
