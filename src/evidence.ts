import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { emptyEvidence, type Evidence, type TxRecord } from "./evidence-types.ts";
import { log } from "./log.ts";

export const EVIDENCE_PATH = resolve(process.cwd(), "deployments/testnet.json");
export const EXAMPLE_PATH = resolve(
  process.cwd(),
  "deployments/testnet.example.json",
);

export async function loadEvidence(): Promise<Evidence> {
  try {
    const raw = await readFile(EVIDENCE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Evidence;
    return { ...emptyEvidence(), ...parsed };
  } catch {
    return emptyEvidence();
  }
}

export async function saveEvidence(evidence: Evidence): Promise<void> {
  await mkdir(dirname(EVIDENCE_PATH), { recursive: true });
  const body = `${JSON.stringify(evidence, null, 2)}\n`;
  await writeFile(EVIDENCE_PATH, body, "utf8");
}

export async function recordHappy(
  evidence: Evidence,
  key: string,
  record: TxRecord,
): Promise<Evidence> {
  evidence.happy_path[key] = record;
  await saveEvidence(evidence);
  log("happy", key, record.result, record.hash);
  return evidence;
}

export async function recordDeny(
  evidence: Evidence,
  key: string,
  record: TxRecord,
): Promise<Evidence> {
  evidence.deny_path[key] = record;
  await saveEvidence(evidence);
  log("deny", key, record.result, record.hash);
  return evidence;
}

export function hasHappy(evidence: Evidence, key: string): boolean {
  const row = evidence.happy_path[key];
  return row !== undefined && row.hash.length > 0 && row.result === "tesSUCCESS";
}

export function hasDeny(evidence: Evidence, key: string): boolean {
  const row = evidence.deny_path[key];
  return row !== undefined && row.hash.length > 0 && row.result !== "tesSUCCESS";
}
