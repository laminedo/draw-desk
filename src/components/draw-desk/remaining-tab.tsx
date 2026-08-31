import { useMemo, useState } from "react";
import { LottoEngine } from "@/lib/lotto/engine";
import type { GameConfig } from "@/lib/lotto/types";
import { formatNumber } from "@/lib/utils";
import { BallRow } from "./balls";

export function RemainingTab({
  config,
  winnerIndex,
}: {
  config: GameConfig;
  winnerIndex: Map<string, unknown[]>;
}) {
  const [after, setAfter] = useState(0);
  const hasBonus = config.hasBonus !== false;
  const page = useMemo(
    () => LottoEngine.getRemaining(winnerIndex, config, after, 100),
    [winnerIndex, config, after],
  );

  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
            Remaining
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            Combinations never drawn
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAfter(0)}
            className="h-9 rounded-full border border-border px-3.5 text-sm font-medium"
          >
            First page
          </button>
          <button
            type="button"
            disabled={page.exhausted}
            onClick={() => setAfter(page.nextAfter || after)}
            className="h-9 rounded-full bg-accent px-3.5 text-sm font-medium text-accent-fg disabled:opacity-40"
          >
            Next page
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">
        {formatNumber(page.totalRemainingCombinations)} combinations have never won.
        Showing {formatNumber(page.rows.length)} rows after index {formatNumber(after)}.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-[12px] uppercase tracking-[0.06em] text-subtle">
            <tr>
              <th className="pb-2 font-medium">Index</th>
              <th className="pb-2 font-medium">Numbers</th>
              {hasBonus && <th className="pb-2 font-medium">{config.ballLabel}</th>}
              <th className="pb-2 font-medium">Key</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row: { combinationIndex: number; numbers: number[]; megaBall: number; key: string }) => (
              <tr key={row.combinationIndex} className="border-t border-border">
                <td className="py-2.5 tabular-nums">{formatNumber(row.combinationIndex)}</td>
                <td className="py-2.5">
                  <BallRow numbers={row.numbers} mini />
                </td>
                {hasBonus && (
                  <td className="py-2.5">
                    <BallRow numbers={[]} mega={row.megaBall} bonus mini />
                  </td>
                )}
                <td className="py-2.5 font-mono text-[12px] text-muted">{row.key}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
