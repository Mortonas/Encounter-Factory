const OPERATOR_TOKEN_KEY = "encounter_factory_operator_token";
export const OPERATOR_AUTH_CLEARED_EVENT = "encounter-factory:operator-auth-cleared";

export function getOperatorToken(): string | null {
  return sessionStorage.getItem(OPERATOR_TOKEN_KEY);
}

export function setOperatorToken(token: string): void {
  sessionStorage.setItem(OPERATOR_TOKEN_KEY, token);
}

export function clearOperatorToken(): void {
  sessionStorage.removeItem(OPERATOR_TOKEN_KEY);
  window.dispatchEvent(new Event(OPERATOR_AUTH_CLEARED_EVENT));
}

export function getOperatorAuthHeaders(): Record<string, string> {
  const token = getOperatorToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getOperatorJsonHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...getOperatorAuthHeaders() };
}

export async function operatorFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(input, {
    ...init,
    headers: { ...(init.headers ?? {}), ...getOperatorAuthHeaders() }
  });
  if (response.status === 401) clearOperatorToken();
  return response;
}
