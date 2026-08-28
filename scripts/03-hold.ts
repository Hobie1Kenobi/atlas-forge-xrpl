import { hasHappy, loadEvidence, recordHappy, saveEvidence } from "../src/evidence.ts";
import { holderPayment } from "../src/issuance/iou.ts";
import {
  authorizeMptHolder,
  issuerAllowListHolder,
  payMpt,
} from "../src/issuance/mpt.ts";
import { log, logError } from "../src/log.ts";
import { connectClient } from "../src/network.ts";
import { writeReport } from "../src/report.ts";
import { loadAllWallets } from "../src/wallets.ts";

async function main(): Promise<void> {
  const evidence = await loadEvidence();
  if (!evidence.token.mpt_issuance_id) {
    throw new Error("missing MPT issuance id; run 02-issue.ts");
  }
  const issuanceId = evidence.token.mpt_issuance_id;
  const wallets = await loadAllWallets();
  const { client } = await connectClient();
  try {
    if (!hasHappy(evidence, "hold_alice_to_bob")) {
      await recordHappy(
        evidence,
        "hold_alice_to_bob",
        await holderPayment(
          client,
          wallets.alice,
          wallets.bob.classicAddress,
          wallets.issuer.classicAddress,
          "25",
          "hold_alice_to_bob",
        ),
      );
    }

    for (const [role, wallet] of [
      ["alice", wallets.alice],
      ["bob", wallets.bob],
    ] as const) {
      const holderKey = `mpt_authorize_${role}`;
      if (!hasHappy(evidence, holderKey)) {
        const tx = await authorizeMptHolder(client, wallet, issuanceId, holderKey);
        if (tx) await recordHappy(evidence, holderKey, tx);
      }
      const allowKey = `mpt_allowlist_${role}`;
      if (!hasHappy(evidence, allowKey)) {
        await recordHappy(
          evidence,
          allowKey,
          await issuerAllowListHolder(
            client,
            wallets.issuer,
            wallet.classicAddress,
            issuanceId,
            allowKey,
          ),
        );
      }
    }

    if (!hasHappy(evidence, "mpt_pay_alice")) {
      await recordHappy(
        evidence,
        "mpt_pay_alice",
        await payMpt(
          client,
          wallets.issuer,
          wallets.alice.classicAddress,
          issuanceId,
          "100",
          "mpt_pay_alice",
        ),
      );
    }
    if (!hasHappy(evidence, "mpt_pay_bob")) {
      await recordHappy(
        evidence,
        "mpt_pay_bob",
        await payMpt(
          client,
          wallets.issuer,
          wallets.bob.classicAddress,
          issuanceId,
          "50",
          "mpt_pay_bob",
        ),
      );
    }
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
