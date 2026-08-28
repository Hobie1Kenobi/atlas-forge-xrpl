import { test } from "node:test";
import assert from "node:assert/strict";
import { probeNetwork } from "../../src/network.ts";

const smoke = process.env.XRPL_SMOKE === "1";

test(
  "live Testnet probe returns xrpld version and amendments",
  { skip: !smoke },
  async () => {
    const probe = await probeNetwork();
    assert.ok(probe.build_version.length > 0);
    assert.equal(probe.network_id, 1);
    assert.ok(probe.enabled.includes("MPTokensV1"));
    assert.ok(probe.enabled.includes("TokenEscrow"));
    assert.ok(probe.enabled.includes("AMM"));
  },
);
