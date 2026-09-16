import { useState, useCallback, useMemo } from "react";
import { getOperatorJsonHeaders, operatorFetch } from "../utils/operatorAuth";

type EncounterExportSource = string | null | {
  jobId?: string | null;
  sessionId?: string | null;
};

function resolveExportSource(source: EncounterExportSource) {
  if (typeof source === "string" || source === null) {
    return { jobId: source, sessionId: null };
  }

  return {
    jobId: source.jobId || null,
    sessionId: source.sessionId || null
  };
}

/**
 * useEncounterExport
 * 
 * Manages the side-effect heavy export operations for the Encounter Factory.
 * Memoizes handlers to prevent unnecessary re-renders in the EncounterManifest.
 */
export function useEncounterExport(source: EncounterExportSource) {
  const { jobId, sessionId } = resolveExportSource(source);
  const [isExportingVtt, setIsExportingVtt] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [isExportingObsidian, setIsExportingObsidian] = useState(false);
  const [exportError, setExportError] = useState(false);

  const handleExportVtt = useCallback(async () => {
    if ((!jobId && !sessionId) || isExportingVtt) return;
    setIsExportingVtt(true);
    setExportError(false);
    try {
      const exportId = sessionId || jobId!;
      const endpoint = sessionId ? `/api/sessions/${sessionId}/export/vtt` : `/api/export-vtt/${jobId}`;
      const response = await operatorFetch(endpoint);
      if (!response.ok) throw new Error("VTT export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `Encounter-VTT-${exportId}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("[Export] VTT failed:", err);
      setExportError(true);
      setTimeout(() => setExportError(false), 5000);
    } finally {
      setIsExportingVtt(false);
    }
  }, [jobId, sessionId, isExportingVtt]);

  const handleExportHtml = useCallback(async () => {
    if (!jobId || isExportingHtml) return;
    setIsExportingHtml(true);
    setExportError(false);
    try {
      if (!sessionId) throw new Error("HTML export requires a linked session");
      const response = await operatorFetch("/api/export-html", {
        method: "POST",
        headers: getOperatorJsonHeaders(),
        body: JSON.stringify({ jobId, sessionId })
      });
      if (!response.ok) throw new Error("HTML generation failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Encounter-Grimoire-${jobId}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("[Export] HTML failed:", err);
      setExportError(true);
      setTimeout(() => setExportError(false), 5000);
    } finally {
      setIsExportingHtml(false);
    }
  }, [jobId, sessionId, isExportingHtml]);

  const handleExportObsidian = useCallback(async () => {
    if ((!jobId && !sessionId) || isExportingObsidian) return;
    setIsExportingObsidian(true);
    setExportError(false);
    try {
      const exportId = sessionId || jobId!;
      const endpoint = sessionId ? `/api/sessions/${sessionId}/export/obsidian` : `/api/export-obsidian/${jobId}`;
      const response = await operatorFetch(endpoint);
      if (!response.ok) throw new Error("Obsidian export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `Encounter-Obsidian-${exportId}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("[Export] Obsidian failed:", err);
      setExportError(true);
      setTimeout(() => setExportError(false), 5000);
    } finally {
      setIsExportingObsidian(false);
    }
  }, [jobId, sessionId, isExportingObsidian]);

  return useMemo(() => ({
    isExportingVtt,
    isExportingHtml,
    isExportingObsidian,
    exportError,
    handleExportVtt,
    handleExportHtml,
    handleExportObsidian
  }), [
    isExportingVtt,
    isExportingHtml,
    isExportingObsidian,
    exportError,
    handleExportVtt,
    handleExportHtml,
    handleExportObsidian
  ]);
}
