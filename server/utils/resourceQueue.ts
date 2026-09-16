/**
 * ResourceQueue Utility
 * 
 * Provides a mechanism to serialize asynchronous operations (like file writes) 
 * targeting the same resource identifier (e.g., a jobId). This prevents race 
 * conditions and write-after-write hazards in high-frequency update scenarios.
 */
export class ResourceQueue {
  private queues = new Map<string, Promise<any>>();

  /**
   * Enqueues an operation for a specific resource key.
   * Ensures that the operation only starts after the previous operation for that key completes.
   * 
   * @param key The unique identifier for the resource (e.g., jobId).
   * @param operation A function that returns a Promise for the task to be performed.
   * @returns A Promise that resolves with the result of the operation.
   */
  async enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) || Promise.resolve();
    
    // Chain the next operation
    const current = (async () => {
      // Wait for the previous operation to finish (ignoring its outcome)
      await previous.catch(() => {}); 
      return await operation();
    })();

    this.queues.set(key, current);

    // Cleanup: Remove the promise from the map when finished, 
    // but only if no other operations were queued in the meantime.
    current.finally(() => {
      if (this.queues.get(key) === current) {
        this.queues.delete(key);
      }
    });

    return current;
  }
}
