import { useEffect, useState } from "react";
import { LottoEngine } from "@/lib/lotto/engine";
import type { DrawRecord, GameConfig } from "@/lib/lotto/types";
import { formatNumber } from "@/lib/utils";
import { BallRow } from "./balls";
import { Heart, RefreshCw } from "lucide-react";

type Predictions = ReturnType<typeof LottoEngine.getPredictions>;

const SCORE_MS = 720;

export function PredictorTab({
  config,
  records,
  winnerIndex,
  onSave,
}: {
  config: GameConfig;
  records: DrawRecord[];
  winnerIndex: Map<string, DrawRecord[]>;
  onSave: (picks: { numbers: number[]; megaBall: number }[], strategy: string) => void;
}) {
  const [salt, setSalt] = useState("");
  const [data, setData] = useState<Predictions | null>(null);
  const [busy, setBusy] = useState(false);
  const hasBonus = config.hasBonus !== false;

  useEffect(() => {
    if (!records.length) {
      setData(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    setBusy(true);
    const started = performance.now();
    const work = window.setTimeout(() => {
      let next: Predictions | null = null;
      try {
        next = LottoEngine.getPredictions(records, winnerIndex, config, "balanced", salt);
      } catch {
        next = null;
      }
      const remain = Math.max(0, SCORE_MS - (performance.now() - started));
      window.setTimeout(() => {
        if (cancelled) return;
        setData(next);
        setBusy(false);
      }, remain);
    }, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(work);
    };
  }, [records, winnerIndex, config, salt]);

  if (!records.length) {
    return (
      <article className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        Load draw history before generating picks.
      </article>
    );
  }

  const p = data?.patterns;

  return (
    <div className="space-y-4">
      <article className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
              Pattern engine
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Strategy picks from remaining combinations
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !data?.suggestions?.length}
              onClick={() => {
                if (!data?.suggestions?.length) return;
                onSave(
                  data.suggestions.map((s: { numbers: number[]; megaBall: number }) => ({
                    numbers: s.numbers,
                    megaBall: s.megaBall,
                  })),
                  data.strategy.label,
                );
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium disabled:opacity-40"
            >
              <Heart className="size-3.5" />
              Save picks
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setSalt(String(Date.now()))}
              aria-busy={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-medium text-accent-fg disabled:opacity-80"
            >
              <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
              {busy ? "Scoring…" : "New picks"}
            </button>
          </div>
        </div>
        {busy && (
          <div className="pick-loading-bar mt-3" aria-hidden="true">
            <i />
          </div>
        )}
        <div className="mt-3 inline-flex rounded-full bg-bg p-1 shadow-[inset_0_0_0_1px_var(--color-border)]">
          <span className="h-8 rounded-full bg-fg px-3 text-[12px] font-medium leading-8 text-bg">
            Balance
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">{data?.strategy.tagline}</p>
        <p className="mt-2 text-[13px] text-subtle">
          {busy
            ? "Scoring remaining combinations…"
            : data
              ? `${data.disclaimer} Evaluated ${formatNumber(data.candidatesEvaluated)} candidates from ${formatNumber(data.sourceDraws)} draws.`
              : "Scoring remaining combinations…"}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {busy ? (
            [0, 1, 2].map((i) => (
              <PickSkeleton key={i} delay={i} balls={config.whitePick} bonus={hasBonus} />
            ))
          ) : (
            (data?.suggestions || []).map(
              (pick: {
                rank: number;
                numbers: number[];
                megaBall: number;
                score: number;
                combinationIndex: number;
                breakdown: Array<{ label: string; value: number }>;
                patternNotes: string[];
              }) => (
                <article
                  key={`${salt}-${pick.rank}`}
                  className="pick-card rounded-md border border-border bg-bg p-4"
                >
                  <div className="flex items-center justify-between text-[12px] text-muted">
                    <span>Pick {pick.rank} · Balance</span>
                    <span className="tabular-nums">{pick.score}% match</span>
                  </div>
                  <div className="mt-3">
                    <BallRow
                      numbers={pick.numbers}
                      mega={pick.megaBall}
                      bonus={hasBonus}
                    />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {pick.breakdown.slice(0, 5).map((c) => (
                      <div key={c.label} className="flex items-center gap-2 text-[11px]">
                        <span className="w-[7.5rem] truncate text-muted">{c.label}</span>
                        <div className="pb-track">
                          <div className="pb-fill" style={{ width: `${Math.min(100, c.value * 100)}%` }} />
                        </div>
                        <span className="w-6 text-right tabular-nums">{Math.round(c.value * 100)}</span>
                      </div>
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1 text-[12px] leading-snug text-muted">
                    {pick.patternNotes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-subtle">
                    Remaining combo · index {formatNumber(pick.combinationIndex)}
                  </p>
                </article>
              ),
            )
          )}
        </div>
      </article>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-border bg-surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
            Signals
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            Historical pattern summary
          </h2>
          {p && (
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Average white-ball sum" v={`${p.averageSum} ± ${p.sumStdDev}`} />
              <Row k="Most common odd/even" v={String(p.strongestOddEvenPattern || "N/A")} />
              <Row k="Most common low/high" v={String(p.strongestLowHighPattern || "N/A")} />
              <Row k="Hot white balls" v={p.hottestWhiteNumbers.slice(0, 8).join(", ")} />
              <Row k="Recent form" v={(p.hottestRecentWhiteNumbers || []).slice(0, 8).join(", ")} />
              <Row k="Longest gaps" v={p.longestWhiteGaps.slice(0, 8).join(", ")} />
              {hasBonus && (
                <Row k={`Hot ${data?.ballLabel}s`} v={p.hottestMegaBalls.slice(0, 6).join(", ")} />
              )}
              <Row k="Strongest pairs" v={p.strongestPairs.map((x: { pair: string }) => x.pair).join(", ")} />
            </dl>
          )}
        </article>
        <article className="rounded-lg border border-border bg-surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
            Method
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">How picks are scored</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
            {(data?.method || []).map((step: string) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      </div>
    </div>
  );
}

function PickSkeleton({
  delay,
  balls,
  bonus,
}: {
  delay: number;
  balls: number;
  bonus: boolean;
}) {
  return (
    <article className="rounded-md border border-border bg-bg p-4" aria-hidden="true">
      <div className="flex items-center justify-between">
        <span className="pick-skel-line h-3 w-24" />
        <span className="pick-skel-line h-3 w-12" />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {Array.from({ length: balls }, (_, i) => (
          <span
            key={i}
            className="pick-skel-ball"
            style={{ animationDelay: `${delay * 90 + i * 70}ms` }}
          />
        ))}
        {bonus && (
          <span
            className="pick-skel-ball bonus"
            style={{ animationDelay: `${delay * 90 + balls * 70}ms` }}
          />
        )}
      </div>
      <div className="mt-4 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="pick-skel-line h-2.5 w-20" />
            <span className="pick-skel-line h-2 flex-1" />
          </div>
        ))}
      </div>
    </article>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 sm:flex-row sm:justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  );
}
