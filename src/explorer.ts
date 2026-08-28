import { config } from "./config.ts";

export function txUrl(hash: string): string {
  if (!/^[A-F0-9]{64}$/.test(hash)) {
    throw new Error("transaction hash must be 64 hex chars");
  }
  return `${config.explorer}/transactions/${hash}`;
}

export function accountUrl(address: string): string {
  if (!address.startsWith("r")) {
    throw new Error("classic address must start with r");
  }
  return `${config.explorer}/accounts/${address}`;
}

export function mptUrl(issuanceId: string): string {
  if (!/^[A-F0-9]{48}$/i.test(issuanceId)) {
    throw new Error("MPT issuance id must be 48 hex chars");
  }
  return `${config.explorer}/mpt/${issuanceId}`;
}
