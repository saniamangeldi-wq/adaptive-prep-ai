import { LIMITS, type ApiError } from "@ielts/contract.ts";

/** An ApiError plus the HTTP status and a flag for failures that never reached the server. */
export class IeltsApiError extends Error implements ApiError {
  error: string;
  code?: ApiError["code"];
  status: number;
  /** True when the request failed before getting any response (offline, DNS, timeout). */
  network: boolean;

  constructor(init: { error: string; code?: ApiError["code"]; status?: number; network?: boolean }) {
    super(init.error);
    this.name = "IeltsApiError";
    this.error = init.error;
    this.code = init.code;
    this.status = init.status ?? 0;
    this.network = init.network ?? false;
  }
}

const KNOWN_CODES: ReadonlyArray<NonNullable<ApiError["code"]>> = [
  "unauthorized",
  "bad_request",
  "too_short",
  "too_long",
  "no_credits",
  "rate_limited",
  "grader_invalid_output",
  "upstream_error",
  "not_found",
];

function codeFromStatus(status: number): ApiError["code"] {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 402) return "no_credits";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 400 && status < 500) return "bad_request";
  return "upstream_error";
}

/** Turn a non-2xx response (status plus whatever JSON came back) into one IeltsApiError. */
export function errorFromResponse(status: number, body: unknown): IeltsApiError {
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code =
    typeof obj.code === "string" && (KNOWN_CODES as readonly string[]).includes(obj.code)
      ? (obj.code as ApiError["code"])
      : codeFromStatus(status);
  const message = typeof obj.error === "string" && obj.error ? obj.error : `Request failed (${status})`;
  return new IeltsApiError({ error: message, code, status });
}

export function networkError(message = "Could not reach the server."): IeltsApiError {
  return new IeltsApiError({ error: message, code: "upstream_error", status: 0, network: true });
}

/** Normalise anything thrown into an IeltsApiError. */
export function toApiError(e: unknown): IeltsApiError {
  if (e instanceof IeltsApiError) return e;
  const name = (e as { name?: string })?.name;
  if (name === "AbortError") return networkError("The request took too long.");
  if (e instanceof TypeError) return networkError();
  const message = e instanceof Error && e.message ? e.message : "Something went wrong.";
  return new IeltsApiError({ error: message, code: "upstream_error", status: 0 });
}

export type ApiAction = "grade" | "task" | "draft";

/** Plain-English message for the student. */
export function describeApiError(e: unknown, action: ApiAction = "draft"): string {
  const err = toApiError(e);
  if (err.network) {
    return action === "grade"
      ? "We could not reach the server. Check your connection and try again. Your text is saved on this device."
      : "We could not reach the server. Check your connection and try again.";
  }
  switch (err.code) {
    case "no_credits":
      return "You don't have enough credits for this right now. Try again later.";
    case "too_short":
      return "Your answer is too short to grade. Write a little more and try again.";
    case "too_long":
      // The same code is used for a chart image or description that is too large: the server says which.
      if (/image|description/i.test(err.error)) return err.error;
      return `Your answer is over ${LIMITS.maxScriptWords} words. Shorten it and try again.`;
    case "rate_limited":
      return "You are going a bit fast. Wait a minute and try again.";
    case "grader_invalid_output":
      return "We couldn't grade this one. You weren't charged for it. Try again.";
    case "unauthorized":
      return "Your session has expired. Sign in again.";
    case "not_found":
      if (action === "grade") return "This question is no longer in our set, so it cannot be graded. Copy your answer, then start it again with \"Use my own question\".";
      return action === "draft" ? "We could not find that draft." : "We could not find that.";
    case "upstream_error":
      return action === "grade"
        ? "The grading service is having trouble. Try again in a moment."
        : "The service is having trouble. Try again in a moment.";
    default:
      return err.error || "Something went wrong. Try again.";
  }
}
