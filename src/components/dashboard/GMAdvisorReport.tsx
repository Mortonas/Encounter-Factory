import { motion } from "motion/react";
import { 
  X, 
  Printer, 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  Shield, 
  Compass, 
  BookOpen, 
  Sparkles,
  AlertTriangle,
  Users
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { GMAdviceReport } from "../../types";

interface GMAdvisorReportProps {
  report: GMAdviceReport;
  onClose: () => void;
  startLevel: number;
}

export function GMAdvisorReport({ report, onClose, startLevel }: GMAdvisorReportProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto no-print"
    >
      {/* Surgical Print Style Injector */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-report-container, .print-report-container * {
            visibility: visible;
          }
          .print-report-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background-color: #fcfaf2 !important;
            background: #fcfaf2 !important;
            color: #1a1a1a !important;
            font-family: 'EB Garamond', serif !important;
            box-shadow: none !important;
            border: none !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-badge {
            border: 1px solid #000 !important;
            color: #000 !important;
            background: transparent !important;
          }
          .print-page-break {
            page-break-after: always;
          }
          
          /* Hard-override backgrounds & box-shadows for high-prestige print, preserving key telemetry/alert fills */
          .print-report-container div:not(.bg-emerald-500):not(.bg-zinc-950\/60):not(.bg-rose-500\/5):not(.bg-amber-500\/5):not(.bg-violet-500\/5):not(.bg-zinc-950\/40):not(.bg-zinc-900\/20):not(.bg-zinc-900\/30):not(.print-badge),
          .print-report-container table,
          .print-report-container section,
          .print-report-container tr,
          .print-report-container td,
          .print-report-container th {
            background-color: transparent !important;
            background: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          
          /* Preserve progress bars background/fill and alert/box tints */
          .print-report-container .bg-emerald-500 {
            background-color: #10b981 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .print-report-container .bg-zinc-950\/60 {
            background-color: #e4e4e7 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .print-report-container .bg-rose-500\/5 {
            background-color: #fef2f2 !important;
            border: 1px solid #fca5a5 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .print-report-container .bg-amber-500\/5 {
            background-color: #fffbeb !important;
            border: 1px solid #fcd34d !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .print-report-container .bg-violet-500\/5,
          .print-report-container .bg-violet-500\/10 {
            background-color: #f5f3ff !important;
            border: 1px solid #ddd6fe !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .print-report-container .bg-zinc-950\/40,
          .print-report-container .bg-zinc-900\/20,
          .print-report-container .bg-zinc-900\/30 {
            background-color: #fbfaf7 !important;
            border: 1px solid #e4e4e7 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          
          /* Enforce high-contrast dark borders for print */
          .print-report-container div,
          .print-report-container table,
          .print-report-container section,
          .print-report-container tr,
          .print-report-container td,
          .print-report-container th {
            border-color: #d4d4d8 !important;
          }
          
          /* Sans-serif typography for tables, data cells, badges, and labels to ensure scannability */
          .print-report-container th,
          .print-report-container td,
          .print-report-container table,
          .print-report-container .font-mono,
          .print-report-container .font-sans,
          .print-report-container .font-display,
          .print-badge,
          .print-report-container strong {
            font-family: "Geist", "Outfit", "Inter", sans-serif !important;
          }
          
          /* Semantic text colors in print (Dark High-Contrast) */
          .print-report-container p,
          .print-report-container span,
          .print-report-container li,
          .print-report-container td,
          .print-report-container th,
          .print-report-container h1,
          .print-report-container h2,
          .print-report-container h3,
          .print-report-container h4,
          .print-report-container h5,
          .print-report-container h6,
          .print-report-container strong {
            color: #18181b !important;
          }
          .print-report-container .text-rose-500,
          .print-report-container .text-rose-400,
          .print-report-container .text-rose-300,
          .print-report-container .text-rose-700 {
            color: #991b1b !important;
          }
          .print-report-container .text-emerald-500,
          .print-report-container .text-emerald-400,
          .print-report-container .text-emerald-700 {
            color: #065f46 !important;
          }
          .print-report-container .text-violet-500,
          .print-report-container .text-violet-400,
          .print-report-container .text-violet-300,
          .print-report-container .text-violet-800 {
            color: #4c1d95 !important;
          }
          .print-report-container .text-amber-500,
          .print-report-container .text-amber-400,
          .print-report-container .text-amber-700 {
            color: #92400e !important;
          }
        }
      `}</style>

      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-5xl bg-zinc-950/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] glass-premium print-report-container"
      >
        {/* Header (Hidden in Print) */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/40 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/20 text-violet-400 rounded-xl border border-violet-500/30 shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter italic text-white flex items-center gap-2">
                GM Tactical Advice Report
              </h2>
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1">
                Avoiding Novas • Balancing Pacing • Level {startLevel} Sandbox
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-xs font-black uppercase tracking-wider rounded-xl transition-all text-zinc-300"
            >
              <Printer className="w-4 h-4 text-violet-400" />
              Print / Export PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/20 rounded-xl transition-all text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 print-report-container">
          
          {/* Print-Only Header Sheet */}
          <div className="hidden print:block text-center border-b-2 border-zinc-900 pb-6 mb-8">
            <h1 className="text-3xl font-serif font-black tracking-tight text-zinc-900">
              GM TACTICAL ADVICE GRIMOIRE
            </h1>
            <p className="text-sm font-sans uppercase font-bold tracking-widest text-zinc-600 mt-2">
              Level {startLevel} Campaign Balance Reference
            </p>
            <div className="mt-4 text-xs font-sans text-zinc-500 flex justify-center gap-6">
              <span><strong>Difficulty Target:</strong> Hard / Medium</span>
              <span><strong>System Target:</strong> D&D 5.5e (2024 Revision)</span>
              <span><strong>Party Size:</strong> {report.player_specific_ledger.length} PCs</span>
            </div>
          </div>

          {/* 1. Executive Summary & Tactical Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Vulnerability Profile */}
            <div className="space-y-6">
              {report.chain_of_thought_scratchpad && (
                <div className="p-5 rounded-xl border border-white/5 bg-zinc-900/20 glass no-print">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-zinc-400" />
                    Designer's Analytical Scratchpad
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono leading-relaxed whitespace-pre-line">
                    {report.chain_of_thought_scratchpad}
                  </p>
                </div>
              )}

              <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/30 glass space-y-4 hover:border-violet-500/25 transition-all print:border-zinc-300 print:bg-white">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 print:border-zinc-200">
                  <ShieldAlert className="w-5 h-5 text-rose-400 print:text-rose-700" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white print:text-zinc-900">
                    Collective Weaknesses
                  </h3>
                </div>
                <ul className="space-y-2">
                  {report.party_vulnerability_profile.collective_weaknesses.map((weakness, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-2 print:text-zinc-800">
                      <span className="text-rose-500 mt-0.5">•</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/30 glass space-y-4 hover:border-amber-500/25 transition-all print:border-zinc-300 print:bg-white">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 print:border-zinc-200">
                  <Zap className="w-5 h-5 text-amber-400 print:text-amber-700" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white print:text-zinc-900">
                    Nova Ceiling Outlook
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-800">
                  {report.party_vulnerability_profile.nova_ceiling_outlook}
                </p>
              </div>
            </div>

            {/* Right Column: Tactical Combat Breakdown */}
            <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/30 glass space-y-4 hover:border-violet-500/25 transition-all print:border-zinc-300 print:bg-white">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 print:border-zinc-200">
                <Users className="w-5 h-5 text-violet-400 print:text-zinc-900" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white print:text-zinc-900">
                  Tactical Combat Breakdown
                </h3>
              </div>
              <div className="space-y-4">
                {report.tactical_combat_breakdown.role_assignments.map((role, idx) => (
                  <div key={idx} className="p-3 bg-zinc-950/40 rounded-lg border border-white/5 print:border-zinc-200 print:bg-zinc-50">
                    <span className="text-xs font-bold text-white print:text-zinc-900">
                      {role.role_label} ({role.pc_names.join(", ")})
                    </span>
                    <ul className="mt-2 space-y-1">
                      {role.pressure_tactics.map((tactic, tIdx) => (
                        <li key={tIdx} className="text-[11px] text-zinc-400 flex items-start gap-1.5 print:text-zinc-700">
                          <span className="text-violet-500">•</span>
                          <span>{tactic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-violet-500/5 rounded-lg border border-violet-500/10 print:border-zinc-200 print:bg-zinc-50 mt-4">
                <h5 className="text-[9px] uppercase font-black tracking-widest text-violet-400 mb-1 print:text-zinc-900">
                  Action Economy Verdict
                </h5>
                <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-700">
                  {report.tactical_combat_breakdown.action_economy_verdict}
                </p>
              </div>
            </div>

          </div>

          <div className="print-page-break" />

          {/* 2. Pacing Sandbox Level Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 print:border-zinc-900">
              <h3 className="text-lg font-black uppercase tracking-wider text-white print:text-zinc-900">
                Pacing Sandbox (Level {report.pacing_sandbox.level})
              </h3>
            </div>

            {/* Sandbox Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/40 text-center flex flex-col justify-center print:border-zinc-300 print:bg-white">
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">
                  Target Level
                </span>
                <span className="text-3xl font-black text-white italic tracking-tighter leading-none print:text-zinc-900">
                  Lvl {report.pacing_sandbox.level}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-zinc-950/40 text-center flex flex-col justify-center print:border-zinc-300 print:bg-white">
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">
                  Estimated Party DPR
                </span>
                <span className="text-xl font-mono font-black text-emerald-400 leading-none print:text-emerald-700">
                  {report.pacing_sandbox.dpr_bounds.min} - {report.pacing_sandbox.dpr_bounds.max}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-white/10 bg-zinc-900/40 text-center flex flex-col justify-center border-l-violet-500/40 hover:border-l-violet-500 transition-all print:border-zinc-300 print:bg-white">
                <span className="text-[10px] uppercase font-bold tracking-widest text-violet-400 font-black mb-1">
                  Anchor HP Floor (2-Rounds)
                </span>
                <span className="text-3xl font-black text-violet-300 italic tracking-tighter leading-none print:text-zinc-900">
                  {report.pacing_sandbox.anchor_hp_floor} HP
                </span>
              </div>
            </div>

            {/* Enemy Tactical Counters */}
            {report.pacing_sandbox.enemy_tactical_counters && report.pacing_sandbox.enemy_tactical_counters.length > 0 && (
              <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/20 glass space-y-4 print:border-zinc-300 print:bg-white print:break-inside-avoid">
                <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2 flex items-center gap-1.5 print:text-zinc-900">
                  <ShieldAlert className="w-4 h-4 text-violet-400 print:text-zinc-800" />
                  Enemy Tactical Counters
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-400 print:text-zinc-800">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] uppercase font-bold tracking-widest text-zinc-500 print:border-zinc-300">
                        <th className="py-2">Counter Type</th>
                        <th className="py-2">Mechanic Description (2024 D&D Rules Only)</th>
                        <th className="py-2 text-right">Targeted Players</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-zinc-200">
                      {report.pacing_sandbox.enemy_tactical_counters.map((counter, cIdx) => (
                        <tr key={cIdx} className="hover:bg-white/5 transition-colors print:hover:bg-transparent">
                          <td className="py-3 font-bold text-violet-300 print:text-zinc-900">{counter.type}</td>
                          <td className="py-3 text-zinc-300 print:text-zinc-800 pr-4 whitespace-pre-line">{counter.mechanic_description}</td>
                          <td className="py-3 text-right font-bold text-white print:text-zinc-950 whitespace-normal break-words max-w-[150px]">
                            {counter.targeted_players.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tactical Guidelines & Environmental Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:break-inside-avoid">
              <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/30 glass hover:border-emerald-500/25 transition-all print:border-zinc-300 print:bg-white">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5 print:text-emerald-700">
                  <TrendingUp className="w-4 h-4" />
                  Tactical Guidelines
                </h4>
                <ul className="space-y-2">
                  {report.pacing_sandbox.tactical_guidelines.map((guide, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-2 print:text-zinc-800">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{guide}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 rounded-xl border border-white/10 bg-zinc-900/30 glass hover:border-violet-500/25 transition-all print:border-zinc-300 print:bg-white">
                <h4 className="text-xs font-black uppercase tracking-wider text-violet-400 mb-3 flex items-center gap-1.5 print:text-violet-800">
                  <Shield className="w-4 h-4" />
                  Environmental Recommendations
                </h4>
                <ul className="space-y-2">
                  {report.pacing_sandbox.environmental_recommendations.map((env, i) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-2 print:text-zinc-800">
                      <span className="text-violet-500 mt-0.5">•</span>
                      <span>{env}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Budget Allocations */}
            <div className="space-y-4 print:break-inside-avoid">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 print:text-zinc-900">
                Dynamic Budget Allocations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {report.pacing_sandbox.budget_allocations.map((alloc, idx) => (
                  <div key={idx} className="p-5 rounded-xl border border-white/10 bg-zinc-900/20 glass flex flex-col justify-between print:border-zinc-300 print:bg-white">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-white print:text-zinc-900">
                          {alloc.archetype_name}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {alloc.allocation_bar_visual}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mb-4 print:text-zinc-700 leading-relaxed whitespace-pre-line">
                        {alloc.description}
                      </p>
                    </div>
                    <div className="space-y-2 pt-3 border-t border-white/5 print:border-zinc-200">
                      {alloc.segment_breakdown.map((seg, sIdx) => (
                        <div key={sIdx} className="text-[10px] text-zinc-300 print:text-zinc-850">
                          <strong>{seg.role} ({seg.percentage}%):</strong>
                          <div className="text-[11px] text-zinc-400 print:text-zinc-700 font-mono mt-0.5">
                            {seg.translation_stat_block}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="print-page-break" />

          {/* 3. Player-Specific Design Ledger */}
          <div className="space-y-6">
            <h3 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/10 pb-4 print:border-zinc-900 print:text-zinc-900">
              Player-Specific Design Ledger
            </h3>
            <div className="space-y-6">
              {report.player_specific_ledger.map((player, pIdx) => (
                <div 
                  key={player.pc_name} 
                  className="p-6 md:p-8 rounded-xl border border-white/10 bg-zinc-900/20 glass space-y-6 hover:border-violet-500/20 transition-all print:border-zinc-300 print:bg-white print:break-inside-avoid"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 gap-2 print:border-zinc-200">
                    <div>
                      <h3 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none print:text-zinc-900">
                        {player.pc_name}
                      </h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-violet-400 mt-1">
                        {player.class_subclass}
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/25 text-[10px] font-mono rounded-full text-violet-300 w-fit print-badge">
                      PC {pIdx + 1}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">
                          Tactical Interaction Guidance
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-800 whitespace-pre-line">
                          {player.key_feature_interaction}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 print:border-zinc-300 print:bg-zinc-50">
                        <h4 className="text-[10px] uppercase font-black tracking-wider text-rose-400 mb-1 flex items-center gap-1.5 print:text-rose-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Primary Weakness Gap
                        </h4>
                        <p className="text-xs text-zinc-400 print:text-zinc-800 whitespace-pre-line">
                          {player.biggest_weakness}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1">
                          Current Magic Items Impact
                        </h4>
                        <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-800 whitespace-pre-line">
                          {player.current_item_impact}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5 print:border-zinc-200">
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5 print:text-emerald-700">
                        <Sparkles className="w-4 h-4" />
                        Recommended Magic Items
                      </h4>
                      <div className="space-y-3">
                        {player.magic_item_prescriptions.map((item, i) => (
                          <div key={i} className="p-3 bg-zinc-950/40 rounded-lg border border-white/5 print:border-zinc-200 print:bg-zinc-50">
                            <span className="text-xs font-bold text-white print:text-zinc-900">
                              {item.item_name}
                            </span>
                            <p className="text-[11px] text-zinc-400 mt-1 print:text-zinc-700 whitespace-pre-line">
                              {item.benefit}
                            </p>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600 block mt-1.5">
                              Ref: {item.rule_reference}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5 print:text-rose-700">
                        <AlertTriangle className="w-4 h-4" />
                        Items to Avoid / Restrict
                      </h4>
                      <div className="space-y-3">
                        {player.items_to_avoid.map((item, i) => (
                          <div key={i} className="p-3 bg-zinc-950/40 rounded-lg border border-white/5 print:border-zinc-200 print:bg-zinc-50">
                            <span className="text-xs font-bold text-rose-300 print:text-rose-700">
                              {item.item_name}
                            </span>
                            <p className="text-[11px] text-zinc-400 mt-1 print:text-zinc-700 whitespace-pre-line">
                              {item.warning}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          <div className="print-page-break" />

          {/* 4. Engine & Telemetry Tables */}
          <div className="space-y-6">
            <h3 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/10 pb-4 print:border-zinc-900 print:text-zinc-900">
              Engine & Telemetry
            </h3>
            
            <TelemetryOverview report={report} />
            <MechanicalThresholdMapTable report={report} />
            <NovaRecoilEngineTable report={report} />
            <RestEconomyThrottleChartTable report={report} />
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── TELEMETRY VIEW SUB-COMPONENTS ──────────────────────────────────────────

function TelemetryOverview({ report }: { report: GMAdviceReport }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-6 print:break-inside-avoid">
      <section className="p-6 rounded-xl border border-white/10 bg-zinc-900/30 glass hover:border-violet-500/25 transition-all print:border-zinc-300 print:bg-white">
        <h4 className="text-xs font-black uppercase tracking-wider text-violet-400 mb-4 flex items-center gap-1.5 print:text-violet-850">
          <Compass className="w-4 h-4" />
          Rest Economy & Threat Windows
        </h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950/40 rounded-lg border border-white/5 print:border-zinc-200">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">
                Encounters to Short Rest
              </span>
              <span className="text-2xl font-mono font-black text-violet-300 print:text-zinc-900">
                {report.threat_windows.encounters_before_short_rest}
              </span>
            </div>
            <div className="p-4 bg-zinc-950/40 rounded-lg border border-white/5 print:border-zinc-200">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">
                Encounters to Long Rest
              </span>
              <span className="text-2xl font-mono font-black text-violet-300 print:text-zinc-900">
                {report.threat_windows.encounters_before_long_rest}
              </span>
            </div>
          </div>
          <div className="p-4 bg-violet-500/5 rounded-lg border border-violet-500/10 print:border-zinc-200 print:bg-zinc-50">
            <h5 className="text-[9px] uppercase font-black tracking-widest text-violet-400 mb-1 print:text-zinc-900">
              Rest-Economy Rationale
            </h5>
            <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-700">
              {report.threat_windows.rest_economy_rationale}
            </p>
          </div>
        </div>
      </section>

      <section className="p-6 rounded-xl border border-white/10 bg-zinc-900/30 glass hover:border-amber-500/25 transition-all print:border-zinc-300 print:bg-white">
        <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-1.5 print:text-amber-850">
          <TrendingUp className="w-4 h-4" />
          Attrition Wave Scales
        </h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950/40 rounded-lg border border-white/5 print:border-zinc-200">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">
                Waves to Long Rest
              </span>
              <span className="text-2xl font-mono font-black text-amber-300 print:text-zinc-900">
                {report.attrition_wave_scales.waves_to_force_long_rest}
              </span>
            </div>
            <div className="p-4 bg-zinc-950/40 rounded-lg border border-white/5 print:border-zinc-200">
              <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">
                Per-Wave HP Budget
              </span>
              <span className="text-2xl font-mono font-black text-amber-300 print:text-zinc-900">
                {report.attrition_wave_scales.wave_hp_budget} HP
              </span>
            </div>
          </div>
          <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/10 print:border-zinc-200 print:bg-zinc-50">
            <h5 className="text-[9px] uppercase font-black tracking-widest text-amber-400 mb-1 print:text-zinc-900">
              High-Tier Ability Drain
            </h5>
            <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-700">
              {report.attrition_wave_scales.ability_drain_threshold_note}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MechanicalThresholdMapTable({ report }: { report: GMAdviceReport }) {
  const row = report.mechanical_threshold;
  return (
    <section className="p-6 rounded-xl border border-white/10 bg-zinc-900/20 glass hover:border-violet-500/10 transition-all print:border-zinc-300 print:bg-white print:break-inside-avoid">
      <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-1.5 print:text-zinc-900">
        <ShieldAlert className="w-4 h-4 text-violet-400" />
        Mechanical Threshold (Offensive Save Thresholds)
      </h4>
      <p className="text-xs text-zinc-500 mb-4 print:text-zinc-600">
        Tracks when party offensive scaling outpaces standard monster saving throw benchmarks.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-400 print:text-zinc-800">
          <thead>
            <tr className="border-b border-white/5 text-[9px] uppercase font-bold tracking-widest text-zinc-500 print:border-zinc-300">
              <th className="py-2">Level</th>
              <th className="py-2">Party Sustained DPR</th>
              <th className="py-2">Dominant CR Tier</th>
              <th className="py-2">Avg Save Bonus</th>
              <th className="py-2">Required DC (50% fail)</th>
              <th className="py-2 text-right">Threshold Crossover</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 print:divide-zinc-200">
            <tr className="hover:bg-white/5 transition-colors print:hover:bg-transparent">
              <td className="py-3 font-bold text-white print:text-zinc-900">Lvl {row.level}</td>
              <td className="py-3 font-mono">{row.party_sustained_dpr} DPR</td>
              <td className="py-3">{row.dominant_cr_tier}</td>
              <td className="py-3 font-mono">+{row.monster_avg_save_bonus}</td>
              <td className="py-3 font-mono font-bold text-violet-300 print:text-zinc-900">DC {row.required_dc_for_50pct}</td>
              <td className="py-3 text-right">
                {row.threshold_crossover ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[9px] font-black uppercase text-rose-300 tracking-wider print:border-zinc-400 print:text-rose-800">
                    ⚠ Crossover
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[9px] font-black uppercase text-zinc-500 tracking-wider print:border-zinc-300 print:text-zinc-650">
                    Standard
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NovaRecoilEngineTable({ report }: { report: GMAdviceReport }) {
  const row = report.nova_recoil_engine;
  return (
    <section className="p-6 rounded-xl border border-white/10 bg-zinc-900/20 glass hover:border-violet-500/10 transition-all print:border-zinc-300 print:bg-white print:break-inside-avoid">
      <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-1.5 print:text-zinc-900">
        <Zap className="w-4 h-4 text-amber-400" />
        Nova-Recoil Engine (Attrition Response)
      </h4>
      <p className="text-xs text-zinc-500 mb-4 print:text-zinc-600">
        Calibrated wave activations based on the party's estimated Round 1 Nova burst ceiling.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-400 print:text-zinc-800">
          <thead>
            <tr className="border-b border-white/5 text-[9px] uppercase font-bold tracking-widest text-zinc-500 print:border-zinc-300">
              <th className="py-2">Level</th>
              <th className="py-2">Secondary Wave HP Trigger</th>
              <th className="py-2">Post-Nova Sustained DPR</th>
              <th className="py-2">Operational Rule</th>
              <th className="py-2 text-right">Resource Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 print:divide-zinc-200">
            <tr className="hover:bg-white/5 transition-colors print:hover:bg-transparent">
              <td className="py-3 font-bold text-white print:text-zinc-900">Lvl {row.level}</td>
              <td className="py-3 font-mono font-bold text-amber-400 print:text-amber-700">{row.nova_threshold} HP</td>
              <td className="py-3 font-mono">{row.post_nova_sustained_dpr} DPR</td>
              <td className="py-3 italic text-zinc-300 print:text-zinc-800">{row.secondary_wave_trigger}</td>
              <td className="py-3 text-right text-[10px] font-medium text-zinc-500 print:text-zinc-600">
                {row.resource_depletion_note}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RestEconomyThrottleChartTable({ report }: { report: GMAdviceReport }) {
  const row = report.rest_economy_throttle;
  return (
    <section className="p-6 rounded-xl border border-white/10 bg-zinc-900/20 glass hover:border-violet-500/10 transition-all print:border-zinc-300 print:bg-white print:break-inside-avoid">
      <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-1.5 print:text-zinc-900">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        Rest-Economy Throttle (Resource Drainage)
      </h4>
      <p className="text-xs text-zinc-500 mb-4 print:text-zinc-600">
        Estimated spell slot and high-value resource drainage rate per challenge room.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-400 print:text-zinc-800">
          <thead>
            <tr className="border-b border-white/5 text-[9px] uppercase font-bold tracking-widest text-zinc-500 print:border-zinc-300">
              <th className="py-2">Level</th>
              <th className="py-2">Slot Drain per Encounter</th>
              <th className="py-2">Encounters to Short Rest</th>
              <th className="py-2 text-right">Encounters to Long Rest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 print:divide-zinc-200">
            <tr className="hover:bg-white/5 transition-colors print:hover:bg-transparent">
              <td className="py-3 font-bold text-white print:text-zinc-900">Lvl {row.level}</td>
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono w-10 text-emerald-400 print:text-emerald-700">{row.slot_drain_per_encounter_pct}%</span>
                  <div className="hidden sm:block w-32 h-2 bg-zinc-950/60 rounded-full overflow-hidden border border-white/5 print:border-zinc-300 print:bg-zinc-200">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${row.slot_drain_per_encounter_pct}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="py-3 font-mono">{row.encounters_to_short_rest} rooms</td>
              <td className="py-3 font-mono text-right">{row.encounters_to_long_rest} rooms</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
