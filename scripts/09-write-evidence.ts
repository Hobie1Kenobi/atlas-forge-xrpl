import { loadEvidence, saveEvidence } from "../src/evidence.ts";
import { log, logError } from "../src/log.ts";
import { computeStatus, writeReport } from "../src/report.ts";

async function main(): Promise<void> {
  const evidence = await loadEvidence();
  evidence.status = computeStatus(evidence);
  await saveEvidence(evidence);
  await writeReport(evidence);
  log("evidence status", evidence.status);
  log("happy hashes", String(Object.keys(evidence.happy_path).length));
  log("deny hashes", String(Object.keys(evidence.deny_path).length));
  if (evidence.blocked_error) {
    log("blocked_error", evidence.blocked_error);
  }
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
