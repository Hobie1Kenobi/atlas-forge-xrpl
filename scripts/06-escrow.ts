import { hasHappy, loadEvidence, recordHappy, saveEvidence } from "../src/evidence.ts";
import { log, logError } from "../src/log.ts";
import { connectClient } from "../src/network.ts";
import { writeReport } from "../src/report.ts";
import {
  cancelEscrow,
  createTokenEscrow,
  finishEscrow,
} from "../src/settlement/escrow.ts";
import { waitRippleTime } from "../src/tx.ts";
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
  const { client } = await connectClient();
  try {
    const close = await ledgerCloseTime(client);

    if (!hasHappy(evidence, "escrow_create_finish") || !evidence.objects.escrow_finish_sequence) {
      const finishAfter = close + 20;
      const created = await createTokenEscrow(
        client,
        wallets.alice,
        wallets.bob.classicAddress,
        wallets.issuer.classicAddress,
        "10",
        finishAfter,
        finishAfter + 600,
        "escrow_create_finish",
      );
      evidence.objects.escrow_finish_owner = wallets.alice.classicAddress;
      evidence.objects.escrow_finish_sequence = created.sequence;
      await recordHappy(evidence, "escrow_create_finish", created.tx);
      log("waiting for FinishAfter", String(finishAfter));
      await waitRippleTime(client, finishAfter + 1);
    } else if (!hasHappy(evidence, "escrow_finish")) {
      const ledger = await client.request({ command: "ledger", ledger_index: "validated" });
      log("resume finish wait; ledger close", String(ledger.result.ledger.close_time));
      await waitRippleTime(client, Number(ledger.result.ledger.close_time) + 1);
    }

    if (!hasHappy(evidence, "escrow_finish")) {
      await recordHappy(
        evidence,
        "escrow_finish",
        await finishEscrow(
          client,
          wallets.bob,
          evidence.objects.escrow_finish_owner,
          evidence.objects.escrow_finish_sequence,
          "escrow_finish",
        ),
      );
    }

    const close2 = await ledgerCloseTime(client);
    if (!hasHappy(evidence, "escrow_create_cancel") || !evidence.objects.escrow_cancel_sequence) {
      const finishAfter = close2 + 12;
      const cancelAfter = close2 + 28;
      const created = await createTokenEscrow(
        client,
        wallets.alice,
        wallets.bob.classicAddress,
        wallets.issuer.classicAddress,
        "8",
        finishAfter,
        cancelAfter,
        "escrow_create_cancel",
      );
      evidence.objects.escrow_cancel_owner = wallets.alice.classicAddress;
      evidence.objects.escrow_cancel_sequence = created.sequence;
      await recordHappy(evidence, "escrow_create_cancel", created.tx);
      log("waiting for CancelAfter", String(cancelAfter));
      await waitRippleTime(client, cancelAfter + 1);
    }

    if (!hasHappy(evidence, "escrow_cancel")) {
      await recordHappy(
        evidence,
        "escrow_cancel",
        await cancelEscrow(
          client,
          wallets.alice,
          evidence.objects.escrow_cancel_owner,
          evidence.objects.escrow_cancel_sequence,
          "escrow_cancel",
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
