# Atlas Forge XRPL

Native **XRP Ledger Testnet** rehearsal for **Atlas Forge XRPL Test Token**. Public ticker **AFXT**. Classic IOU currency **AFX**. Companion MPT metadata ticker **AFXT**, `asset_class: other`.

This is a Testnet rehearsal. It is **not** an issuance, **not** a peg, **not** regulated securities infrastructure, and **not** RLUSD. Faucet XRP is **not** TVL or AUM. The issuer can freeze and claw back; **that is the product**.

| Recruiter fact | Value |
| --- | --- |
| Ledger | XRP Ledger Testnet (`network_id` 1) — re-probe on connect |
| Public name | Atlas Forge XRPL Test Token |
| Public ticker | AFXT |
| Classic IOU code | AFX (3-character ISO limit; AFXT cannot be the ISO code) |
| MPT companion | AFXT metadata, `asset_class other` (not rwa, not stablecoin) |
| Stack | TypeScript strict, `xrpl` 5.1.0, native tx types |
| CI | `npm test` unit only; integration skipped unless `XRPL_SMOKE=1` |
| License | MIT |

Suggested GitHub topics: `xrpl`, `xrp-ledger`, `typescript`, `testnet`, `tokenization`, `dex`.

> **Honest label.** Native XRPL. Not an EVM sidechain. Not Solidity. Hooks are not XRPL and are not used here. No mainnet. No real XRP value claims. No USD/USDT/USDC/RLUSD currency codes.

## 8-minute audit

1. **What it is.** Four Testnet classic accounts (issuer, alice, bob, unauthorized) run native flows: issued **AFX** trust lines, DeepFreeze, Clawback, AFX/XRP AMM, TokenEscrow of AFX, a companion MPT, one Credential, one Permissioned Domain, one domain-gated OfferCreate, and a deny matrix of validated `tec*` failures.
2. **What it is not.** Not an issuance product. Not a peg. Not RLUSD. Not Hooks. Not XRPL EVM Sidechain. Not lending, vaults, batch, DynamicMPT, or confidential transfers — those amendments were probed disabled/absent and are refused, not faked.
3. **How to probe.** `cp .env.example .env` then `npm install && npm run probe`. The probe prints `build_version`, `network_id`, `server_state`, validated ledger, and the amendment set from the connected node. Do not treat a blog post as enabled.
4. **How to fund.** `npm run fund` creates four distinct wallets, writes seeds to gitignored files (`ISSUER_SEED_FILE` and friends), and calls the Testnet faucet. It prints **classic addresses only**. If the faucet rate-limits, scripts **STOP** and mark `PUBLIC_TESTNET_REPORT.md` **BLOCKED**. They do not invent evidence.
5. **How to replay.** `npm run replay` runs `00`–`09` in order. Each script is idempotent: skip if the object already exists. Scripts wait for **validated** ledgers, set `LastLedgerSequence`, and distinguish `tesSUCCESS` vs `tec*` vs `tem*`.
6. **Where the proof is.** [PUBLIC_TESTNET_REPORT.md](PUBLIC_TESTNET_REPORT.md) and [deployments/testnet.json](deployments/testnet.json) after real validated txs. Explorer links are `https://testnet.xrpl.org/transactions/<HASH>` and `https://testnet.xrpl.org/accounts/<ADDRESS>`.
7. **Issuer-is-god.** Freeze and clawback are ledger transactions, not a Solidity `onlyRole`. Documented in [docs/threat-model.md](docs/threat-model.md).
8. **Currency code.** AFXT cannot be the classic ISO code because classic IOU ISO-style codes are exactly 3 characters. The ledger code is **AFX**. AFXT is the public ticker and the MPT metadata ticker.

## Endpoints (Testnet)

| Role | URL |
| --- | --- |
| WSS | `wss://s.altnet.rippletest.net:51233/` |
| RPC | `https://s.altnet.rippletest.net:51234/` |
| Fallback RPC | `https://testnet.xrpl-labs.com/`, `https://testnet.honeycluster.io/` |
| Faucet | `https://faucet.altnet.rippletest.net/accounts` |
| Explorer | `https://testnet.xrpl.org/` |

No mainnet endpoints.

## Install and unit test

Requires Node 22+.

