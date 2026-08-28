import { buildBackupFromLocalStorage, importBackupToCloud } from "@/lib/backup";

const MIGRATED_FLAG = "lankawealth_migrated_to_neon";

export const LOCAL_KEYS = {
  portfolio: "lankawealth_portfolio",
  snapshots: "lankawealth_portfolio_snapshots",
  scenarios: "lankawealth_scenarios",
} as const;

/** Counts of what is still sitting in this browser's localStorage. */
export function localDataSummary() {
  const empty = { holdings: 0, snapshots: 0, scenarios: 0, any: false };
  if (typeof window === "undefined") return empty;
  const out = { ...empty };
  try {
    const p = localStorage.getItem(LOCAL_KEYS.portfolio);
    if (p) {
      const parsed = JSON.parse(p);
      out.holdings =
        (parsed.fds?.length || 0) +
        (parsed.uts?.length || 0) +
        (parsed.treasury?.length || 0) +
        (parsed.dividends?.length || 0) +
        (parsed.pfcaFds?.length || 0) +
        (parsed.stocks?.length || 0);
    }
    const s = localStorage.getItem(LOCAL_KEYS.snapshots);
    if (s) {
      const snaps = JSON.parse(s);
      if (Array.isArray(snaps)) out.snapshots = snaps.length;
    }
    const sc = localStorage.getItem(LOCAL_KEYS.scenarios);
    if (sc) {
      const scenarios = JSON.parse(sc);
      if (Array.isArray(scenarios)) out.scenarios = scenarios.length;
    }
  } catch {
    /* ignore malformed local data */
  }
  out.any = out.holdings > 0 || out.snapshots > 0 || out.scenarios > 0;
  return out;
}

export function hasLocalData(): boolean {
  return localDataSummary().any;
}

export type MigrateResult = {
  ran: boolean;
  message: string | null;
  imported?: {
    portfolio: boolean;
    snapshots: number;
    scenarios: boolean;
    skipped: string[];
  };
};

/**
 * Push browser localStorage portfolio / snapshots / scenarios into Neon.
 * User-triggered; `replace` overwrites cloud data that already exists.
 */
export async function migrateLocalStorageToNeon(
  options: { replace?: boolean } = {}
): Promise<MigrateResult> {
  if (typeof window === "undefined") {
    return { ran: false, message: null };
  }

  if (!hasLocalData()) {
    return { ran: false, message: "No local data found in this browser" };
  }

  const backup = buildBackupFromLocalStorage();
  const result = await importBackupToCloud(backup, options.replace ? "replace" : "fill-empty");
  const imported = result.imported as MigrateResult["imported"];
  const didSomething =
    !!imported && (imported.portfolio || imported.snapshots > 0 || imported.scenarios);

  if (didSomething) {
    localStorage.setItem(MIGRATED_FLAG, "1");
    localStorage.removeItem(LOCAL_KEYS.portfolio);
    localStorage.removeItem(LOCAL_KEYS.snapshots);
    localStorage.removeItem(LOCAL_KEYS.scenarios);
    const parts: string[] = [];
    if (imported?.portfolio) parts.push("portfolio");
    if (imported && imported.snapshots > 0) parts.push(`${imported.snapshots} snapshots`);
    if (imported?.scenarios) parts.push("scenarios");
    return { ran: true, message: `Migrated to cloud: ${parts.join(", ")}`, imported };
  }

  const skipped = imported?.skipped?.length
    ? `Cloud already has data (skipped: ${imported.skipped.join(", ")}). Tick "Replace cloud data" to overwrite.`
    : "Nothing to migrate";
  return { ran: true, message: skipped, imported };
}
