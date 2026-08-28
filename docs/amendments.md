# Amendments — Atlas Forge XRPL

This file is the honesty layer for amendment choice. **Re-probe on connect.** A blog post or this table is not evidence that a feature is enabled.

Probe command: `npm run probe` against `https://s.altnet.rippletest.net:51234/` (fallback RPC in `src/config.ts`).

Expected shape when this rehearsal was specified (2026-08-28): `build_version` 3.3.0, `network_id` 1, `server_state` full. If the connected build is far behind 3.3.x, record it in `PUBLIC_TESTNET_REPORT.md` and build against what the server actually enables.

## Used (must be enabled on the connected node)

| Amendment | Why this repo uses it |
| --- | --- |
| AMM, fixAMMv1_1/v1_2/v1_3 | AFX/XRP `AMMCreate`, `AMMDeposit`, Payment swap, `amm_info` |
| AMMClawback | Rules for clawing issued tokens out of an AMM. This rehearsal claws a non-LP holder with `Clawback`, and refuses to `Clawback` an AMM account (use `AMMClawback` instead) |
| MPTokensV1, fixMPTDeliveredAmount | Companion MPT issuance, authorize, lock, clawback |
| Clawback | Issuer reclaim of issued AFX / MPT. Never native XRP |
| DeepFreeze | `tfSetDeepFreeze` on a trust line; deny payments from that holder |
| Credentials | One `CredentialCreate` + `CredentialAccept` |
| PermissionedDomains | One `PermissionedDomainSet` |
| PermissionedDEX | Domain-gated `OfferCreate` + deny without credential |
| TokenEscrow, fixTokenEscrowV1 | Escrow of issued AFX (`FinishAfter` finish path and cancel path) |
| Checks | Enabled on the node; not a must-have flow in the scripts |

## Refused (do not fake)

These were specified as disabled or absent on the 3.3.0 Testnet node. Scripts do not emit the corresponding tx types.

| Amendment | Why refused |
| --- | --- |
| LendingProtocol | Not enabled; this is not a lending product |
| SingleAssetVault | Not enabled; no vault shares, no vault AMM |
| BatchV1_1 | Not enabled; no batch envelope |
| DynamicMPT | Not enabled; no post-issuance `ImmutableFlags` / metadata mutation |
| ConfidentialTransfer | Not enabled; no confidential balances |
| Sponsor | Not enabled |
| PermissionDelegationV1_1 | Not enabled |
| fixCleanup3_3_0 | Not enabled; do not claim its semantics |
| MPTokensV2 | Absent; stick to MPTokensV1 |

Official MPT documentation still says **DEX trading of MPTs is not implemented**. This repo does not put MPT in `AMMCreate` or `OfferCreate`, and does not claim MPT order books.

## Legacy listings (`enabled=false`)

On this node, **Escrow**, **PayChan**, and **MultiSign** list `enabled=false`. Treat that as a legacy/retired object listing, not as a vote to invent XRP `EscrowCreate` proof. Settlement proof in this rehearsal is **TokenEscrow of issued AFX**.

CryptoConditions is also disabled, so this repo does not use PREIMAGE conditions on escrow.

## How to read a new probe

`scripts/00-probe.ts` writes the live enabled/disabled sets into `deployments/testnet.json` and `PUBLIC_TESTNET_REPORT.md`. If a used amendment is missing, the probe logs `missing_used` and later scripts fail honestly instead of substituting a different ledger.
