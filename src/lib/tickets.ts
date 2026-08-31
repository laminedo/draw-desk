import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type { GameId, SavedTicket, TicketPick } from "@/lib/lotto/types";

const pickSchema = z.object({
  numbers: z.array(z.number().int()).min(1).max(8),
  megaBall: z.number().int().min(1),
});

const ticketSchema = z.object({
  id: z.string().min(1).max(80),
  game: z.enum(["mega", "powerball", "hit5", "walotto"]),
  strategy: z.string().min(1).max(80),
  savedAt: z.string().min(1).max(40),
  picks: z.array(pickSchema).min(1).max(12),
});

type TicketRow = {
  id: string;
  game: string;
  strategy: string;
  picks: TicketPick[] | string;
  saved_at: string;
};

function rowToTicket(row: TicketRow): SavedTicket {
  const picks =
    typeof row.picks === "string" ? (JSON.parse(row.picks) as TicketPick[]) : row.picks;
  return {
    id: row.id,
    game: row.game as GameId,
    strategy: row.strategy,
    savedAt: row.saved_at,
    picks,
  };
}

export const listTickets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<TicketRow>`
      select id, game, strategy, picks, saved_at
      from saved_tickets
      where user_id = ${context.userId}
      order by saved_at desc
    `;
    return rows.map(rowToTicket);
  });

export const saveTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(ticketSchema)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql.query(
      `insert into saved_tickets (id, user_id, game, strategy, picks, saved_at)
       values ($1, $2, $3, $4, $5::jsonb, $6)
       on conflict (id) do nothing`,
      [
        data.id,
        context.userId,
        data.game,
        data.strategy,
        JSON.stringify(data.picks),
        data.savedAt,
      ],
    );
    return { ok: true as const, id: data.id };
  });

export const deleteTicket = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().min(1).max(80) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from saved_tickets where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const mergeGuestTickets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ tickets: z.array(ticketSchema).max(200) }))
  .handler(async ({ context, data }) => {
    if (!data.tickets.length) return { merged: 0 };
    const sql = await getSql();
    const existing = await sql<{ id: string }>`
      select id from saved_tickets where user_id = ${context.userId}
    `;
    const have = new Set(existing.map((r) => r.id));
    let merged = 0;
    for (const ticket of data.tickets) {
      if (have.has(ticket.id)) continue;
      await sql.query(
        `insert into saved_tickets (id, user_id, game, strategy, picks, saved_at)
         values ($1, $2, $3, $4, $5::jsonb, $6)
         on conflict (id) do nothing`,
        [
          ticket.id,
          context.userId,
          ticket.game,
          ticket.strategy,
          JSON.stringify(ticket.picks),
          ticket.savedAt,
        ],
      );
      have.add(ticket.id);
      merged += 1;
    }
    return { merged };
  });
