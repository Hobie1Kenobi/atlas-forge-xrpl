import { AccountSetAsfFlags } from "xrpl";
import { config } from "../src/config.ts";
import { hasHappy, loadEvidence, recordHappy, saveEvidence } from "../src/evidence.ts";
import { enableIssuerFlag, issuePayment, trustSet } from "../src/issuance/iou.ts";
import { createMptIssuance } from "../src/issuance/mpt.ts";
import { log, logError } from "../src/log.ts";
import { connectClient } from "../src/network.ts";
import { writeReport } from "../src/report.ts";
import { loadAllWallets } from "../src/wallets.ts";

async function main(): Promise<void> {
  const evidence = await loadEvidence();
  const wallets = await loadAllWallets();
  const { client } = await connectClient();
  try {
    const flags: Array<[number, string, string]> = [
      [AccountSetAsfFlags.asfAllowTrustLineClawback, "issuer_asf_clawback", "asfAllowTrustLineClawback"],
      [AccountSetAsfFlags.asfAllowTrustLineLocking, "issuer_asf_locking", "asfAllowTrustLineLocking"],
      [AccountSetAsfFlags.asfDefaultRipple, "issuer_asf_default_ripple", "asfDefaultRipple"],
    ];
    for (const [flag, key, label] of flags) {
      if (hasHappy(evidence, key)) {
        log("skip", key);
        continue;
      }
      const tx = await enableIssuerFlag(client, wallets.issuer, flag, label);
      if (tx) await recordHappy(evidence, key, tx);
    }

    for (const [role, wallet] of [
      ["alice", wallets.alice],
      ["bob", wallets.bob],
      ["unauthorized", wallets.unauthorized],
    ] as const) {
      const key = `trustset_${role}`;
      if (hasHappy(evidence, key)) {
        log("skip", key);
        continue;
      }
      const tx = await trustSet(
        client,
        wallet,
        wallets.issuer.classicAddress,
        key,
      );
      if (tx) await recordHappy(evidence, key, tx);
    }

    if (!hasHappy(evidence, "issue_alice")) {
      await recordHappy(
        evidence,
        "issue_alice",
        await issuePayment(
          client,
          wallets.issuer,
          wallets.alice.classicAddress,
          "10000",
          "issue_alice",
        ),
      );
    }
    if (!hasHappy(evidence, "issue_bob")) {
      await recordHappy(
        evidence,
        "issue_bob",
        await issuePayment(
          client,
          wallets.issuer,
          wallets.bob.classicAddress,
          "1000",
          "issue_bob",
        ),
      );
    }
    if (!hasHappy(evidence, "issue_unauthorized")) {
      await recordHappy(
        evidence,
        "issue_unauthorized",
        await issuePayment(
          client,
          wallets.issuer,
          wallets.unauthorized.classicAddress,
          "40",
          "issue_unauthorized",
        ),
      );
    }

    const mpt = await createMptIssuance(client, wallets.issuer);
    evidence.token.mpt_issuance_id = mpt.id;
    evidence.token.classic_currency = config.tokenCurrency;
    if (mpt.tx) await recordHappy(evidence, "mpt_create", mpt.tx);
    await saveEvidence(evidence);
    await writeReport(evidence);
    log("classic currency", config.tokenCurrency);
    log("mpt issuance", mpt.id);
  } finally {
    await client.disconnect();
  }
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
