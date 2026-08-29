"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";

export type PromptCardData = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  isBase: boolean;
  isActive: boolean;
  categoryName: string;
  tagNames: string[];
  updatedByName: string | null;
};

/** Body preview length - long enough to judge a fragment, short enough to scan. */
const PREVIEW_CHARS = 320;

export function PromptCard({
  prompt,
  onOpen,
}: {
  prompt: PromptCardData;
  onOpen: (id: string) => void;
}) {
  const preview =
    prompt.body.length > PREVIEW_CHARS
      ? `${prompt.body.slice(0, PREVIEW_CHARS).trimEnd()}...`
      : prompt.body;

  return (
    <Link
      href={`/manage/prompts/${prompt.id}`}
      onClick={(event) => {
        // Leave the modifier combinations alone so a new tab still works.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onOpen(prompt.id);
      }}
      className="block rounded-lg border border-line bg-surface/90 transition hover:border-line-hi hover:bg-surface-hi/70"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="eyebrow truncate">{prompt.categoryName}</span>
        <span className="font-mono text-[10px] text-ink-dim">#{prompt.sortOrder}</span>
      </div>

      <div className="p-3">
        <h3 className="mb-2 text-sm font-medium leading-snug text-ink">{prompt.title}</h3>
        <p className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-ink-dim">
          {preview}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {prompt.isBase && <Badge tone="base">Base</Badge>}
          {!prompt.isActive && <Badge tone="danger">Off</Badge>}
          {prompt.tagNames.map((name) => (
            <span
              key={name}
              className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-ink-dim"
            >
              {name}
            </span>
          ))}
        </div>

        {prompt.updatedByName && (
          <p className="mt-2 font-mono text-[10px] text-ink-dim/70">
            edited by {prompt.updatedByName}
          </p>
        )}
      </div>
    </Link>
  );
}
