export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function apiErrorResponse(error: ApiError) {
  return Response.json({ error: error.message }, { status: error.status });
}
