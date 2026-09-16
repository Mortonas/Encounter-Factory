import { useCallback, useEffect, useState } from "react";
import type { QueuedSession } from "../types";
import { operatorFetch } from "../utils/operatorAuth";

export function useCompletedArchive() {
  const [items, setItems] = useState<QueuedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<QueuedSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArchive = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await operatorFetch("/api/sessions?status=completed,archived");
      if (!response.ok) {
        throw new Error("Failed to load completed-session archive.");
      }
      setItems(await response.json());
    } catch (err: any) {
      setError(err.message || "Failed to load completed-session archive.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSessionDetail = useCallback(async (id: string) => {
    setIsDetailLoading(true);
    setError(null);
    try {
      const response = await operatorFetch(`/api/sessions/${id}`);
      if (!response.ok) {
        throw new Error("Failed to load archived session detail.");
      }
      const session = await response.json();
      setSelectedSession(session);
      return session as QueuedSession;
    } catch (err: any) {
      setError(err.message || "Failed to load archived session detail.");
      return null;
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  return {
    items,
    selectedSession,
    isLoading,
    isDetailLoading,
    error,
    fetchArchive,
    fetchSessionDetail,
    setSelectedSession
  };
}
