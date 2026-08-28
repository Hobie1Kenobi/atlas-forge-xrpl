import type { Client, Wallet } from "xrpl";
import { submitTx } from "../tx.ts";
import type { TxRecord } from "../evidence-types.ts";

export const CREDENTIAL_TYPE_ASCII = "AFXT_REHEARSAL";

export function credentialTypeHex(): string {
  return Buffer.from(CREDENTIAL_TYPE_ASCII, "utf8").toString("hex").toUpperCase();
}

export async function createCredential(
  client: Client,
  issuer: Wallet,
  subject: string,
  credentialType: string,
  label: string,
): Promise<TxRecord> {
  return submitTx(
    client,
    issuer,
    {
      TransactionType: "CredentialCreate",
      Account: issuer.classicAddress,
      Subject: subject,
      CredentialType: credentialType,
    },
    { label },
  );
}

export async function acceptCredential(
  client: Client,
  subject: Wallet,
  issuerAddress: string,
  credentialType: string,
  label: string,
): Promise<TxRecord> {
  return submitTx(
    client,
    subject,
    {
      TransactionType: "CredentialAccept",
      Account: subject.classicAddress,
      Issuer: issuerAddress,
      CredentialType: credentialType,
    },
    { label },
  );
}

export async function credentialExists(
  client: Client,
  subject: string,
  issuerAddress: string,
  credentialType: string,
): Promise<boolean> {
  try {
    await client.request({
      command: "ledger_entry",
      credential: {
        subject,
        issuer: issuerAddress,
        credentialType,
      },
      ledger_index: "validated",
    });
    return true;
  } catch {
    return false;
  }
}