```bash
git clone https://github.com/Hobie1Kenobi/atlas-forge-xrpl.git
cd atlas-forge-xrpl
cp .env.example .env
npm install
npm test
npm run typecheck
```

CI runs those unit tests only. Do not put seeds in GitHub Actions.

## Replay on Testnet

```bash
npm run probe          # 00 — xrpld version + amendments
npm run fund           # 01 — four classic accounts
npm run issue          # 02 — issuer flags, TrustSet, AFX Payments, MPT create
npm run hold           # 03 — holder Payment, MPT authorize + issue
npm run dex            # 04 — AMMCreate, AMMDeposit, small Payment swap
npm run compliance     # 05 — Credential, domain, gated OfferCreate, deny
npm run escrow         # 06 — TokenEscrow finish path + cancel path
npm run clawback       # 07 — DeepFreeze + Clawback (IOU and MPT)
npm run deny           # 08 — expected-failure txs, keep hashes
npm run evidence       # 09 — rewrite PUBLIC_TESTNET_REPORT.md
```

Or `npm run replay`.

Seeds live in `./seeds/*.seed` via `ISSUER_SEED_FILE`, `HOLDER_A_SEED_FILE`, `HOLDER_B_SEED_FILE`, `UNAUTHORIZED_SEED_FILE`. The issuer seed is never reused as unauthorized. Scripts never print, commit, or log seeds.

Live integration tests: `XRPL_SMOKE=1 npm run test:integration`.

## What shipped

| Flow | Native tx / object | Note |
| --- | --- | --- |
| Classic IOU AFX | `TrustSet`, `Payment` | Holders set trust; issuer pays AFX |
| DeepFreeze | `TrustSet` `tfSetFreeze` + `tfSetDeepFreeze` | Unauthorized line |
| Clawback | `Clawback` | Issuer reclaim of issued AFX or MPT; **never native XRP** |
| AMM AFX/XRP | `AMMCreate`, `AMMDeposit`, `Payment` | One AMM per pair; asserted with `amm_info`; no MPT in the pool |
| TokenEscrow | `EscrowCreate` / `Finish` / `Cancel` of AFX | FinishAfter success path + cancel path |
| MPT companion | `MPTokenIssuanceCreate` + authorize + lock + clawback | Flags: require-auth, can-lock, can-clawback, can-escrow, can-transfer. **Not** in AMM or `OfferCreate` |
| Thin compliance | `CredentialCreate`/`Accept`, `PermissionedDomainSet`, domain `OfferCreate` | Plus a deny without the credential |
| Deny matrix | submitted + **validated** `tec*` | Unauthorized clawback; DeepFrozen payment; MPT without authorize; escrow finish too early |

## What this repo refuses

- XRPL EVM Sidechain, Solidity, ERC-20 ports
- Claiming Hooks as XRPL
- Mainnet, real XRP value, TVL/AUM
- USD / USDT / USDC / RLUSD currency codes
- Invented tx hashes, accounts, or explorer URLs
- MPT order books or MPT AMM (official docs: DEX trading of MPTs is not implemented)
- LendingProtocol, SingleAssetVault, BatchV1_1, DynamicMPT, ConfidentialTransfer, Sponsor, PermissionDelegationV1_1, MPTokensV2 unless the connected Testnet node actually enables them

If the connected `build_version` is far behind 3.3.x, probe output records it and scripts build against what the server enables.

## Docs

| Doc | Why |
| --- | --- |
| [PUBLIC_TESTNET_REPORT.md](PUBLIC_TESTNET_REPORT.md) | EXECUTED / INCOMPLETE / BLOCKED + hashes |
| [docs/amendments.md](docs/amendments.md) | probed vs used vs refused |
| [docs/threat-model.md](docs/threat-model.md) | issuer-is-god |
| [docs/case-study.md](docs/case-study.md) | IOU/MPT vs ERC-20; clawback as a ledger tx |
| [docs/proof-index.md](docs/proof-index.md) | titles → files → scripts |
| [deployments/testnet.example.json](deployments/testnet.example.json) | shape only |
| [deployments/testnet.json](deployments/testnet.json) | real validated results, after they exist |

Author: Hobie Cunningham ([Hobie1Kenobi](https://github.com/Hobie1Kenobi)). MIT license.
