/**
 * Identity Utility
 * Manages the persistent clientId for anonymous session recovery.
 */

const CLIENT_ID_KEY = "encounter_factory_client_id";

export function getClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  
  return clientId;
}
