import type { GameId, SavedTicket } from "@/lib/lotto/types";

const KEY = "drawdesk-guest-tickets";

export function loadGuestTickets(): SavedTicket[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTicket[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestTickets(tickets: SavedTicket[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tickets));
  } catch {
    /* ignore */
  }
}

export function addGuestTicket(ticket: SavedTicket) {
  const next = [ticket, ...loadGuestTickets().filter((t) => t.id !== ticket.id)];
  saveGuestTickets(next);
  return next;
}

export function removeGuestTicket(id: string) {
  const next = loadGuestTickets().filter((t) => t.id !== id);
  saveGuestTickets(next);
  return next;
}

export function guestTicketsFor(game: GameId) {
  return loadGuestTickets().filter((t) => t.game === game);
}

export function clearGuestTickets() {
  saveGuestTickets([]);
}
