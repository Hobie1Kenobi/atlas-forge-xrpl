import { Client } from "xrpl";
import {
  config,
  FALLBACK_RPC,
  FALLBACK_WSS,
  REFUSED_AMENDMENTS,
  USED_AMENDMENTS,
} from "./config.ts";
import { BlockedError, log } from "./log.ts";

export type FeatureMap = Record<
  string,
  { enabled: boolean; name: string; supported?: boolean }
>;

export type ProbeResult = {
  build_version: string;
  network_id: number;
  server_state: string;
  validated_ledger: number;
  complete_ledgers: string;
  wss: string;
  rpc: string;
  enabled: string[];
  disabled: string[];
  used: string[];
  refused: string[];
  missing_used: string[];
};

async function rpc(url: string, method: string, params: unknown[] = [{}]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  if (!response.ok) {
    throw new Error(`RPC ${url} HTTP ${response.status}`);
  }
  const body = (await response.json()) as {
    result?: Record<string, unknown>;
    error?: string;
  };
  if (!body.result) {
    throw new Error(`RPC ${url} missing result`);
  }
  return body.result;
}

export async function rpcWithFallback(
  method: string,
  params: unknown[] = [{}],
): Promise<{ url: string; result: Record<string, unknown> }> {
  const urls = [config.rpc, ...FALLBACK_RPC];
  const errors: string[] = [];
  for (const url of urls) {
    try {
      const result = await rpc(url, method, params);
      return { url, result };
    } catch (error) {
      errors.push(`${url}: ${(error as Error).message}`);
    }
  }
  throw new BlockedError(`all RPC endpoints failed: ${errors.join("; ")}`);
}

export async function connectClient(): Promise<{ client: Client; wss: string }> {
  const urls = [config.wss, ...FALLBACK_WSS];
  const errors: string[] = [];
  for (const url of urls) {
    const client = new Client(url);
    try {
      await client.connect();
      log("connected", url);
      return { client, wss: url };
    } catch (error) {
      errors.push(`${url}: ${(error as Error).message}`);
      try {
        await client.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
  throw new BlockedError(`all WSS endpoints failed: ${errors.join("; ")}`);
}

export function parseFeatures(features: FeatureMap): {
  enabled: string[];
  disabled: string[];
} {
  const enabled: string[] = [];
  const disabled: string[] = [];
  for (const value of Object.values(features)) {
    const name = value.name;
    if (value.enabled) enabled.push(name);
    else disabled.push(name);
  }
  enabled.sort();
  disabled.sort();
  return { enabled, disabled };
}

export async function probeNetwork(): Promise<ProbeResult> {
  const { url, result } = await rpcWithFallback("server_info");
  const info = result.info as {
    build_version: string;
    network_id?: number;
    server_state: string;
    complete_ledgers: string;
    validated_ledger?: { seq: number };
  };
  const featureBody = await rpcWithFallback("feature");
  const features = (featureBody.result.features ?? {}) as FeatureMap;
  const { enabled, disabled } = parseFeatures(features);
  const used = USED_AMENDMENTS.filter((name) => enabled.includes(name));
  const refused = [
    ...REFUSED_AMENDMENTS.filter(
      (name) => disabled.includes(name) || !enabled.includes(name),
    ),
  ];
  const missing_used = USED_AMENDMENTS.filter((name) => !enabled.includes(name));
  const probe: ProbeResult = {
    build_version: info.build_version,
    network_id: info.network_id ?? 1,
    server_state: info.server_state,
    validated_ledger: info.validated_ledger?.seq ?? 0,
    complete_ledgers: info.complete_ledgers,
    wss: config.wss,
    rpc: url,
    enabled,
    disabled,
    used,
    refused,
    missing_used,
  };
  log("probe", {
    build_version: probe.build_version,
    network_id: probe.network_id,
    server_state: probe.server_state,
    validated_ledger: probe.validated_ledger,
    complete_ledgers: probe.complete_ledgers,
  });
  return probe;
}

export function assertUsableProbe(probe: ProbeResult): void {
  if (probe.server_state !== "full" && probe.server_state !== "proposing") {
    throw new BlockedError(`server_state=${probe.server_state}, need full`);
  }
  if (probe.missing_used.length > 0) {
    log(
      "warning: expected amendments missing on this node",
      probe.missing_used.join(","),
    );
  }
}
