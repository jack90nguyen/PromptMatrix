import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { Badge, Button, Logo } from "@/components/ui";
import { logout } from "./actions";

const NAV = [
  { href: "/", label: "Composer" },
  { href: "/manage/prompts", label: "Prompts" },
  { href: "/manage/categories", label: "Categories" },
  { href: "/manage/tags", label: "Tags" },
] as const;

const NAV_LINK =
  "font-mono text-[11px] uppercase tracking-[0.12em] text-ink-dim transition hover:text-accent";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link href="/" className="flex items-center gap-2 text-accent">
            <Logo />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink">
              Prompt Matrix
            </span>
          </Link>

          <nav className="flex flex-wrap gap-x-5 gap-y-1">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={NAV_LINK}>
                {item.label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <>
                <Link href="/manage/users" className={NAV_LINK}>
                  Users
                </Link>
                <Link href="/manage/api-keys" className={NAV_LINK}>
                  API keys
                </Link>
              </>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[11px] text-ink-dim">{user.name}</span>
            <Badge tone={user.role === "ADMIN" ? "accent" : "muted"}>{user.role}</Badge>
            <form action={logout}>
              <Button variant="ghost" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
