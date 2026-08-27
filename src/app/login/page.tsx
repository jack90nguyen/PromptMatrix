import { Logo } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in - Prompt Matrix" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-accent">
            <Logo className="size-5" />
            <span className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-ink">
              Prompt Matrix
            </span>
          </div>
          <p className="font-mono text-xs leading-relaxed text-ink-dim">
            Small prompt fragments, filtered by category and tags,
            <br />
            composed into one complete prompt.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
