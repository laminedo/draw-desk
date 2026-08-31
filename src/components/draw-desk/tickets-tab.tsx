import { Link } from "@tanstack/react-router";
import { LottoEngine } from "@/lib/lotto/engine";
import type { DrawRecord, GameConfig, SavedTicket } from "@/lib/lotto/types";
import { formatMoney, formatNumber } from "@/lib/utils";
import { BallRow } from "./balls";

export function TicketsTab({
  config,
  records,
  tickets,
  signedIn,
  alertsOn,
  justSavedId,
  onDelete,
  onOpenPredictor,
}: {
  config: GameConfig;
  records: DrawRecord[];
  tickets: SavedTicket[];
  signedIn: boolean;
  alertsOn?: boolean;
  justSavedId: string | null;
  onDelete: (id: string) => void;
  onOpenPredictor: () => void;
}) {
  const hasBonus = config.hasBonus !== false;
  const latest = records[0] || null;
  const verification = LottoEngine.verifySavedTickets(tickets, latest, config);

  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">
            Prize verification
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            Saved numbers checked against the latest draw
          </h2>
        </div>
        <span className="inline-flex h-8 items-center rounded-full bg-bg px-3 text-[12px] text-muted shadow-[inset_0_0_0_1px_var(--color-border)]">
          {latest ? `Live draw sync · ${latest.drawDate}` : "Waiting for draw data"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {signedIn
          ? "These tickets belong to your account and sync across devices."
          : "You are browsing as a guest — tickets stay on this device until you sign in, then they merge into your account."}{" "}
        {!signedIn && (
          <Link to="/login" className="text-accent">
            Sign in
          </Link>
        )}{" "}
        {alertsOn
          ? "Jackpot and prize hits also send a notification on this device."
          : "Allow notifications when prompted if you want an alert for jackpot or prize hits."}
      </p>

      {!tickets.length ? (
        <div className="mt-8 text-center">
          <h3 className="text-base font-semibold">No saved numbers yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Generate combinations in Predictor and tap Save picks. Each ticket is
            checked against the latest official winning numbers.
          </p>
          <button
            type="button"
            onClick={onOpenPredictor}
            className="mt-4 h-10 rounded-full bg-accent px-5 text-sm font-medium text-accent-fg"
          >
            Open predictor
          </button>
        </div>
      ) : (
        <>
          {latest && (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted">Official winning numbers ({latest.drawDate})</span>
              <BallRow
                numbers={latest.numbers}
                mega={latest.megaBall}
                bonus={hasBonus}
                mini
              />
            </div>
          )}
          <div
            className={`mt-4 rounded-md px-4 py-3 text-sm leading-relaxed ${
              verification.hasJackpot
                ? "bg-warn/10 text-warn"
                : verification.hasWinningMatch
                  ? "bg-success/10 text-success"
                  : "bg-bg text-muted"
            }`}
          >
            {verification.hasJackpot
              ? `Jackpot detected. A saved combination matched all winning numbers for the official draw on ${latest?.drawDate}.`
              : verification.hasTier2
                ? `Tier 2 flagged. A saved combination matched 5 white balls on ${latest?.drawDate}.`
                : verification.hasWinningMatch
                  ? `${verification.winningPicksCount} winning combination${verification.winningPicksCount === 1 ? "" : "s"} flagged. Estimated payout ${formatMoney(verification.totalEstimatedPrize)}.`
                  : `All ${verification.totalPicks} saved combinations checked against the latest official draw (${latest?.drawDate || "N/A"}). No prize tier hit.`}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniKpi label="Checked picks" value={formatNumber(verification.totalPicks)} note={`${verification.totalTickets} ticket${verification.totalTickets === 1 ? "" : "s"}`} />
            <MiniKpi label="Winning matches" value={formatNumber(verification.winningPicksCount)} note={verification.winningPicksCount ? "Official tier hit" : "0 in latest draw"} />
            <MiniKpi
              label="Highest status"
              value={
                verification.highestTier
                  ? String((verification.highestTier as { status?: string }).status || "No match")
                  : "No match"
              }
              note={
                verification.highestTier
                  ? String((verification.highestTier as { tierName?: string }).tierName || "No tier hit")
                  : "No tier hit"
              }
            />
            <MiniKpi
              label="Est. prize"
              value={
                verification.totalEstimatedPrize > 0
                  ? formatMoney(verification.totalEstimatedPrize)
                  : verification.hasJackpot
                    ? "Jackpot"
                    : "$0"
              }
              note="Latest official draw"
            />
          </div>

          <div className="mt-5 space-y-3">
            {tickets.map((ticket) => {
              const sim = LottoEngine.simulatePicks(ticket.picks, records, config);
              return (
                <article
                  key={ticket.id}
                  className={`rounded-md border border-border p-4 ${
                    ticket.id === justSavedId ? "ring-2 ring-accent/40" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] text-muted">
                      Saved {new Date(ticket.savedAt).toLocaleString()} · Strategy{" "}
                      <strong className="font-medium text-fg">{ticket.strategy}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => onDelete(ticket.id)}
                      className="h-8 rounded-full px-3 text-[13px] font-medium text-danger"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {ticket.picks.map((pick, idx) => {
                      const ver = latest
                        ? LottoEngine.verifyPickAgainstDraw(pick, latest, config)
                        : null;
                      const matched = new Set<number>(ver?.matchedWhites || []);
                      return (
                        <div key={idx} className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <BallRow
                              numbers={pick.numbers}
                              mega={pick.megaBall}
                              bonus={hasBonus}
                              matchedWhites={matched}
                              matchedBonus={Boolean(ver?.matchedBonus)}
                            />
                            {ver && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  ver.isWin
                                    ? "bg-success/10 text-success"
                                    : "bg-bg text-muted"
                                }`}
                              >
                                {ver.status}
                              </span>
                            )}
                          </div>
                          {ver && (
                            <div className="text-[13px] text-muted">
                              <div className="flex gap-2">
                                <strong className={ver.isWin ? "text-success" : "text-fg"}>
                                  {ver.tierName}
                                </strong>
                                <span>{ver.prizeFormatted}</span>
                              </div>
                              <p>
                                Latest draw ({latest!.drawDate}): matched {ver.whiteMatchCount}{" "}
                                number{ver.whiteMatchCount === 1 ? "" : "s"}
                                {hasBonus && ver.matchedBonus ? ` + ${config.ballLabel}` : ""}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-md bg-bg px-3 py-2 text-[12px] text-muted">
                    What-if: {formatNumber(sim.draws)} draws · spent{" "}
                    <strong className="text-fg">{formatMoney(sim.spent)}</strong>
                    {sim.hasDollarTable && (
                      <>
                        {" "}
                        · won back <strong className="text-fg">{formatMoney(sim.totalWon)}</strong>{" "}
                        ({(sim.returnRate * 100).toFixed(1)}%)
                      </>
                    )}
                    {" "}
                    · net{" "}
                    <strong className={sim.net >= 0 ? "text-success" : "text-danger"}>
                      {sim.net >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(sim.net))}
                    </strong>
                    {" "}
                    · jackpots {sim.jackpots}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </article>
  );
}

function MiniKpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-md bg-bg px-3 py-3">
      <span className="text-[11px] uppercase tracking-[0.08em] text-subtle">{label}</span>
      <strong className="mt-1 block text-lg font-semibold tabular-nums">{value}</strong>
      <small className="text-[11px] text-muted">{note}</small>
    </div>
  );
}
