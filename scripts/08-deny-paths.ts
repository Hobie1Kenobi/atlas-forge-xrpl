import { hasDeny, loadEvidence, recordDeny, recordHappy, saveEvidence } from "../src/evidence.ts";
import { clawbackIou, holderPayment } from "../src/issuance/iou.ts";
import { payMpt } from "../src/issuance/mpt.ts";
import { log, logError } from "../src/log.ts";
import { connectClient } from "../src/network.ts";
import { writeReport } from "../src/report.ts";
import { createTokenEscrow, finishEscrow } from "../src/settlement/escrow.ts";
import { loadAllWallets } from "../src/wallets.ts";

async function ledgerCloseTime(client: import("xrpl").Client): Promise<number> {
  const ledger = await client.request({
    command: "ledger",
    ledger_index: "validated",
  });
  return Number(ledger.result.ledger.close_time);
}

async function main(): Promise<void> {
  const evidence = await loadEvidence();
  const wallets = await loadAllWallets();
  const issuanceId = evidence.token.mpt_issuance_id;
  if (!issuanceId) throw new Error("missing MPT issuance id");
  const { client } = await connectClient();
  try {
    if (!hasDeny(evidence, "deny_unauthorized_clawback")) {
      await recordDeny(
        evidence,
        "deny_unauthorized_clawback",
        await clawbackIou(
          client,
          wallets.unauthorized,
          wallets.alice.classicAddress,
          "1",
          "deny_unauthorized_clawback",
          "tec",
        ),
      );
    }

    if (!hasDeny(evidence, "deny_frozen_payment")) {
      await recordDeny(
        evidence,
        "deny_frozen_payment",
        await holderPayment(
          client,
          wallets.unauthorized,
          wallets.alice.classicAddress,
          wallets.issuer.classicAddress,
          "1",
          "deny_frozen_payment",
          "tec",
        ),
      );
    }

    if (!hasDeny(evidence, "deny_mpt_without_authorize")) {
      await recordDeny(
        evidence,
        "deny_mpt_without_authorize",
        await payMpt(
          client,
          wallets.issuer,
          wallets.unauthorized.classicAddress,
          issuanceId,
          "1",
          "deny_mpt_without_authorize",
          "tec",
        ),
      );
    }

    if (!hasDeny(evidence, "deny_escrow_finish_too_early")) {
      const close = await ledgerCloseTime(client);
      const finishAfter = close + 3600;
      const created = await createTokenEscrow(
        client,
        wallets.alice,
        wallets.bob.classicAddress,
        wallets.issuer.classicAddress,
        "3",
        finishAfter,
        finishAfter + 3600,
        "deny_escrow_create",
      );
      evidence.objects.deny_escrow_owner = wallets.alice.classicAddress;
      evidence.objects.deny_escrow_sequence = created.sequence;
      await recordHappy(evidence, "deny_escrow_create", created.tx);
      await recordDeny(
        evidence,
        "deny_escrow_finish_too_early",
        await finishEscrow(
          client,
          wallets.bob,
          wallets.alice.classicAddress,
          created.sequence,
          "deny_escrow_finish_too_early",
          "tec",
        ),
      );
    }

    await saveEvidence(evidence);
    await writeReport(evidence);
    log("deny-path count", String(Object.keys(evidence.deny_path).length));
  } finally {
    await client.disconnect();
  }
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
