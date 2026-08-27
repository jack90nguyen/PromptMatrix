"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import type { InlineOption, InlineResult } from "./inline-actions";

/**
 * "+" affordance that creates a category or tag in place, so building a prompt
 * never sends you to another screen.
 */
export function InlineCreate({
  label,
  placeholder,
  create,
  onCreated,
}: {
  label: string;
  placeholder: string;
  create: (name: string) => Promise<InlineResult>;
  onCreated: (item: InlineOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setName("");
    setError(null);
  }

  function submit() {
    if (!name.trim() || pending) return;
    startTransition(async () => {
      const result = await create(name);
      if (result.ok) {
        onCreated(result.item);
        close();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[11px] text-ink-dim transition hover:text-accent"
      >
        + {label}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-line-hi bg-canvas p-2">
      <div className="flex gap-2">
        <Input
          autoFocus
          value={name}
          placeholder={placeholder}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            // The parent <form> would submit the prompt on Enter.
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape") close();
          }}
        />
        <Button type="button" onClick={submit} disabled={pending || !name.trim()}>
          {pending ? "..." : "Add"}
        </Button>
        <Button type="button" variant="ghost" onClick={close}>
          &#10005;
        </Button>
      </div>
      {error && <p className="mt-1.5 font-mono text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
