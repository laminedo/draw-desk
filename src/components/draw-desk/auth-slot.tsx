import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-24 animate-pulse rounded-full bg-border" />;
  }
  if (user) return <UserButton />;
  return (
    <Link
      to="/login"
      className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-fg no-underline"
    >
      Sign in
    </Link>
  );
}
