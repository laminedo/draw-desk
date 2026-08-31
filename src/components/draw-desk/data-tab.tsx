import { useRef, useState } from "react";
import { LottoEngine } from "@/lib/lotto/engine";
import type { DrawRecord, GameConfig } from "@/lib/lotto/types";

export function DataTab({
  config,
  records,
  status,
  updating,
  onUpdate,
  onImport,
  onClear,
}: {
  config: GameConfig;
  records: DrawRecord[];
  status: string;
  updating: boolean;
  onUpdate: () => void;
  onImport: (text: string) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [fileName, setFileName] = useState("Choose CSV or JSON file…");

  async function importFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const text = await file.text();
    onImport(text);
  }

  function downloadCsv() {
    const csv = LottoEngine.toCsv(records, config);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.id}-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-lg border border-border bg-surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
          History
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Load draw history</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          History loads from the bundled archive when the page opens. New draws are
          merged from NY Open Data (Mega Millions, Powerball) and Washington Lottery
          (Hit 5, Lotto). Your imports are never overwritten.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUpdate}
            disabled={updating}
            className="h-10 rounded-full bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-60"
          >
            {updating ? "Checking…" : "Check for new draws"}
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!records.length}
            className="h-10 rounded-full border border-border px-4 text-sm font-medium disabled:opacity-40"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={onClear}
            className="h-10 rounded-full px-4 text-sm font-medium text-muted"
          >
            Clear saved data
          </button>
        </div>
        <p className="mt-4 rounded-md bg-bg px-3 py-3 text-sm leading-relaxed text-muted">
          {status}
        </p>
      </article>
      <article className="rounded-lg border border-border bg-surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
          Import
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Your own CSV / JSON</h2>
        <label className="mt-4 flex h-11 cursor-pointer items-center rounded-md border border-dashed border-border px-3 text-sm text-muted">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            onChange={(e) =>
              setFileName(e.target.files?.[0]?.name || "Choose CSV or JSON file…")
            }
          />
          {fileName}
        </label>
        <button
          type="button"
          onClick={() => void importFile()}
          className="mt-3 h-10 rounded-full border border-border px-4 text-sm font-medium"
        >
          Import file
        </button>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="Or paste CSV / JSON history here"
          className="mt-4 min-h-24 w-full rounded-md border border-border bg-bg p-3 font-mono text-[12px] outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => {
            onImport(paste);
            setPaste("");
          }}
          className="mt-3 h-10 rounded-full px-4 text-sm font-medium text-muted"
        >
          Import pasted data
        </button>
      </article>
    </div>
  );
}
