"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function NewKeyBanner({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mb-5 rounded-lg border border-accent/50 bg-accent-dim/20 p-4">
      <p className="eyebrow mb-2 text-accent">Key created - copy it now</p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="flex-1 break-all rounded border border-line bg-canvas px-3 py-2 font-mono text-[13px] text-ink">
          {apiKey}
        </code>
        <Button type="button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 font-mono text-[11px] text-ink-dim">
        Only the digest is stored. Once you leave this page the key cannot be shown again -
        revoke it and make a new one if you lose it.
      </p>
    </div>
  );
}
