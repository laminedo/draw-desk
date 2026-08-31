import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LottoEngine } from "@/lib/lotto/engine";
import type {
  DrawRecord,
  GameConfig,
  GameId,
  HeatmapMode,
  HistoryMeta,
  JackpotMap,
  SavedTicket,
  TabId,
} from "@/lib/lotto/types";
import { formatNumber } from "@/lib/utils";
import { AuthSlot } from "./auth-slot";
import { OverviewTab } from "./overview-tab";
import { AnalyzerTab } from "./analyzer-tab";
import { PredictorTab } from "./predictor-tab";
import { TicketsTab } from "./tickets-tab";
import { WinnersTab } from "./winners-tab";
import { RemainingTab } from "./remaining-tab";
import { DataTab } from "./data-tab";
import { fetchJackpots, fetchLiveDraws } from "@/lib/live";
import { clearHistory, loadHistory, mergeHistory } from "@/lib/lotto/history-store";
import {
  addGuestTicket,
  clearGuestTickets,
  loadGuestTickets,
  removeGuestTicket,
} from "@/lib/lotto/guest-tickets";
import { deleteTicket, listTickets, mergeGuestTickets, saveTicket } from "@/lib/tickets";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RefreshCw } from "lucide-react";

const GAMES: GameId[] = ["mega", "powerball", "hit5", "walotto"];
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "analyzer", label: "Analyzer" },
  { id: "predictor", label: "Predictor" },
  { id: "tickets", label: "Tickets" },
  { id: "winners", label: "Winners" },
  { id: "remaining", label: "Remaining" },
  { id: "data", label: "Data" },
];
const STALE_DAYS: Record<GameId, number> = {
  mega: 3,
  powerball: 3,
  hit5: 1.5,
  walotto: 2,
};
const GAME_KEY = "drawdesk-game";

function cfgOf(game: GameId): GameConfig {
  return LottoEngine.GAME_CONFIGS[game] as GameConfig;
}

