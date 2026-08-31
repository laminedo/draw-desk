import { cn } from "@/lib/utils";

export function Ball({
  n,
  bonus,
  match,
  mini,
}: {
  n: number;
  bonus?: boolean;
  match?: boolean;
  mini?: boolean;
}) {
  return (
    <span
      className={cn(
        "ball",
        bonus && "bonus",
        match && "match",
        mini && "mini",
      )}
    >
      {n}
    </span>
  );
}

export function BallRow({
  numbers,
  mega,
  bonus,
  matchedWhites,
  matchedBonus,
  mini,
}: {
  numbers: number[];
  mega?: number;
  bonus?: boolean;
  matchedWhites?: Set<number>;
  matchedBonus?: boolean;
  mini?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {numbers.map((n, i) => (
        <Ball
          key={`${n}-${i}`}
          n={n}
          match={matchedWhites?.has(n)}
          mini={mini}
        />
      ))}
      {bonus && mega != null && (
        <Ball n={mega} bonus match={matchedBonus} mini={mini} />
      )}
    </div>
  );
}
