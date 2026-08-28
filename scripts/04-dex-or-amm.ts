import { hasHappy, loadEvidence, recordHappy, saveEvidence } from "../src/evidence.ts";
import { ammInfo, createAmmIfMissing, depositAmm, swapXrpForAfx } from "../src/dex/amm.ts";
import { log, logError } from "../src/log.ts";
import { connectClient } from "../src/network.ts";
import { writeReport } from "../src/report.ts";
import { loadAllWallets } from "../src/wallets.ts";

async function main(): Promise<void> {
  const evidence = await loadEvidence();
  const wallets = await loadAllWallets();
  const { client } = await connectClient();
  try {
    const created = await createAmmIfMissing(
      client,
      wallets.alice,
      wallets.issuer.classicAddress,
    );
    evidence.objects.amm_account = created.info.account ?? "";
    if (created.tx) await recordHappy(evidence, "amm_create", created.tx);

    if (!hasHappy(evidence, "amm_deposit")) {
      await recordHappy(
        evidence,
        "amm_deposit",
        await depositAmm(client, wallets.alice, wallets.issuer.classicAddress),
      );
    }
    if (!hasHappy(evidence, "amm_swap_payment")) {
      await recordHappy(
        evidence,
        "amm_swap_payment",
        await swapXrpForAfx(
          client,
          wallets.bob,
          wallets.issuer.classicAddress,
          wallets.bob.classicAddress,
        ),
      );
    }
    const info = await ammInfo(client, wallets.issuer.classicAddress);
    if (!info?.account) {
      throw new Error("amm_info empty after AMM scripts");
    }
    evidence.objects.amm_account = info.account;
    log("amm_info account", info.account);
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
