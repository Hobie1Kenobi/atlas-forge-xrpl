import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertDecimalString,
  classifyEngineResult,
  dropsToXrpWhole,
  issuedAmount,
  isSuccess,
  isValidatedFailure,
  mptAmount,
  nowRippleTime,
  rippleToUnixTime,
  unixToRippleTime,
  xrpToDrops,
} from "../../src/amounts.ts";
import {
  CLASSIC_CURRENCY,
  classicCurrencyOrThrow,
  PUBLIC_TICKER,
  whyAfxtCannotBeClassicIso,
} from "../../src/config.ts";
import { accountUrl, txUrl } from "../../src/explorer.ts";
import { redact } from "../../src/log.ts";
import { computeStatus, renderReport } from "../../src/report.ts";
import { emptyEvidence } from "../../src/evidence-types.ts";
import { MPT_METADATA } from "../../src/issuance/mpt.ts";
import { RIPPLE_EPOCH } from "../../src/config.ts";

test("classic IOU code is AFX not AFXT", () => {
  assert.equal(CLASSIC_CURRENCY, "AFX");
  assert.equal(PUBLIC_TICKER, "AFXT");
  assert.equal(classicCurrencyOrThrow("AFX"), "AFX");
  assert.throws(() => classicCurrencyOrThrow("AFXT"));
  assert.throws(() => classicCurrencyOrThrow("USD"));
  assert.throws(() => classicCurrencyOrThrow("XRP"));
  assert.match(whyAfxtCannotBeClassicIso(), /exactly 3 characters/);
});

test("amounts are decimal strings, never floats", () => {
  assert.equal(xrpToDrops("25"), "25000000");
  assert.equal(dropsToXrpWhole("25000000"), "25");
  assert.deepEqual(issuedAmount("1000", "AFX", "rISSUER"), {
    currency: "AFX",
    issuer: "rISSUER",
    value: "1000",
  });
  assert.deepEqual(mptAmount("50", "AB".repeat(24)), {
    mpt_issuance_id: "AB".repeat(24),
    value: "50",
  });
  assert.throws(() => xrpToDrops("1.5"));
  assert.throws(() => issuedAmount("1e3", "AFX", "rISSUER"));
  assert.throws(() => mptAmount("1.5", "AB".repeat(24)));
  assert.equal(assertDecimalString("10.5", "x"), "10.5");
});

test("ripple time is integer seconds", () => {
  assert.equal(unixToRippleTime(RIPPLE_EPOCH), 0);
  assert.equal(rippleToUnixTime(0), RIPPLE_EPOCH);
  assert.ok(Number.isInteger(nowRippleTime()));
  assert.throws(() => unixToRippleTime(1.5));
});

test("engine result classification", () => {
  assert.equal(classifyEngineResult("tesSUCCESS"), "tes");
  assert.equal(classifyEngineResult("tecFROZEN"), "tec");
  assert.equal(classifyEngineResult("temMALFORMED"), "tem");
  assert.equal(classifyEngineResult("terQUEUED"), "ter");
  assert.equal(isSuccess("tesSUCCESS"), true);
  assert.equal(isSuccess("tecFROZEN"), false);
  assert.equal(isValidatedFailure("tecNO_PERMISSION"), true);
  assert.equal(isValidatedFailure("temMALFORMED"), false);
});

test("explorer URLs match the required form", () => {
  const hash = "A".repeat(64);
  assert.equal(
    txUrl(hash),
    `https://testnet.xrpl.org/transactions/${hash}`,
  );
  assert.equal(
    accountUrl("rN7n7otQDd6FczFgLdlqtyMVrn3qEXAMPLE"),
    "https://testnet.xrpl.org/accounts/rN7n7otQDd6FczFgLdlqtyMVrn3qEXAMPLE",
  );
  assert.throws(() => txUrl("nope"));
  assert.throws(() => accountUrl("XWrong"));
});

test("logger redacts family seeds", () => {
  const sample = "wallet seed sEdVJ3s3nQexampleSeedValueGoesHerexx and more";
  assert.equal(redact(sample).includes("sEd"), false);
  assert.match(redact(sample), /REDACTED_SEED/);
});

test("MPT metadata is AFXT / other, not rwa or stablecoin", () => {
  assert.equal(MPT_METADATA.ticker, "AFXT");
  assert.equal(MPT_METADATA.name, "Atlas Forge XRPL Test Token");
  assert.equal(MPT_METADATA.issuer_name, "Atlas Forge");
  assert.equal(MPT_METADATA.asset_class, "other");
  assert.notEqual(MPT_METADATA.asset_class, "rwa");
  assert.notEqual(MPT_METADATA.asset_class, "stablecoin");
});

test("report status stays INCOMPLETE without invented hashes", () => {
  const evidence = emptyEvidence();
  assert.equal(computeStatus(evidence), "INCOMPLETE");
  evidence.blocked_error = "faucet rate-limited HTTP 429";
  assert.equal(computeStatus(evidence), "BLOCKED");
  const markdown = renderReport(emptyEvidence());
  assert.match(markdown, /None were invented/);
  assert.match(markdown, /issuer is centralized; test token; no peg/);
  assert.match(markdown, /not an issuance/i);
  assert.match(markdown, /Testnet rehearsal/);
});

test("report explorer links use hash and address templates", () => {
  const evidence = emptyEvidence();
  evidence.accounts.issuer = "rIssuerAddressxxxxxxxxxxxxxxxxxxxxx";
  evidence.happy_path.issue_alice = {
    hash: "B".repeat(64),
    result: "tesSUCCESS",
    ledger_index: 1,
    type: "Payment",
    label: "issue_alice",
    validated: true,
    explorer: txUrl("B".repeat(64)),
    sequence: 1,
  };
  const markdown = renderReport(evidence);
  assert.match(markdown, /https:\/\/testnet\.xrpl\.org\/transactions\/B{64}/);
  assert.match(
    markdown,
    /https:\/\/testnet\.xrpl\.org\/accounts\/rIssuerAddressxxxxxxxxxxxxxxxxxxxxx/,
  );
});
