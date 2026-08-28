const SEED_PATTERN = /\bs[Ed][1-9A-HJ-NP-Za-km-z]{20,}\b/g;
const FAMILY_SEED_PATTERN = /\bs[a-zA-Z0-9]{25,}\b/g;

export function redact(value: string): string {
  return value
    .replace(SEED_PATTERN, "[REDACTED_SEED]")
    .replace(FAMILY_SEED_PATTERN, "[REDACTED_SEED]");
}

export function log(...parts: unknown[]): void {
  const text = parts
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
    .join(" ");
  console.log(redact(text));
}

export function logError(...parts: unknown[]): void {
  const text = parts
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
    .join(" ");
  console.error(redact(text));
}

export class BlockedError extends Error {
  readonly code = "BLOCKED" as const;
  constructor(message: string) {
    super(message);
    this.name = "BlockedError";
  }
}
