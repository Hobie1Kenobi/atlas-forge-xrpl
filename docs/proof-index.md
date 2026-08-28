# Proof index — Atlas Forge XRPL

Titles map to files and to the script that produces or checks them. Hashes live in `PUBLIC_TESTNET_REPORT.md` and `deployments/testnet.json` only after validated Testnet txs. None are invented.

| Title | File | Script |
| --- | --- | --- |
| 8-minute audit / what not to claim | [README.md](../README.md) | n/a |
| Probe xrpld version + amendments | [PUBLIC_TESTNET_REPORT.md](../PUBLIC_TESTNET_REPORT.md), [docs/amendments.md](amendments.md) | `scripts/00-probe.ts` |
| Four funded classic accounts | `deployments/testnet.json` `accounts` | `scripts/01-fund.ts` |
| Issuer flags (clawback, locking, default ripple) | `happy_path.issuer_asf_*` | `scripts/02-issue.ts` |
| Classic IOU AFX trust + issue | `happy_path.trustset_*`, `issue_alice` | `scripts/02-issue.ts` |
| Companion MPT AFXT | `token.mpt_issuance_id`, `happy_path.mpt_create` | `scripts/02-issue.ts` |
| Holder Payment + MPT authorize/issue | `happy_path.hold_*`, `mpt_pay_*` | `scripts/03-hold.ts` |
| AMM AFX/XRP | `objects.amm_account`, `amm_create`, `amm_deposit`, `amm_swap_payment` | `scripts/04-dex-or-amm.ts` |
| Credential + permissioned domain + gated offer | `credential_*`, `permissioned_domain_set`, `domain_offer_alice` | `scripts/05-compliance.ts` |
| Domain deny without credential | `deny_path.domain_offer_unauthorized` | `scripts/05-compliance.ts` |
| TokenEscrow finish path | `escrow_create_finish`, `escrow_finish` | `scripts/06-escrow.ts` |
| TokenEscrow cancel path | `escrow_create_cancel`, `escrow_cancel` | `scripts/06-escrow.ts` |
| DeepFreeze + Clawback + MPT lock | `deep_freeze_unauthorized`, `clawback_iou_bob`, `mpt_lock_bob`, `clawback_mpt_bob` | `scripts/07-clawback-freeze.ts` |
| Unauthorized clawback | `deny_unauthorized_clawback` | `scripts/08-deny-paths.ts` |
| Payment from DeepFrozen line | `deny_frozen_payment` | `scripts/08-deny-paths.ts` |
| MPT payment without authorize | `deny_mpt_without_authorize` | `scripts/08-deny-paths.ts` |
| Escrow finish too early | `deny_escrow_finish_too_early` | `scripts/08-deny-paths.ts` |
| Evidence rewrite | [PUBLIC_TESTNET_REPORT.md](../PUBLIC_TESTNET_REPORT.md) | `scripts/09-write-evidence.ts` |
| Issuer-is-god | [docs/threat-model.md](threat-model.md) | n/a |
| Why not ERC-20 | [docs/case-study.md](case-study.md) | n/a |
| Offline encoding / amounts | `test/unit/*.test.ts` | `npm test` |
| Live smoke (optional) | `test/integration/smoke.test.ts` | `XRPL_SMOKE=1 npm run test:integration` |

Explorer form:

- `https://testnet.xrpl.org/transactions/<HASH>`
- `https://testnet.xrpl.org/accounts/<ADDRESS>`
