export type JobErrorCode = "OWNER_SCOPE_DENIED" | "SESSION_ALREADY_ENGAGED" | "SESSION_NOT_FOUND";

export class JobContractError extends Error {
  constructor(
    public readonly status: 403 | 404 | 409,
    public readonly code: JobErrorCode,
    message: string
  ) {
    super(message);
    this.name = "JobContractError";
  }
}