export function Dashboard() {
  const { user, isPending } = useCurrentUserState();
  const [game, setGameState] = useState<GameId>(() => {
    if (typeof localStorage === "undefined") return "mega";
    const saved = localStorage.getItem(GAME_KEY);
    return saved && GAMES.includes(saved as GameId) ? (saved as GameId) : "mega";
  });
  const [tab, setTab] = useState<TabId>("overview");
  const [records, setRecords] = useState<DrawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [dataStatus, setDataStatus] = useState("Loading history…");
  const [jackpots, setJackpots] = useState<JackpotMap | null>(null);
  const [meta, setMeta] = useState<HistoryMeta | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("hot");
  const [tickets, setTickets] = useState<SavedTicket[]>([]);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const mergedRef = useRef(false);
  const config = cfgOf(game);
  const hasBonus = config.hasBonus !== false;

  const winnerIndex = useMemo(
    () => LottoEngine.buildWinnerIndex(records) as Map<string, DrawRecord[]>,
    [records],
  );

  const analysis = useMemo(
    () => (records.length ? LottoEngine.getAnalysis(records, config) : null),
    [records, config],
  );

  const setGame = (next: GameId) => {
    setGameState(next);
    try {
      localStorage.setItem(GAME_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const refreshTickets = useCallback(async () => {
    if (user) {
      try {
        const all = await listTickets();
        setTickets(all.filter((t) => t.game === game));
      } catch {
        setTickets([]);
      }
    } else {
      setTickets(loadGuestTickets().filter((t) => t.game === game));
    }
  }, [user, game]);

  useEffect(() => {
    if (isPending) return;
    void refreshTickets();
  }, [isPending, refreshTickets]);

  useEffect(() => {
    if (isPending || !user || mergedRef.current) return;
    const guest = loadGuestTickets();
    if (!guest.length) {
      mergedRef.current = true;
      return;
    }
    mergedRef.current = true;
    void mergeGuestTickets({ data: { tickets: guest } })
      .then((res) => {
        clearGuestTickets();
        if (res.merged) toast.success(`Moved ${res.merged} guest ticket${res.merged === 1 ? "" : "s"} to your account`);
        return refreshTickets();
      })
      .catch(() => {
        mergedRef.current = false;
      });
  }, [user, isPending, refreshTickets]);

  const loadGame = useCallback(async (id: GameId, { silent } = { silent: false }) => {
    if (!silent) setLoading(true);
    try {
      const rows = await loadHistory(id);
      setRecords(rows);
      setDataStatus(
        rows.length
          ? `${cfgOf(id).label}: ${rows.length.toLocaleString()} draws loaded`
          : "No data loaded yet.",
      );
    } catch {
      setRecords([]);
      setDataStatus("Could not load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGame(game);
  }, [game, loadGame]);

  useEffect(() => {
    void fetch("/history/history_meta.json")
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  const loadJackpots = useCallback(async () => {
    try {
      const data = await fetchJackpots();
      if (data && (data.mega || data.powerball || data.hit5 || data.walotto)) {
        setJackpots(data);
      }
    } catch {
      /* keep last */
    }
  }, []);

  useEffect(() => {
    void loadJackpots();
    const t = window.setInterval(() => void loadJackpots(), 15 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [loadJackpots]);

  const updateDraws = useCallback(async () => {
    setUpdating(true);
    try {
      const live = await fetchLiveDraws({ data: { game } });
      const incoming = (live.records ?? []) as DrawRecord[];
      const merged = await mergeHistory(game, records, incoming);
      setRecords(merged.records);
      const parts = [`${merged.added} new draw${merged.added === 1 ? "" : "s"}`];
      if (live.log?.length) parts.push(live.log.join(" · "));
      setDataStatus(`${config.label}: ${merged.records.length.toLocaleString()} draws · ${parts.join(" · ")}`);
      if (merged.added) toast.success(`Added ${merged.added} new ${config.label} draw${merged.added === 1 ? "" : "s"}`);
      else toast.message("History is up to date");
      void loadJackpots();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setDataStatus(msg);
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  }, [game, records, config.label, loadJackpots]);

  useEffect(() => {
    if (loading || !records.length || updating) return;
    const newest = new Date(`${records[0].drawDate}T00:00:00`);
    if (Number.isNaN(newest.valueOf())) return;
    const days = (Date.now() - newest.valueOf()) / 86400000;
    if (days > (STALE_DAYS[game] || 3)) void updateDraws();
    // only on first load of a game
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, game]);

  async function handleSaveTicket(picks: { numbers: number[]; megaBall: number }[], strategy: string) {
    const ticket: SavedTicket = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      game,
      strategy,
      savedAt: new Date().toISOString(),
      picks,
    };
    if (user) {
      try {
        await saveTicket({ data: ticket });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save ticket");
        return;
      }
    } else {
      addGuestTicket(ticket);
    }
    setJustSavedId(ticket.id);
    await refreshTickets();
    toast.success(`Saved ${picks.length} picks to Tickets`);
  }

  async function handleDeleteTicket(id: string) {
    if (user) {
      try {
        await deleteTicket({ data: { id } });
      } catch {
        toast.error("Could not delete ticket");
        return;
      }
    } else {
      removeGuestTicket(id);
    }
    await refreshTickets();
    toast.message("Ticket deleted");
  }

  async function handleImport(text: string) {
    try {
      const incoming = LottoEngine.parseHistoryContent(text, config) as DrawRecord[];
      if (!incoming.length) throw new Error("No valid draws found in that file.");
      const merged = await mergeHistory(game, records, incoming);
      setRecords(merged.records);
      setDataStatus(`Imported ${merged.added} new draws (${merged.records.length} total).`);
      toast.success(`Imported ${merged.added} draws`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function handleClear() {
    await clearHistory(game);
    setRecords([]);
    setDataStatus("Saved data cleared.");
    toast.message("Cleared local history for this game");
  }

  const uniqueWinners = winnerIndex.size;
  const remaining = Math.max(0, config.totalCombinations - uniqueWinners);
  const latest = records[0];
  const ticketCount = tickets.length;
  const newestByGame = (id: GameId) => {
    if (id === game && records[0]) return records[0].drawDate;
    return meta?.games?.[id]?.newest;
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-fg">
            D
          </span>
          <div>
            <h1 className="font-display text-[1.35rem] font-semibold tracking-tight">
              Draw Desk
            </h1>
            <p className="text-xs text-muted">
              {config.label}
              {loading ? " · loading" : latest ? ` · latest ${latest.drawDate}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-full bg-surface p-1 shadow-[inset_0_0_0_1px_var(--color-border)]">
            {GAMES.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setGame(id)}
                className={`h-8 rounded-full px-3 text-[13px] font-medium ${
                  game === id ? "bg-fg text-bg" : "text-muted hover:text-fg"
                }`}
              >
                {cfgOf(id).label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void updateDraws()}
            disabled={updating}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-medium text-accent-fg disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${updating ? "animate-spin" : ""}`} />
            Update
          </button>
          <AuthSlot />
        </div>
      </header>

      {jackpots && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {GAMES.filter((id) => jackpots[id]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setGame(id)}
              className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] ${
                id === game
                  ? "border-fg bg-fg text-bg"
                  : "border-border bg-surface text-fg"
              }`}
            >
              {cfgOf(id).label}
              <strong className="font-semibold tabular-nums">{jackpots[id]}</strong>
            </button>
          ))}
          <span className="text-[11px] text-subtle">
            official estimates · {new Date(jackpots.fetchedAt).toLocaleString()}
          </span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {GAMES.map((id) => {
          const newest = newestByGame(id);
          if (!newest) return null;
          const age = (Date.now() - new Date(`${newest}T00:00:00`).valueOf()) / 86400000;
          const tone =
            age <= 4 ? "text-success" : age <= 10 ? "text-warn" : "text-danger";
          return (
            <button
              key={id}
              type="button"
              onClick={() => setGame(id)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] ${
                id === game ? "bg-surface shadow-[inset_0_0_0_1px_var(--color-border)]" : "text-muted"
              }`}
            >
              <i className={`inline-block size-1.5 rounded-full bg-current ${tone}`} />
              {cfgOf(id).label} {newest.slice(5)}
            </button>
          );
        })}
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Total combinations"
          value={formatNumber(config.totalCombinations)}
          note={
            hasBonus
              ? `${config.whitePick} of 1–${config.whiteMax} + ${config.ballLabel} 1–${config.megaMax}`
              : `${config.whitePick} of 1–${config.whiteMax}`
          }
          hero
        />
        <Kpi
          label="Draws loaded"
          value={loading ? "…" : formatNumber(records.length)}
          note={
            records.length
              ? `${records[records.length - 1]?.drawDate} to ${records[0]?.drawDate}`
              : "Load history to begin"
          }
        />
        <Kpi
          label="Remaining unhit"
          value={loading ? "…" : formatNumber(remaining)}
          note="Pool minus loaded jackpot winners"
        />
        <Kpi
          label="Latest draw"
          value={latest?.drawDate || "—"}
          note={
            latest
              ? `${latest.numbers.join(" · ")}${hasBonus ? ` + ${latest.megaBall}` : ""}`
              : "Waiting for history"
          }
        />
      </section>

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative shrink-0 px-3.5 py-2.5 text-sm font-medium ${
              tab === t.id ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
            {t.id === "tickets" && ticketCount > 0 && (
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg">
                {ticketCount}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-fg" />
            )}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <OverviewTab
          config={config}
          records={records}
          winnerIndex={winnerIndex}
          analysis={analysis}
        />
      )}
      {tab === "analyzer" && (
        <AnalyzerTab
          config={config}
          analysis={analysis}
          heatmapMode={heatmapMode}
          setHeatmapMode={setHeatmapMode}
        />
      )}
      {tab === "predictor" && (
        <PredictorTab
          config={config}
          records={records}
          winnerIndex={winnerIndex}
          onSave={(picks, strategy) => void handleSaveTicket(picks, strategy)}
        />
      )}
      {tab === "tickets" && (
        <TicketsTab
          config={config}
          records={records}
          tickets={tickets}
          signedIn={Boolean(user)}
          justSavedId={justSavedId}
          onDelete={(id) => void handleDeleteTicket(id)}
          onOpenPredictor={() => setTab("predictor")}
        />
      )}
      {tab === "winners" && <WinnersTab config={config} records={records} />}
      {tab === "remaining" && (
        <RemainingTab config={config} winnerIndex={winnerIndex} />
      )}
      {tab === "data" && (
        <DataTab
          config={config}
          records={records}
          status={dataStatus}
          updating={updating}
          onUpdate={() => void updateDraws()}
          onImport={(text) => void handleImport(text)}
          onClear={() => void handleClear()}
        />
      )}

      <footer className="mt-10 text-[12px] leading-relaxed text-subtle">
        {hasBonus
          ? `${config.label}: ${config.whitePick} white balls from 1–${config.whiteMax} plus ${config.ballLabel} 1–${config.megaMax}. Remaining combinations exclude loaded jackpot winners. Statistics describe past draws only — every drawing is random and independent.`
          : `${config.label}: ${config.whitePick} numbers from 1–${config.whiteMax}, no bonus ball. Remaining combinations exclude loaded jackpot winners. Statistics describe past draws only — every drawing is random and independent.`}
      </footer>
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  hero,
}: {
  label: string;
  value: string;
  note: string;
  hero?: boolean;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface px-4 py-4">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
        {label}
      </span>
      <strong
        className={`mt-1 block font-mono text-[1.45rem] font-semibold tracking-tight tabular-nums ${
          hero ? "text-accent" : "text-fg"
        }`}
      >
        {value}
      </strong>
      <small className="mt-1 block text-[12px] leading-snug text-muted">{note}</small>
    </article>
  );
}
