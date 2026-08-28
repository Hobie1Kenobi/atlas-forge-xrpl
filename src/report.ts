import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { whyAfxtCannotBeClassicIso } from "./config.ts";
import { accountUrl, txUrl } from "./explorer.ts";
import type { Evidence, TxRecord } from "./evidence-types.ts";

export const REPORT_PATH = resolve(process.cwd(), "PUBLIC_TESTNET_REPORT.md");

function row(record: TxRecord): string {
  return `| ${record.label} | \`${record.type}\` | \`${record.result}\` | ${record.ledger_index} | [${record.hash}](${txUrl(record.hash)}) |`;
}

function accountLine(role: string, address: string): string {
  if (!address) return `| ${role} | _missing_ |`;
  return `| ${role} | [${address}](${accountUrl(address)}) |`;
}

export function renderReport(evidence: Evidence): string {
  const happy = Object.values(evidence.happy_path);
  const deny = Object.values(evidence.deny_path);
  const denyValidated = deny.filter((r) => r.hash && r.result !== "tesSUCCESS");
  const lines: string[] = [];
  lines.push("# PUBLIC_TESTNET_REPORT");
  lines.push("");
  lines.push(`**Status:** ${evidence.status}`);
  lines.push("");
  lines.push(`**Disclaimer:** ${evidence.disclaimer}`);
  lines.push("");
  lines.push("This is a Testnet rehearsal. It is not an issuance, not a peg, not RLUSD, and not regulated securities infrastructure. Faucet XRP is not TVL or AUM. The issuer can freeze and claw back; that is the product.");
  lines.push("");
  lines.push("## Connected node");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push(`| probed_at | ${evidence.network.probed_at || "_not probed_"} |`);
  lines.push(`| build_version | ${evidence.network.build_version || "_unknown_"} |`);
  lines.push(`| network_id | ${evidence.network.network_id} |`);
  lines.push(`| server_state | ${evidence.network.server_state || "_unknown_"} |`);
  lines.push(`| validated_ledger | ${evidence.network.validated_ledger || "_unknown_"} |`);
  lines.push(`| complete_ledgers | ${evidence.network.complete_ledgers || "_unknown_"} |`);
  lines.push(`| WSS | ${evidence.network.wss} |`);
  lines.push(`| RPC | ${evidence.network.rpc} |`);
  lines.push(`| explorer | ${evidence.network.explorer} |`);
  lines.push("");
  if (evidence.blocked_error) {
    lines.push("## BLOCKED");
    lines.push("");
    lines.push("```");
    lines.push(evidence.blocked_error);
    lines.push("```");
    lines.push("");
  }
  lines.push("## Amendments");
  lines.push("");
  lines.push("### Enabled on the connected node");
  lines.push("");
  lines.push(evidence.amendments.enabled.length ? evidence.amendments.enabled.map((n) => `- ${n}`).join("\n") : "_none recorded_");
  lines.push("");
  lines.push("### Disabled / absent on the connected node");
  lines.push("");
  lines.push(evidence.amendments.disabled.length ? evidence.amendments.disabled.map((n) => `- ${n}`).join("\n") : "_none recorded_");
  lines.push("");
  lines.push("### Used by this rehearsal");
  lines.push("");
  lines.push(evidence.amendments.used.map((n) => `- ${n}`).join("\n") || "_none_");
  lines.push("");
  lines.push("### Refused (not faked)");
  lines.push("");
  lines.push(evidence.amendments.refused.map((n) => `- ${n}`).join("\n") || "_none_");
  lines.push("");
  lines.push("Escrow / PayChan / MultiSign listing `enabled=false` is treated as a legacy/retired object listing. Settlement proof is TokenEscrow of issued AFX, not a fake Escrow vote. Official MPT docs still say DEX trading of MPTs is not implemented; this repo does not place MPT in AMM or OfferCreate.");
  lines.push("");
  lines.push("## Token");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push(`| public name | ${evidence.token.public_name} |`);
  lines.push(`| public ticker | ${evidence.token.public_ticker} |`);
  lines.push(`| classic IOU code | ${evidence.token.classic_currency} |`);
  lines.push(`| MPT metadata ticker | ${evidence.token.mpt_ticker} |`);
  lines.push(`| MPT asset_class | ${evidence.token.mpt_asset_class} |`);
  lines.push(`| MPT issuance id | ${evidence.token.mpt_issuance_id || "_none_"} |`);
  lines.push("");
  lines.push(whyAfxtCannotBeClassicIso());
  lines.push("");
  lines.push("## Accounts (classic addresses only)");
  lines.push("");
  lines.push("| Role | Address |");
  lines.push("| --- | --- |");
  lines.push(accountLine("issuer", evidence.accounts.issuer));
  lines.push(accountLine("alice", evidence.accounts.alice));
  lines.push(accountLine("bob", evidence.accounts.bob));
  lines.push(accountLine("unauthorized", evidence.accounts.unauthorized));
  lines.push("");
  lines.push("Seeds are not printed, logged, or committed.");
  lines.push("");
  lines.push("## Objects");
  lines.push("");
  lines.push("| Object | Value |");
  lines.push("| --- | --- |");
  lines.push(`| AMM account | ${evidence.objects.amm_account || "_none_"} |`);
  lines.push(`| Permissioned domain | ${evidence.objects.domain_id || "_none_"} |`);
  lines.push(`| Credential type (hex) | ${evidence.objects.credential_type_hex || "_none_"} |`);
  lines.push(`| TokenEscrow finish | owner ${evidence.objects.escrow_finish_owner || "_none_"} seq ${evidence.objects.escrow_finish_sequence || "_none_"} |`);
  lines.push(`| TokenEscrow cancel | owner ${evidence.objects.escrow_cancel_owner || "_none_"} seq ${evidence.objects.escrow_cancel_sequence || "_none_"} |`);
  lines.push("");
  lines.push("## Happy-path transactions");
  lines.push("");
  if (happy.length === 0) {
    lines.push("_No validated happy-path hashes yet. None were invented._");
    lines.push("");
  } else {
    lines.push("| Label | Type | Result | Ledger | Explorer |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const record of happy) lines.push(row(record));
    lines.push("");
  }
  lines.push("## Deny-path transactions (expected failures)");
  lines.push("");
  if (denyValidated.length === 0) {
    lines.push("_No validated deny-path hashes yet. None were invented._");
    lines.push("");
  } else {
    lines.push("| Label | Type | Result | Ledger | Explorer |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const record of denyValidated) lines.push(row(record));
    lines.push("");
    lines.push(`Recorded expected-failure count: **${denyValidated.length}**.`);
    lines.push("");
  }
  lines.push("## Honesty");
  lines.push("");
  lines.push("- Testnet only. No mainnet.");
  lines.push("- Not RLUSD, not a USD peg, not an issuance product.");
  lines.push("- Native XRPL. Not an EVM sidechain. Not Solidity.");
  lines.push("- Hooks are not XRPL; this repo does not use or claim Hooks.");
  lines.push("- issuer is centralized; test token; no peg.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function computeStatus(evidence: Evidence): Evidence["status"] {
  if (evidence.blocked_error) return "BLOCKED";
  const denyCount = Object.values(evidence.deny_path).filter(
    (r) => r.hash && r.result !== "tesSUCCESS",
  ).length;
  const has = (key: string) => evidence.happy_path[key]?.result === "tesSUCCESS";
  const freezeOrClaw =
    has("deep_freeze_unauthorized") ||
    has("clawback_iou_bob") ||
    has("clawback_mpt_bob") ||
    has("mpt_lock_bob");
  const ready =
    Boolean(evidence.accounts.issuer) &&
    Boolean(evidence.accounts.alice) &&
    Boolean(evidence.accounts.bob) &&
    Boolean(evidence.accounts.unauthorized) &&
    Boolean(evidence.token.mpt_issuance_id) &&
    has("issue_alice") &&
    (has("amm_create") || Boolean(evidence.objects.amm_account)) &&
    has("escrow_finish") &&
    freezeOrClaw &&
    denyCount >= 4;
  return ready ? "EXECUTED" : "INCOMPLETE";
}

export async function writeReport(evidence: Evidence): Promise<void> {
  evidence.status = computeStatus(evidence);
  await writeFile(REPORT_PATH, renderReport(evidence), "utf8");
}
