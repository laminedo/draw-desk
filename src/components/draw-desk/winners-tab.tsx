import { useMemo, useState } from "react";
import type { DrawRecord, GameConfig } from "@/lib/lotto/types";
import { formatNumber } from "@/lib/utils";
import { BallRow } from "./balls";

export function WinnersTab({
  config,
  records,
}: {
  config: GameConfig;
  records: DrawRecord[];
}) {
  const [q, setQ] = useState("");
  const hasBonus = config.hasBonus !== false;
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return records.filter((row) => {
      if (!term) return true;
      return `${row.drawDate} ${row.numbers.join(" ")} ${row.megaBall}`.toLowerCase().includes(term);
    });
  }, [records, q]);

  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
            Archive
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            Jackpot-winning numbers
          </h2>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter date or numbers"
          className="h-10 w-full max-w-xs rounded-md border border-border bg-bg px-3 text-sm outline-none focus:border-accent sm:w-56"
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-[12px] uppercase tracking-[0.06em] text-subtle">
            <tr>
              <th className="pb-2 font-medium">Draw date</th>
              <th className="pb-2 font-medium">Winning numbers</th>
              {hasBonus && <th className="pb-2 font-medium">{config.ballLabel}</th>}
              <th className="pb-2 font-medium">Index</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 400).map((row) => (
              <tr key={`${row.drawDate}-${row.key}`} className="border-t border-border">
                <td className="py-2.5 tabular-nums">
                  {row.drawDate}
                  {row.doublePlay && (
                    <span className="ml-1.5 rounded bg-bg px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                      DP
                    </span>
                  )}
                </td>
                <td className="py-2.5">
                  <BallRow numbers={row.numbers} mini />
                </td>
                {hasBonus && (
                  <td className="py-2.5">
                    <BallRow numbers={[]} mega={row.megaBall} bonus mini />
                  </td>
                )}
                <td className="py-2.5 tabular-nums text-muted">
                  {row.combinationIndex == null ? "—" : formatNumber(row.combinationIndex)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 400 && (
          <p className="mt-3 text-[12px] text-subtle">
            Showing 400 of {formatNumber(rows.length)} draws. Refine the filter to narrow.
          </p>
        )}
      </div>
    </article>
  );
}
