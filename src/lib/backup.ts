export type BackupFile = {
  version: 1;
  exportedAt: string;
  portfolio: {
    fds: unknown[];
    uts: unknown[];
    treasury: unknown[];
    dividends?: unknown[];
    pfcaFds?: unknown[];
  };
  snapshots: unknown[];
  scenarios: unknown[];
};

const KEYS = {
  portfolio: "lankawealth_portfolio",
  snapshots: "lankawealth_portfolio_snapshots",
  scenarios: "lankawealth_scenarios",
} as const;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Build a backup object from current browser localStorage (if any). */
export function buildBackupFromLocalStorage(): BackupFile {
  const portfolio = safeParse(localStorage.getItem(KEYS.portfolio), {
    fds: [],
    uts: [],
    treasury: [],
    dividends: [],
    pfcaFds: [],
  });
  const snapshots = safeParse(localStorage.getItem(KEYS.snapshots), [] as unknown[]);
  const scenarios = safeParse(localStorage.getItem(KEYS.scenarios), [] as unknown[]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    portfolio,
    snapshots: Array.isArray(snapshots) ? snapshots : [],
    scenarios: Array.isArray(scenarios) ? scenarios : [],
  };
}

export function downloadBackup(backup: BackupFile, filename?: string) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `lankawealth-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportLocalStorageBackup() {
  const backup = buildBackupFromLocalStorage();
  downloadBackup(backup);
  return backup;
}

export async function importBackupToCloud(
  backup: BackupFile,
  mode: "fill-empty" | "replace" = "fill-empty"
) {
  const res = await fetch("/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...backup, mode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Import failed");
  return data;
}
