import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LottoEngine } from "@/lib/lotto/engine";
import type { GameId, JackpotMap } from "@/lib/lotto/types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/json,*/*" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
  const text = await fetchText(url, timeoutMs);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function shortJackpot(amount: string | number, unit?: string) {
  const n = Number(String(amount).replace(/,/g, ""));
  if (!Number.isFinite(n)) return String(amount);
  const u = String(unit || "").toLowerCase();
  if (u.startsWith("b")) return `$${n}B`;
  if (u.startsWith("m") || n >= 1_000_000) {
    const millions = u.startsWith("m") ? n : n / 1_000_000;
    return millions >= 1000
      ? `$${(millions / 1000).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}B`
      : `$${Number(millions.toFixed(millions >= 100 ? 0 : 1))}M`;
  }
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}

function fmtJackpot(raw: string) {
  const m = String(raw).match(/\$([\d.,]+)\s*(Million|Billion)?/i);
  if (!m) return String(raw).trim();
  if (m[2]) return shortJackpot(m[1], m[2]);
  return shortJackpot(m[1].replace(/,/g, ""));
}

const JACKPOT_NAME_MAP: Record<string, GameId> = {
  lotto: "walotto",
  "washington lotto": "walotto",
  "wa lotto": "walotto",
  "hit 5": "hit5",
  hit5: "hit5",
  powerball: "powerball",
  "mega millions": "mega",
  mega: "mega",
};

type CacheEntry<T> = { at: number; value: T };
const jackpotCache: { current?: CacheEntry<JackpotMap> } = {};
const JACKPOT_TTL = 15 * 60 * 1000;

async function scrapeLotteryUsaWa(data: JackpotMap) {
  const html = await fetchText("https://www.lotteryusa.com/washington/");
  if (!html) return;
  const re =
    /c-game-result-card__title">([^<]+)<\/span>[\s\S]{0,1200}?(?:Est\.?\s*jackpot|Jackpot|Top [Pp]rize):?\s*<strong>([^<]+)<\/strong>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const key = JACKPOT_NAME_MAP[m[1].trim().toLowerCase()];
    if (key && !data[key]) data[key] = fmtJackpot(m[2]);
  }
}

async function scrapeLotteryNet(data: JackpotMap) {
  const html = await fetchText("https://www.lottery.net/");
  if (!html) return;
  const re =
    /jackpot-promo\/people\/(mega-millions|powerball)\.png[\s\S]{0,600}?Next Estimated Jackpot[\s\S]{0,200}?\$([\d.]+)\s*(Million|Billion)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const key: GameId = m[1] === "mega-millions" ? "mega" : "powerball";
    if (!data[key]) data[key] = shortJackpot(m[2], m[3]);
  }
}

async function fetchPowerballOfficial(data: JackpotMap) {
  const json = await fetchJson<
    Array<{ field_prize_amount?: string; field_prize_amount_cash?: string }>
  >("https://www.powerball.com/api/v1/estimates/powerball?_format=json");
  const row = Array.isArray(json) ? json[0] : null;
  const raw = row?.field_prize_amount;
  if (raw && !data.powerball) data.powerball = fmtJackpot(raw);
}

async function scrapeMegaMillions(data: JackpotMap) {
  const html = await fetchText("https://www.megamillions.com/");
  if (!html) return;
  const m =
    html.match(/Next Estimated Jackpot[\s\S]{0,400}?\$([\d.,]+)\s*(Million|Billion)/i) ||
    html.match(/estimated jackpot[\s\S]{0,200}?\$([\d.,]+)\s*(Million|Billion)/i);
  if (m && !data.mega) data.mega = shortJackpot(m[1], m[2]);
}

async function scrapeWaLotteryHome(data: JackpotMap) {
  const html = await fetchText("https://www.walottery.com/");
  if (!html) return;
  const blocks = [
    { re: /Hit\s*5[\s\S]{0,400}?\$([\d,]+)/i, key: "hit5" as const },
    { re: /Lotto[\s\S]{0,400}?\$([\d,]+)/i, key: "walotto" as const },
  ];
  for (const { re, key } of blocks) {
    const m = html.match(re);
    if (m && !data[key]) data[key] = fmtJackpot(`$${m[1]}`);
  }
}

