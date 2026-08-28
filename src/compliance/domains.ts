import type { Client, Wallet } from "xrpl";
import { createdLedgerIndex, submitTx } from "../tx.ts";
import type { TxRecord } from "../evidence-types.ts";

export async function setPermissionedDomain(
  client: Client,
  owner: Wallet,
  credentialIssuer: string,
  credentialType: string,
  label: string,
): Promise<{ domainId: string; tx: TxRecord }> {
  const tx = await submitTx(
    client,
    owner,
    {
      TransactionType: "PermissionedDomainSet",
      Account: owner.classicAddress,
      AcceptedCredentials: [
        {
          Credential: {
            Issuer: credentialIssuer,
            CredentialType: credentialType,
          },
        },
      ],
    },
    { label },
  );
  const submitted = await client.request({
    command: "tx",
    transaction: tx.hash,
  });
  const domainId = createdLedgerIndex(submitted.result.meta, "PermissionedDomain");
  if (!domainId) {
    throw new Error("PermissionedDomainSet succeeded but DomainID missing");
  }
  return { domainId, tx };
}

export async function findDomainId(
  client: Client,
  owner: string,
): Promise<string | undefined> {
  const objects = await client.request({
    command: "account_objects",
    account: owner,
    type: "permissioned_domain",
    ledger_index: "validated",
  });
  const first = objects.result.account_objects[0] as
    | { index?: string; LedgerIndex?: string }
    | undefined;
  return first?.index ?? first?.LedgerIndex;
}
