import { buildBackupFromLocalStorage, importBackupToCloud } from "@/lib/backup";

const MIGRATED_FLAG = "lankawealth_migrated_to_neon";

function hasLocalData(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const p = localStorage.getItem("lankawealth_portfolio");
    const s = localStorage.getItem("lankawealth_portfolio_snapshots");
    const sc = localStorage.getItem("lankawealth_scenarios");
    if (p) {
      const parsed = JSON.parse(p);
      const n =
        (parsed.fds?.length || 0) +
        (parsed.uts?.length || 0) +
        (parsed.treasury?.length || 0) +
        (parsed.dividends?.length || 0) +
        (parsed.pfcaFds?.length || 0);
      if (n > 0) return true;
    }
    if (s) {
      const snaps = JSON.parse(s);
      if (Array.isArray(snaps) && snaps.length > 0) return true;
    }
    if (sc) {
      const scenarios = JSON.parse(sc);
      if (Array.isArray(scenarios) && scenarios.length > 0) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
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
 * One-shot: push browser localStorage portfolio / snapshots / scenarios into Neon
 * when cloud slots are empty. Safe to call on every login.
 */
export async function migrateLocalStorageToNeon(): Promise<MigrateResult> {
  if (typeof window === "undefined") {
    return { ran: false, message: null };
  }

  if (localStorage.getItem(MIGRATED_FLAG) === "1") {
    return { ran: false, message: null };
  }

  if (!hasLocalData()) {
    localStorage.setItem(MIGRATED_FLAG, "1");
    return { ran: false, message: null };
  }

  const backup = buildBackupFromLocalStorage();
  const result = await importBackupToCloud(backup, "fill-empty");

  const imported = result.imported as MigrateResult["imported"];
  const didSomething =
    imported &&
    (imported.portfolio || imported.snapshots > 0 || imported.scenarios);

  // Mark done either way so we don't keep retrying when cloud already had data
  localStorage.setItem(MIGRATED_FLAG, "1");

  if (didSomething) {
    // Clear migrated keys so we don't dual-source later
    localStorage.removeItem("lankawealth_portfolio");
    localStorage.removeItem("lankawealth_portfolio_snapshots");
    localStorage.removeItem("lankawealth_scenarios");
    const parts: string[] = [];
    if (imported?.portfolio) parts.push("portfolio");
    if (imported && imported.snapshots > 0) parts.push(`${imported.snapshots} snapshots`);
    if (imported?.scenarios) parts.push("scenarios");
    return {
      ran: true,
      message: `Migrated local data to cloud: ${parts.join(", ")}`,
      imported,
    };
  }

  const skipped = imported?.skipped?.length
    ? `Cloud already had data (skipped: ${imported.skipped.join(", ")})`
    : "Nothing to migrate";
  return { ran: true, message: skipped, imported };
}
