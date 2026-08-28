import { hasDeny, hasHappy, loadEvidence, recordDeny, recordHappy, saveEvidence } from "../src/evidence.ts";
import { acceptCredential, createCredential, credentialExists, credentialTypeHex } from "../src/compliance/credentials.ts";
import { findDomainId, setPermissionedDomain } from "../src/compliance/domains.ts";
import { domainOfferCreate } from "../src/dex/offer.ts";
import { log, logError } from "../src/log.ts";
import { connectClient } from "../src/network.ts";
import { writeReport } from "../src/report.ts";
import { loadAllWallets } from "../src/wallets.ts";

async function main(): Promise<void> {
  const evidence = await loadEvidence();
  const wallets = await loadAllWallets();
  const typeHex = credentialTypeHex();
  evidence.objects.credential_type_hex = typeHex;
  const { client } = await connectClient();
  try {
    const already = await credentialExists(
      client,
      wallets.alice.classicAddress,
      wallets.issuer.classicAddress,
      typeHex,
    );
    if (!hasHappy(evidence, "credential_create") && !already) {
      await recordHappy(
        evidence,
        "credential_create",
        await createCredential(
          client,
          wallets.issuer,
          wallets.alice.classicAddress,
          typeHex,
          "credential_create",
        ),
      );
    }
    if (!hasHappy(evidence, "credential_accept")) {
      await recordHappy(
        evidence,
        "credential_accept",
        await acceptCredential(
          client,
          wallets.alice,
          wallets.issuer.classicAddress,
          typeHex,
          "credential_accept",
        ),
      );
    }

    let domainId = evidence.objects.domain_id || (await findDomainId(client, wallets.issuer.classicAddress));
    if (!domainId) {
      const created = await setPermissionedDomain(
        client,
        wallets.issuer,
        wallets.issuer.classicAddress,
        typeHex,
        "permissioned_domain_set",
      );
      domainId = created.domainId;
      await recordHappy(evidence, "permissioned_domain_set", created.tx);
    } else {
      log("skip permissioned domain", domainId);
    }
    evidence.objects.domain_id = domainId;

    if (!hasHappy(evidence, "domain_offer_alice")) {
      await recordHappy(
        evidence,
        "domain_offer_alice",
        await domainOfferCreate(
          client,
          wallets.alice,
          wallets.issuer.classicAddress,
          domainId,
          "domain_offer_alice",
        ),
      );
    }
    if (!hasDeny(evidence, "domain_offer_unauthorized")) {
      await recordDeny(
        evidence,
        "domain_offer_unauthorized",
        await domainOfferCreate(
          client,
          wallets.unauthorized,
          wallets.issuer.classicAddress,
          domainId,
          "domain_offer_unauthorized",
          "tec",
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
