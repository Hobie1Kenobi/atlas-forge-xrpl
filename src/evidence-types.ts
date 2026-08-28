export type TxRecord = {
  hash: string;
  result: string;
  ledger_index: number;
  type: string;
  label: string;
  validated: boolean;
  explorer: string;
  sequence: number;
};

export type Evidence = {
  status: "EXECUTED" | "INCOMPLETE" | "BLOCKED";
  disclaimer: string;
  network: {
    name: string;
    wss: string;
    rpc: string;
    explorer: string;
    build_version: string;
    network_id: number;
    server_state: string;
    validated_ledger: number;
    complete_ledgers: string;
    probed_at: string;
  };
  amendments: {
    enabled: string[];
    disabled: string[];
    used: string[];
    refused: string[];
  };
  accounts: {
    issuer: string;
    alice: string;
    bob: string;
    unauthorized: string;
  };
  token: {
    public_name: string;
    public_ticker: string;
    classic_currency: string;
    mpt_ticker: string;
    mpt_asset_class: string;
    mpt_issuance_id: string;
  };
  objects: {
    amm_account: string;
    domain_id: string;
    credential_type_hex: string;
    escrow_finish_owner: string;
    escrow_finish_sequence: number;
    escrow_cancel_owner: string;
    escrow_cancel_sequence: number;
    deny_escrow_owner: string;
    deny_escrow_sequence: number;
  };
  happy_path: Record<string, TxRecord>;
  deny_path: Record<string, TxRecord>;
  blocked_error: string;
};

export const DISCLAIMER =
  "issuer is centralized; test token; no peg. Testnet rehearsal only. Not an issuance.";

export function emptyEvidence(): Evidence {
  return {
    status: "INCOMPLETE",
    disclaimer: DISCLAIMER,
    network: {
      name: "testnet",
      wss: "",
      rpc: "",
      explorer: "",
      build_version: "",
      network_id: 1,
      server_state: "",
      validated_ledger: 0,
      complete_ledgers: "",
      probed_at: "",
    },
    amendments: { enabled: [], disabled: [], used: [], refused: [] },
    accounts: { issuer: "", alice: "", bob: "", unauthorized: "" },
    token: {
      public_name: "Atlas Forge XRPL Test Token",
      public_ticker: "AFXT",
      classic_currency: "AFX",
      mpt_ticker: "AFXT",
      mpt_asset_class: "other",
      mpt_issuance_id: "",
    },
    objects: {
      amm_account: "",
      domain_id: "",
      credential_type_hex: "",
      escrow_finish_owner: "",
      escrow_finish_sequence: 0,
      escrow_cancel_owner: "",
      escrow_cancel_sequence: 0,
      deny_escrow_owner: "",
      deny_escrow_sequence: 0,
    },
    happy_path: {},
    deny_path: {},
    blocked_error: "",
  };
}
