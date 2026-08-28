import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFeatures } from "../../src/network.ts";

test("parseFeatures splits enabled vs disabled by the enabled bit", () => {
  const parsed = parseFeatures({
    aaa: { enabled: true, name: "AMM", supported: true },
    bbb: { enabled: false, name: "DynamicMPT", supported: true },
    ccc: { enabled: true, name: "TokenEscrow", supported: true },
  });
  assert.deepEqual(parsed.enabled, ["AMM", "TokenEscrow"]);
  assert.deepEqual(parsed.disabled, ["DynamicMPT"]);
});
