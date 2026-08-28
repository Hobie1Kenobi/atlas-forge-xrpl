import { saveEvidence } from "../src/evidence.ts";
import { loadEvidence } from "../src/evidence.ts";
import { config } from "../src/config.ts";
import { log, logError, BlockedError } from "../src/log.ts";
import { assertUsableProbe, probeNetwork } from "../src/network.ts";
import { writeReport } from "../src/report.ts";

async function main(): Promise<void> {
  const evidence = await loadEvidence();
  const probe = await probeNetwork();
  assertUsableProbe(probe);
  evidence.network = {
    name: config.network,
    wss: probe.wss,
    rpc: probe.rpc,
    explorer: config.explorer,
    build_version: probe.build_version,
    network_id: probe.network_id,
    server_state: probe.server_state,
    validated_ledger: probe.validated_ledger,
    complete_ledgers: probe.complete_ledgers,
    probed_at: new Date().toISOString(),
  };
  evidence.amendments = {
    enabled: probe.enabled,
    disabled: probe.disabled,
    used: probe.used,
    refused: probe.refused,
  };
  evidence.token.classic_currency = config.tokenCurrency;
  evidence.token.public_name = config.tokenName;
  await saveEvidence(evidence);
  await writeReport(evidence);
  log("xrpld build_version", probe.build_version);
  log("network_id", String(probe.network_id));
  log("server_state", probe.server_state);
  log("validated_ledger", String(probe.validated_ledger));
  log("complete_ledgers", probe.complete_ledgers);
  log("enabled_amendments", String(probe.enabled.length));
  log("used", probe.used.join(","));
  log("refused", probe.refused.join(","));
  if (probe.missing_used.length > 0) {
    log("missing_used", probe.missing_used.join(","));
  }
}

main().catch(async (error) => {
  logError(error instanceof Error ? error.message : String(error));
  const evidence = await loadEvidence();
  if (error instanceof BlockedError) {
    evidence.status = "BLOCKED";
    evidence.blocked_error = error.message;
    await saveEvidence(evidence);
    await writeReport(evidence);
    process.exit(2);
  }
  process.exit(1);
});
