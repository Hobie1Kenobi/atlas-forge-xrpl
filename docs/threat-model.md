# Threat model — Atlas Forge XRPL Testnet rehearsal

**Status:** engineering sketch on XRPL Testnet. Not a paid audit. Not an issuance. Not a peg. Not regulated securities infrastructure.

**Scope:** classic IOU **AFX**, companion MPT **AFXT** metadata, AMM AFX/XRP, TokenEscrow of AFX, one Credential, one Permissioned Domain, DeepFreeze, Clawback.

## Issuer is god

On XRPL, issued tokens are obligations of the issuing account. That is not a hidden admin key in a contract. It is the ledger model:

| Power | Ledger mechanism | Who |
| --- | --- | --- |
| Create AFX balances | `Payment` of AFX from the issuer | issuer |
| Freeze / DeepFreeze a holder | `TrustSet` with freeze flags against the holder | issuer |
| Claw back AFX | `Clawback` (Amount.issuer = holder) | issuer, and only after `asfAllowTrustLineClawback` was set on an empty owner directory |
| Allow AFX into TokenEscrow | `asfAllowTrustLineLocking` | issuer, one-way |
| Default ripple (needed for AMM) | `asfDefaultRipple` | issuer |
| Create MPT | `MPTokenIssuanceCreate` | issuer |
| Allow-list MPT holders | `MPTokenAuthorize` with `Holder` | issuer (`tfMPTRequireAuth`) |
| Lock MPT balances | `MPTokenIssuanceSet` `tfMPTLock` | issuer (`tfMPTCanLock`) |
| Claw back MPT | `Clawback` + `Holder` | issuer (`tfMPTCanClawback`) |
| Issue a credential | `CredentialCreate` | credential issuer (here: the same issuer account) |
| Define a permissioned DEX domain | `PermissionedDomainSet` | domain owner (here: the same issuer account) |

A compromised issuer seed can freeze holders, claw back issued balances, inflate IOU obligations, lock MPT, and rewrite who may enter the domain-gated book. That is the product. Do not ship a real issuer on a hot EOA.

Clawback **never** takes native XRP. If a holder is an AMM, `Clawback` of the pool is the wrong tx (`tecAMM_ACCOUNT`); `AMMClawback` exists for that case. This rehearsal claws a non-LP holder.

## Holders are untrusted

Alice and bob hold AFX because they `TrustSet` the issuer. They can pay each other, deposit to the AMM, escrow AFX, and (if credentialed) post a domain offer.

Unauthorized is a funded classic account that is **not** the issuer. It is used for deny paths. The issuer seed is never reused as unauthorized.

## Freeze vs clawback vs lock

- **DeepFreeze** on a trust line blocks the holder from sending or receiving that IOU on payments and offers. The issuer can still claw back.
- **MPT lock** is the analogue for MPT balances (`tfMPTLock`).
- **Clawback** moves issued value back to the issuer. It is a public ledger transaction, not an off-chain database edit and not a Solidity `onlyRole` function.

## Credentials are not KYC

`CredentialType` in this repo is the ASCII `AFXT_REHEARSAL` encoded as hex. The ledger stores that blob. It does not know a name, a passport, or a jurisdiction. Treating it as KYC is an off-chain process failure.

A Permissioned Domain lists which credential issuer + type may trade a domain-gated offer. An account without an accepted credential that submits `OfferCreate` with that `DomainID` should fail (`tecNO_PERMISSION`). That is a thin compliance demo, not a transfer agent.

## AMM and MPT boundary

There is at most one AMM per asset pair. This rehearsal uses **AFX/XRP** only. MPT is a companion issuance and is not deposited into the AMM and not placed in `OfferCreate`. Official docs still say DEX trading of MPTs is not implemented; this repo does not claim it.

## Assets / conservation (what Testnet can prove)

- Native XRP in these accounts is faucet Testnet XRP. It is not TVL.
- AFX outstanding is an issuer obligation. Clawback reduces the holder's AFX; it does not create XRP.
- TokenEscrow locks AFX until finish or cancel. CryptoConditions are disabled on this node, so time bounds are the settlement condition.

## Out of scope

- Mainnet, real value, AUM, a peg, RLUSD.
- XRPL EVM Sidechain, Solidity, ERC-20.
- Hooks (not XRPL).
- LendingProtocol, SingleAssetVault, Batch, DynamicMPT, ConfidentialTransfer, Sponsor, PermissionDelegation.
- Legal opinions, broker-dealer status, transfer-agent services, OFAC screening.

## Invariants this rehearsal actually checks

1. Four distinct classic accounts exist; issuer seed ≠ unauthorized seed.
2. Happy-path txs wait for validated ledgers and record `tesSUCCESS` hashes.
3. Deny-path txs are submitted and validated as `tec*` (not invented, not `tem*` only).
4. Probe output is the connected node's `build_version` + amendment set.
5. Amounts on the wire are decimal/integer strings, not IEEE floats.