export const fetchJackpots = createServerFn({ method: "GET" }).handler(async () => {
  const cached = jackpotCache.current;
  if (cached && Date.now() - cached.at < JACKPOT_TTL) return cached.value;

  const data: JackpotMap = { fetchedAt: new Date().toISOString() };
  await Promise.allSettled([
    scrapeLotteryUsaWa(data),
    fetchPowerballOfficial(data),
    scrapeMegaMillions(data),
    scrapeWaLotteryHome(data),
  ]);
  if (!data.mega || !data.powerball) await scrapeLotteryNet(data);

  if (data.mega || data.powerball || data.hit5 || data.walotto) {
    jackpotCache.current = { at: Date.now(), value: data };
  }
  return data;
});

const LIVE_APIS: Record<string, string> = {
  mega: "https://data.ny.gov/resource/5xaw-6ayf.json?$limit=2000&$order=draw_date%20DESC",
  powerball: "https://data.ny.gov/resource/d6yy-54nr.json?$limit=2000&$order=draw_date%20DESC",
};

const WA_OFFICIAL: Record<string, string> = {
  hit5: "hit5",
  walotto: "lotto",
};

type SerializedDraw = {
  drawDate: string;
  numbers: number[];
  megaBall: number;
  key: string;
  combinationIndex: number | null;
  masterCsvLine: number | null;
  legacy: boolean;
  doublePlay: boolean;
};

function asDraws(rows: unknown): SerializedDraw[] {
  if (!Array.isArray(rows)) return [];
  const out: SerializedDraw[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const numbers = Array.isArray(r.numbers) ? r.numbers.map(Number) : [];
    const drawDate = String(r.drawDate || "");
    const megaBall = Number(r.megaBall);
    if (!drawDate || !numbers.length || !Number.isFinite(megaBall)) continue;
    out.push({
      drawDate,
      numbers,
      megaBall,
      key: String(r.key || `${numbers.join("-")}+${megaBall}`),
      combinationIndex: typeof r.combinationIndex === "number" ? r.combinationIndex : null,
      masterCsvLine: typeof r.masterCsvLine === "number" ? r.masterCsvLine : null,
      legacy: Boolean(r.legacy),
      doublePlay: Boolean(r.doublePlay),
    });
  }
  return out;
}

export const fetchLiveDraws = createServerFn({ method: "POST" })
  .validator(z.object({ game: z.enum(["mega", "powerball", "hit5", "walotto"]) }))
  .handler(async ({ data }) => {
    const cfg = LottoEngine.GAME_CONFIGS[data.game];
    const incoming: SerializedDraw[] = [];
    const log: string[] = [];

    if (LIVE_APIS[data.game]) {
      const json = await fetchJson<unknown[]>(LIVE_APIS[data.game], 10000);
      if (json && Array.isArray(json)) {
        const norm = asDraws(LottoEngine.normalizeHistory(json, cfg));
        incoming.push(...norm);
        log.push(`NY Open Data: ${norm.length} draws`);
      } else {
        log.push("NY Open Data: unavailable");
      }
    }

    if (WA_OFFICIAL[data.game]) {
      const url = `https://walottery.com/winningnumbers/pastdrawings.aspx?gamename=${WA_OFFICIAL[data.game]}&unittype=day&unitcount=180`;
      const html = await fetchText(url, 10000);
      if (html) {
        const rows = asDraws(LottoEngine.parseWaOfficialDraws(html, cfg));
        if (rows.length) {
          incoming.push(...rows);
          log.push(`WA Lottery: ${rows.length} draws`);
        } else {
          log.push("WA Lottery: parsed 0 draws");
        }
      } else {
        log.push("WA Lottery: unavailable");
      }
    }

    return {
      records: incoming,
      log,
      fetchedAt: new Date().toISOString(),
    };
  });
