import { DROPS_PER_XRP, RIPPLE_EPOCH } from "./config.ts";

const DECIMAL = /^[0-9]+(\.[0-9]+)?$/;
const INTEGER = /^[0-9]+$/;

export type IssuedAmount = {
  currency: string;
  issuer: string;
  value: string;
};

export type MptAmount = {
  mpt_issuance_id: string;
  value: string;
};

export type Asset = { currency: "XRP" } | { currency: string; issuer: string };

export function assertDecimalString(value: string, label: string): string {
  if (typeof value !== "string" || !DECIMAL.test(value)) {
    throw new Error(`${label} must be a base-10 decimal string, not a float`);
  }
  if (value.includes("e") || value.includes("E")) {
    throw new Error(`${label} must not use scientific notation`);
  }
  return value;
}

export function assertIntegerString(value: string, label: string): string {
  if (typeof value !== "string" || !INTEGER.test(value)) {
    throw new Error(`${label} must be an unsigned integer string`);
  }
  return value;
}

export function xrpToDrops(wholeXrp: string): string {
  assertIntegerString(wholeXrp, "XRP amount");
  return (BigInt(wholeXrp) * DROPS_PER_XRP).toString();
}

export function dropsToXrpWhole(drops: string): string {
  assertIntegerString(drops, "drops");
  const n = BigInt(drops);
  if (n % DROPS_PER_XRP !== 0n) {
    throw new Error("drops are not a whole XRP; keep drop strings on chain");
  }
  return (n / DROPS_PER_XRP).toString();
}

export function issuedAmount(
  value: string,
  currency: string,
  issuer: string,
): IssuedAmount {
  return {
    currency,
    issuer,
    value: assertDecimalString(value, "issued amount"),
  };
}

export function mptAmount(value: string, mptIssuanceId: string): MptAmount {
  return {
    mpt_issuance_id: mptIssuanceId,
    value: assertIntegerString(value, "MPT amount"),
  };
}

export function xrpAsset(): Asset {
  return { currency: "XRP" };
}

export function issuedAsset(currency: string, issuer: string): Asset {
  return { currency, issuer };
}

export function unixToRippleTime(unixSeconds: number): number {
  if (!Number.isInteger(unixSeconds)) {
    throw new Error("unix time must be an integer second");
  }
  return unixSeconds - RIPPLE_EPOCH;
}

export function rippleToUnixTime(rippleSeconds: number): number {
  if (!Number.isInteger(rippleSeconds)) {
    throw new Error("ripple time must be an integer second");
  }
  return rippleSeconds + RIPPLE_EPOCH;
}

export function nowRippleTime(): number {
  return unixToRippleTime(Math.floor(Date.now() / 1000));
}

export function classifyEngineResult(
  code: string,
): "tes" | "tec" | "tem" | "ter" | "tef" | "tel" | "tempty" | "other" {
  if (code.startsWith("tes")) return "tes";
  if (code.startsWith("tec")) return "tec";
  if (code.startsWith("tem")) return "tem";
  if (code.startsWith("ter")) return "ter";
  if (code.startsWith("tef")) return "tef";
  if (code.startsWith("tel")) return "tel";
  if (code === "") return "tempty";
  return "other";
}

export function isValidatedFailure(code: string): boolean {
  const kind = classifyEngineResult(code);
  return kind === "tec" || kind === "tef";
}

export function isSuccess(code: string): boolean {
  return code === "tesSUCCESS";
}
