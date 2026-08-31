export type GameId = "mega" | "powerball" | "hit5" | "walotto";

export type TabId =
  | "overview"
  | "analyzer"
  | "predictor"
  | "tickets"
  | "winners"
  | "remaining"
  | "data";

export type HeatmapMode = "hot" | "recent" | "cold";

export type DrawRecord = {
  drawDate: string;
  numbers: number[];
  megaBall: number;
  key: string;
  combinationIndex: number | null;
  masterCsvLine: number | null;
  legacy?: boolean;
  doublePlay?: boolean;
  jackpot?: string;
};

export type GameConfig = {
  id: GameId;
  label: string;
  whitePick: number;
  whiteMax: number;
  megaMax: number;
  minNumber: number;
  hasBonus?: boolean;
  ballLabel: string;
  historyUrl: string;
  statsSince?: string;
  totalCombinations: number;
  totalWhiteCombinations: number;
  allowRepeat?: boolean;
  ordered?: boolean;
  doublePlayField?: string;
};

export type TicketPick = {
  numbers: number[];
  megaBall: number;
};

export type SavedTicket = {
  id: string;
  game: GameId;
  strategy: string;
  savedAt: string;
  picks: TicketPick[];
};

export type JackpotMap = {
  fetchedAt: string;
  mega?: string;
  powerball?: string;
  hit5?: string;
  walotto?: string;
};

export type HistoryMeta = {
  generatedAt?: string;
  games: Record<
    string,
    { draws: number; newest: string; lastSync?: string }
  >;
};
