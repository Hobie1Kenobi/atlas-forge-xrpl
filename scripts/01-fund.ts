import { saveEvidence } from "../src/evidence.ts";
import { loadEvidence } from "../src/evidence.ts";
import { BlockedError, log, logError } from "../src/log.ts";
import { connectClient } from "../src/network.ts";
import { writeReport } from "../src/report.ts";
import { accountExists, xrpBalanceDrops } from "../src/tx.ts";
import {
  assertDistinct,
  fundClassicAccount,
  loadOrCreateWallet,
  printClassicAddresses,
  type FundedWallets,
} from "../src/wallets.ts";
import type { WalletRole } from "../src/config.ts";

const ROLES: WalletRole[] = ["issuer", "alice", "bob", "unauthorized"];

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const evidence = await loadEvidence();
  const wallets = {} as FundedWallets;
  for (const role of ROLES) {
    wallets[role] = await loadOrCreateWallet(role);
  }
  assertDistinct(wallets.issuer, wallets.alice, wallets.bob, wallets.unauthorized);
  printClassicAddresses(wallets);

  const { client } = await connectClient();
  try {
    for (const role of ROLES) {
      const wallet = wallets[role];
      const exists = await accountExists(client, wallet.classicAddress);
      if (exists) {
        const drops = await xrpBalanceDrops(client, wallet.classicAddress);
        if (drops > 0n) {
          log("skip faucet", role, wallet.classicAddress, "already funded");
          continue;
        }
      }
      log("funding", role, wallet.classicAddress);
      const funded = await fundClassicAccount(wallet.classicAddress);
      log("faucet submitted", role, funded.hash ?? "(no hash field)", funded.amount ?? "");
      let visible = false;
      for (let i = 0; i < 30; i += 1) {
        await sleep(2000);
        try {
          if (await accountExists(client, wallet.classicAddress)) {
            const drops = await xrpBalanceDrops(client, wallet.classicAddress);
            if (drops > 0n) {
              visible = true;
              break;
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!/not found|actNotFound/i.test(message)) throw error;
        }
      }
      if (!visible) {
        throw new BlockedError(`funded ${role} but account not visible yet`);
      }
    }
    evidence.accounts = {
      issuer: wallets.issuer.classicAddress,
      alice: wallets.alice.classicAddress,
      bob: wallets.bob.classicAddress,
      unauthorized: wallets.unauthorized.classicAddress,
    };
    await saveEvidence(evidence);
    await writeReport(evidence);
  } finally {
    await client.disconnect();
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
