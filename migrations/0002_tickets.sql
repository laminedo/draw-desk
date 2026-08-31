create table if not exists saved_tickets (
  id         text primary key,
  user_id    text not null,
  game       text not null,
  strategy   text not null default 'Balance',
  picks      jsonb not null,
  saved_at   timestamptz not null default now()
);
create index if not exists saved_tickets_user_id_idx on saved_tickets (user_id);
create index if not exists saved_tickets_user_game_idx on saved_tickets (user_id, game);
