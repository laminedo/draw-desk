import { LottoEngine } from "@/lib/lotto/engine";
import type { GameConfig, HeatmapMode } from "@/lib/lotto/types";

type Analysis = ReturnType<typeof LottoEngine.getAnalysis>;

export function AnalyzerTab({
  config,
  analysis,
  heatmapMode,
  setHeatmapMode,
}: {
  config: GameConfig;
  analysis: Analysis | null;
  heatmapMode: HeatmapMode;
  setHeatmapMode: (m: HeatmapMode) => void;
}) {
  const hasBonus = config.hasBonus !== false;
  if (!analysis) {
    return (
      <article className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        Load draw history to populate the analyzer.
      </article>
    );
  }
  const white = analysis.frequency.white as unknown as Array<{
    number: number;
    count: number;
    recentCount: number;
    drawsSinceSeen: number;
  }>;
  const mega = analysis.frequency.mega as unknown as typeof white;
  const valueOf = (item: (typeof white)[0]) =>
    heatmapMode === "hot"
      ? item.count
      : heatmapMode === "recent"
        ? item.recentCount
        : item.drawsSinceSeen;
  const maxW = Math.max(...white.map(valueOf), 1);
  const maxM = Math.max(...mega.map(valueOf), 1);

  return (
    <div className="space-y-4">
      <article className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
              Frequency heatmap
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              White balls 1–{config.whiteMax}
            </h2>
          </div>
          <div className="inline-flex rounded-full bg-bg p-1 shadow-[inset_0_0_0_1px_var(--color-border)]">
            {(
              [
                ["hot", "Hot"],
                ["recent", "Recent"],
                ["cold", "Overdue"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setHeatmapMode(id)}
                className={`h-8 rounded-full px-3 text-[12px] font-medium ${
                  heatmapMode === id ? "bg-fg text-bg" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Heatmap items={white} max={maxW} valueOf={valueOf} />
        {hasBonus && (
          <>
            <h3 className="mt-5 text-sm font-medium text-muted">{config.ballLabel}</h3>
            <Heatmap items={mega} max={maxM} valueOf={valueOf} />
          </>
        )}
        <div className="mt-4 flex items-center gap-2 text-[12px] text-muted">
          <span>Low</span>
          <span className="legend-bar" />
          <span>High</span>
          <span className="ml-2">
            {heatmapMode === "hot"
              ? "All-time frequency"
              : heatmapMode === "recent"
                ? "Last 50 draws"
                : "Draws since last seen"}
          </span>
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarCard
          eyebrow="Top numbers"
          title="Most frequent white balls"
          items={analysis.frequency.topWhite.slice(0, 10).map((i: { number: number; count: number }) => ({
            label: String(i.number),
            value: i.count,
          }))}
        />
        <BarCard
          eyebrow="Sum distribution"
          title="White-ball sums"
          items={analysis.distributions.sumBuckets.map((i: { label: string; value: number }) => ({
            label: i.label,
            value: i.value,
          }))}
          columns
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <BarCard
          eyebrow="Parity"
          title="Odd / even"
          items={analysis.distributions.oddEven.map((i: { label: string; value: number }) => ({
            label: i.label,
            value: i.value,
          }))}
        />
        <BarCard
          eyebrow="Halves"
          title="Low / high"
          items={analysis.distributions.lowHigh.map((i: { label: string; value: number }) => ({
            label: i.label,
            value: i.value,
          }))}
        />
        <article className="rounded-lg border border-border bg-surface p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
            Co-occurrence
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Strongest pairs</h2>
          <ul className="mt-3 space-y-1.5">
            {analysis.frequency.topPairs.map((p: { pair: string; count: number }) => (
              <li key={p.pair} className="flex justify-between text-sm">
                <span className="font-mono">{p.pair}</span>
                <span className="tabular-nums text-muted">{p.count}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  );
}

function Heatmap({
  items,
  max,
  valueOf,
}: {
  items: Array<{ number: number; count: number; recentCount: number; drawsSinceSeen: number }>;
  max: number;
  valueOf: (i: { number: number; count: number; recentCount: number; drawsSinceSeen: number }) => number;
}) {
  return (
    <div
      className="mt-4 grid gap-1"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(2.1rem, 1fr))" }}
    >
      {items.map((item) => {
        const pct = Math.round((valueOf(item) / max) * 100);
        return (
          <div
            key={item.number}
            className="heatmap-cell"
            title={`${item.number}: ${valueOf(item)}`}
            style={{
              background: `color-mix(in oklab, var(--color-accent) ${pct}%, #e8e8ed)`,
              color: pct > 62 ? "#fff" : "var(--color-fg)",
            }}
          >
            {item.number}
          </div>
        );
      })}
    </div>
  );
}

function BarCard({
  eyebrow,
  title,
  items,
  columns,
}: {
  eyebrow: string;
  title: string;
  items: { label: string; value: number }[];
  columns?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight">{title}</h2>
      <div className={`mt-3 ${columns ? "flex h-36 items-end gap-1" : "space-y-1.5"}`}>
        {items.map((item) =>
          columns ? (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-accent/80"
                style={{ height: `${(item.value / max) * 100}%` }}
                title={`${item.label}: ${item.value}`}
              />
              <span className="text-[9px] text-subtle">{item.label.split("-")[0]}</span>
            </div>
          ) : (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className="w-28 shrink-0 truncate text-muted">{item.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right tabular-nums text-muted">{item.value}</span>
            </div>
          ),
        )}
      </div>
    </article>
  );
}
