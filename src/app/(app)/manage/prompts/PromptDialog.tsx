"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { ConfirmForm } from "@/components/ConfirmForm";
import { PromptForm } from "./PromptForm";
import { loadPrompt, removePrompt, type PromptEditData } from "./actions";
import type { InlineOption } from "./inline-actions";

/**
 * Edits one prompt in place. Kept out of the URL on purpose: routing to
 * `?edit=<id>` would re-render the server component and restart the graph
 * simulation, so the layout would jump every time a node is opened.
 */
export function PromptDialog({
  promptId,
  categories,
  tags,
  onClose,
}: {
  promptId: string;
  categories: InlineOption[];
  tags: InlineOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<PromptEditData | null>(null);
  const [missing, setMissing] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    startTransition(async () => {
      const loaded = await loadPrompt(promptId);
      if (loaded) setData(loaded);
      else setMissing(true);
    });
  }, [promptId]);

  function close() {
    dialogRef.current?.close();
    onClose();
  }

  async function handleDelete(formData: FormData) {
    await removePrompt(String(formData.get("id") ?? ""));
    close();
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        // Esc: close through our own path so the parent state clears too.
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="m-auto w-[min(64rem,calc(100vw-2rem))] rounded-lg border border-line-hi bg-surface p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink">
          Edit prompt
        </h2>
        {data?.updatedByName && (
          <span className="font-mono text-[11px] text-ink-dim">
            {data.updatedByName} · {data.updatedAt}
          </span>
        )}
        <div className="ml-auto flex items-center gap-4">
          <Link
            href={`/manage/prompts/${promptId}`}
            className="font-mono text-[11px] text-ink-dim transition hover:text-accent"
          >
            open page
          </Link>
          {data && (
            <ConfirmForm
              action={handleDelete}
              title="Delete prompt"
              message={`"${data.defaults.title}" will be removed from every composed prompt that pulls it in.`}
            >
              <input type="hidden" name="id" value={promptId} />
            </ConfirmForm>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="font-mono text-sm text-ink-dim transition hover:text-ink"
          >
            &#10005;
          </button>
        </div>
      </div>

      <div className="max-h-[80vh] overflow-y-auto p-4">
        {missing ? (
          <div className="py-10 text-center">
            <Badge tone="danger">Gone</Badge>
            <p className="mt-3 font-mono text-xs text-ink-dim">
              This prompt no longer exists - someone may have deleted it.
            </p>
          </div>
        ) : data ? (
          <PromptForm
            categories={categories}
            tags={tags}
            defaults={data.defaults}
            onSaved={() => {
              close();
              router.refresh();
            }}
            onCancel={close}
          />
        ) : (
          <p className="py-10 text-center font-mono text-xs text-ink-dim">loading...</p>
        )}
      </div>
    </dialog>
  );
}
