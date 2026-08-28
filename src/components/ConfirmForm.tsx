"use client";

import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui";

/**
 * Wraps a destructive server action behind a confirmation dialog.
 *
 * The <dialog> lives inside the <form>, so its confirm button submits the form
 * directly - no JS form plumbing, and the action still runs on the server.
 */
export function ConfirmForm({
  action,
  title,
  message,
  triggerLabel = "delete",
  confirmLabel = "Delete",
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  title: string;
  message: string;
  triggerLabel?: string;
  confirmLabel?: string;
  children?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <form action={action}>
      {children}
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="font-mono text-[11px] text-red-400 transition hover:text-red-300"
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          // Clicking the backdrop (the dialog element itself) closes it.
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className={
          // Tailwind's preflight zeroes margins, which kills the `margin: auto`
          // that centres a modal dialog - `m-auto` puts it back.
          "m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-line-hi " +
          "bg-surface p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        }
      >
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ink">
            {title}
          </h2>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm leading-relaxed text-ink-dim">{message}</p>
          <p className="mt-2 font-mono text-[11px] text-red-400">This cannot be undone.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </form>
  );
}
