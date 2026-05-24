export interface ApiError {
  error: string;
  code: string;
  statusCode: number;
  details?: Record<string, string[]>;
}

export function createErrorResponse(
  error: string,
  code: string,
  statusCode: number,
  details?: Record<string, string[]>,
): ApiError {
  return { error, code, statusCode, ...(details ? { details } : {}) };
}
