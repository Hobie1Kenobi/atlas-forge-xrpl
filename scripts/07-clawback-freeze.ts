import { hasHappy, loadEvidence, recordHappy, saveEvidence } from "../src/evidence.ts";
import { clawbackIou, deepFreezeHolder } from "../src/issuance/iou.ts";
import { clawbackMpt, lockMptHolder } from "../src/issuance/mpt.ts";
import { log, logError } from "../src/log.ts";
import { connectClient } from "../src/network.ts";
import { writeReport } from "../src/report.ts";
import { loadAllWallets } from "../src/wallets.ts";

async function main(): Promise<void> {
  const evidence = await loadEvidence();
  const wallets = await loadAllWallets();
  const issuanceId = evidence.token.mpt_issuance_id;
  if (!issuanceId) throw new Error("missing MPT issuance id");
  const { client } = await connectClient();
  try {
    if (!hasHappy(evidence, "deep_freeze_unauthorized")) {
      await recordHappy(
        evidence,
        "deep_freeze_unauthorized",
        await deepFreezeHolder(
          client,
          wallets.issuer,
          wallets.unauthorized.classicAddress,
          "deep_freeze_unauthorized",
        ),
      );
    }
    if (!hasHappy(evidence, "clawback_iou_bob")) {
      await recordHappy(
        evidence,
        "clawback_iou_bob",
        await clawbackIou(
          client,
          wallets.issuer,
          wallets.bob.classicAddress,
          "15",
          "clawback_iou_bob",
        ),
      );
    }
    if (!hasHappy(evidence, "mpt_lock_bob")) {
      await recordHappy(
        evidence,
        "mpt_lock_bob",
        await lockMptHolder(
          client,
          wallets.issuer,
          wallets.bob.classicAddress,
          issuanceId,
          "mpt_lock_bob",
        ),
      );
    }
    if (!hasHappy(evidence, "clawback_mpt_bob")) {
      await recordHappy(
        evidence,
        "clawback_mpt_bob",
        await clawbackMpt(
          client,
          wallets.issuer,
          wallets.bob.classicAddress,
          issuanceId,
          "5",
          "clawback_mpt_bob",
        ),
      );
    }
    log("issuer clawback is a ledger tx; never native XRP");
    await saveEvidence(evidence);
    await writeReport(evidence);
  } finally {
    await client.disconnect();
  }
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
