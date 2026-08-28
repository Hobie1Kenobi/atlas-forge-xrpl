# Case study — why IOU/MPT instead of an ERC-20 port

Atlas Forge P2 (`atlas-forge-rwa`) is an EVM permissioned ERC-20: `_update` hook, identity registry, freeze mapping, `forceTransfer`. Atlas Forge P3 is **not** that design copied onto XRPL. XRPL already has issued tokens, freeze, clawback, AMM, escrow, credentials, and permissioned DEX as **transaction types**.

This document is why the P3 repo is native, and what would change for a real issuer.

## Classic IOU vs ERC-20

| ERC-20 (P2) | XRPL IOU (P3) |
| --- | --- |
| Contract stores balances | Trust line (`RippleState`) stores the obligation |
| `transfer` / `_update` | `Payment` of `{currency, issuer, value}` |
| `freeze[account] = true` | Issuer `TrustSet` freeze / DeepFreeze flags |
| `forceTransfer` recovery | `Clawback` (issuer reclaim) plus ordinary `Payment` |
| `decimals()` | IOU decimal string amounts (no IEEE float) |
| Ticker can be 4+ chars | Classic ISO-style code is **exactly 3 characters** |

AFXT cannot be the classic ISO code. The ledger currency is **AFX**. The public ticker AFXT is product copy and MPT metadata.

An ERC-20 “role” is application code. XRPL freeze and clawback are protocol rules. A block explorer shows the `Clawback` tx; there is no proxy admin to misread.

## Why a companion MPT

MPTs are a second native issuance type (`MPTokenIssuanceCreate`) with issuance-level flags: require-auth, can-lock, can-clawback, can-escrow. Metadata follows XLS-89-ish JSON (ticker AFXT, name Atlas Forge XRPL Test Token, issuer_name Atlas Forge, asset_class **other**).

This rehearsal does **not** set `asset_class` to `rwa` or `stablecoin`. It is a Testnet token, not a regulated instrument.

DynamicMPT is disabled on this Testnet node, so flags are chosen at create time. There is no post-issuance metadata mutation in these scripts.

Official docs still say DEX trading of MPTs is not implemented. MPT is not placed in AMM or `OfferCreate`.

## Why clawback is a ledger tx

On EVM, recovery is whatever the contract author wrote (`forceTransfer`, `burn`+`mint`, pause). Reviewers must read Solidity.

On XRPL, `Clawback` is a first-class transaction. It requires `asfAllowTrustLineClawback` **before** the issuer has any owner-directory objects. After that, the ability cannot be turned off. That one-way flag is the threat: a real issuer who wants clawback must decide before the first trust line.

Clawback of native XRP is not a thing this repo will do. Amounts are issued AFX or MPT.

## Why TokenEscrow, not a fake Escrow vote

This node lists the old `Escrow` amendment as `enabled=false` (legacy/retired listing). `TokenEscrow` is enabled. Settlement proof is `EscrowCreate` of **issued AFX** with `FinishAfter`, a successful finish, and a cancel path. CryptoConditions are disabled, so there is no PREIMAGE branch.

## Why AMM is AFX/XRP only

XRPL AMM is a ledger object, one per pair. Creating it requires Default Ripple on the issuer and a special fee (incremental reserve). This rehearsal creates AFX/XRP, deposits, and does a small Payment swap, then asserts via `amm_info`. It does not invent a second AMM for the same pair.

## Thin compliance vs ERC-3643 theatre

P2’s identity registry is a mapping in a contract. P3 uses `CredentialCreate` + `CredentialAccept` + `PermissionedDomainSet` + `OfferCreate.DomainID`. That is enough to show a domain-gated book and a deny without the credential. It is not ONCHAINID, not a transfer agent, and not KYC.

## What would change for a real issuer

1. **Keys.** Issuer is god. Production keys would be multi-sign or an institutional signing ceremony — but `MultiSign` lists disabled on this node, so this rehearsal does not fake a signer list. A real issuer would confirm the amendment set on the network they actually use.
2. **Clawback decision is permanent.** Enable it on a fresh issuing account, or never.
3. **Require-auth / MPT allow-list.** Operational cost: every holder needs authorization. Miss one and payments fail. That is better than a silent ERC-20 whitelist bug only if ops can run it.
4. **No peg language.** Do not name the token like a dollar. AFXT/AFX is a test label.
5. **Do not port Solidity.** Freeze, clawback, AMM, and escrow already exist. A “token contract” on the EVM sidechain is a different product.
6. **Evidence.** Explorers and `tx` lookups, not screenshots of a local anvil.

This repo is the rehearsal of those native flows on Testnet, with hashes or an honest BLOCKED report. It is not a live issuance.
