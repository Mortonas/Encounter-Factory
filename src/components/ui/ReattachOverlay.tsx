import { motion, AnimatePresence } from "motion/react";
import { Zap, Loader2 } from "lucide-react";

interface ReattachOverlayProps {
  isVisible: boolean;
}

/**
 * ReattachOverlay
 * 
 * A premium-styled toast overlay that appears when the app auto-reattaches to a running job.
 * Follows the "Hybrid Prestige" aesthetic with Glassmorphism and vibrant accents.
 */
export function ReattachOverlay({ isVisible }: ReattachOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full bg-violet-600/90 text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] border border-violet-400/30 backdrop-blur-md"
        >
          <Zap className="h-4 w-4 fill-amber-400 text-amber-400 animate-pulse" />
          <span className="text-sm font-bold tracking-tight">Re-attaching to active session...</span>
          <Loader2 className="h-4 w-4 animate-spin text-white/60" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
