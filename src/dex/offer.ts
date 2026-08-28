import type { Client, Wallet } from "xrpl";
import { issuedAmount, xrpToDrops } from "../amounts.ts";
import { config } from "../config.ts";
import { submitTx } from "../tx.ts";
import type { TxRecord } from "../evidence-types.ts";

export async function domainOfferCreate(
  client: Client,
  maker: Wallet,
  issuerAddress: string,
  domainId: string,
  label: string,
  expect: "tesSUCCESS" | "tec" | string = "tesSUCCESS",
): Promise<TxRecord> {
  return submitTx(
    client,
    maker,
    {
      TransactionType: "OfferCreate",
      Account: maker.classicAddress,
      DomainID: domainId,
      TakerPays: xrpToDrops("1"),
      TakerGets: issuedAmount("5", config.tokenCurrency, issuerAddress),
    },
    { label, expect },
  );
}
