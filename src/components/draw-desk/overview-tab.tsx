import { useEffect, useMemo, useState } from "react";
import { LottoEngine } from "@/lib/lotto/engine";
import type { DrawRecord, GameConfig } from "@/lib/lotto/types";
import { formatNumber } from "@/lib/utils";
import { BallRow } from "./balls";

export function OverviewTab({
  config,
  records,
  winnerIndex,
  analysis,
}: {
  config: GameConfig;
  records: DrawRecord[];
  winnerIndex: Map<string, DrawRecord[]>;
  analysis: ReturnType<typeof LottoEngine.getAnalysis> | null;
}) {
  const pick = config.whitePick;
  const hasBonus = config.hasBonus !== false;
  const [whites, setWhites] = useState<string[]>(() => Array(pick).fill(""));
  const [bonus, setBonus] = useState("");
  const [result, setResult] = useState<{
    kind: "idle" | "win" | "miss" | "error";
    text: string;
  }>({ kind: "idle", text: "Enter a combination above." });

  useEffect(() => {
    setWhites(Array(pick).fill(""));
    setBonus("");
    setResult({ kind: "idle", text: "Enter a combination above." });
  }, [pick, config.id]);

  const drawnWhite = useMemo(() => {
    const s = new Set<number>();
    for (const r of records) for (const n of r.numbers) s.add(n);
    return s;
  }, [records]);
  const drawnBonus = useMemo(() => {
    const s = new Set<number>();
    for (const r of records) s.add(r.megaBall);
    return s;
  }, [records]);

  function tone(value: string, isBonus: boolean) {
    const n = Number(value);
    if (!Number.isInteger(n)) return "";
    const drawn = isBonus ? drawnBonus.has(n) : drawnWhite.has(n);
    return drawn ? "border-danger text-danger" : "border-success text-success";
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    try {
      const numbers = whites.map(Number);
      const mega = hasBonus ? Number(bonus) : 1;
      const found = LottoEngine.searchCombination(numbers, mega, winnerIndex, config);
      if (found.hasWonJackpot) {
        const dates = found.matches.map((m: DrawRecord) => m.drawDate).join(", ");
        setResult({
          kind: "win",
          text: `Historical jackpot match. ${found.key} won on ${dates}. Combination index ${formatNumber(found.combinationIndex)}.`,
        });
      } else {
        setResult({
          kind: "miss",
          text: `No jackpot match in loaded history. ${found.key} is still a remaining combination. Index ${formatNumber(found.combinationIndex)}.`,
        });
      }
    } catch (err) {
      setResult({
        kind: "error",
        text: err instanceof Error ? err.message : "Invalid combination",
      });
    }
  }

  const insights = analysis?.insights ?? [
    { title: "Load historical draws", body: "Use Data to fetch or import history and populate the analyzer." },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-lg border border-border bg-surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
          Exact match
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Jackpot lookup</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Check whether a combination has ever won a jackpot in the loaded history.
          As you type, each number turns{" "}
          <b className="font-medium text-danger">red</b> if it has been drawn before,{" "}
          <b className="font-medium text-success">green</b> if it has never been drawn.
        </p>
        <form onSubmit={search} className="mt-4 flex flex-wrap items-center gap-2">
          {whites.map((v, i) => (
            <input
              key={i}
              inputMode="numeric"
              value={v}
              onChange={(e) => {
                const next = [...whites];
                next[i] = e.target.value.replace(/\D/g, "").slice(0, 2);
                setWhites(next);
              }}
              className={`size-14 rounded-full border bg-bg text-center font-mono text-base font-semibold outline-none ${tone(v, false) || "border-border"}`}
              aria-label={`Ball ${i + 1}`}
            />
          ))}
          {hasBonus && (
            <input
              inputMode="numeric"
              value={bonus}
              onChange={(e) => setBonus(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className={`size-14 rounded-full border bg-bg text-center font-mono text-base font-semibold outline-none ${tone(bonus, true) || "border-border"}`}
              aria-label={config.ballLabel}
            />
          )}
          <button
            type="submit"
            className="h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-fg"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setWhites(Array(pick).fill(""));
              setBonus("");
              setResult({ kind: "idle", text: "Enter a combination above." });
            }}
            className="h-11 rounded-full px-4 text-sm font-medium text-muted"
          >
            Clear
          </button>
        </form>
        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm leading-relaxed ${
            result.kind === "win"
              ? "border-success bg-success/5 text-success"
              : result.kind === "miss"
                ? "border-accent/30 bg-accent/5 text-fg"
                : result.kind === "error"
                  ? "border-danger text-danger"
                  : "border-dashed border-border text-muted"
          }`}
        >
          {result.text}
        </div>
        {records[0] && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>Latest</span>
            <BallRow
              numbers={records[0].numbers}
              mega={records[0].megaBall}
              bonus={hasBonus}
              mini
            />
          </div>
        )}
      </article>
      <article className="rounded-lg border border-border bg-surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
          Analyzer
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Quick read</h2>
        <ul className="mt-4 space-y-3">
          {insights.map((item: { title: string; body: string }) => (
            <li key={item.title} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <strong className="block text-sm font-medium">{item.title}</strong>
              <span className="mt-0.5 block text-sm leading-relaxed text-muted">
                {item.body}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
