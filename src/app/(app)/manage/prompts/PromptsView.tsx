"use client";

import { useState } from "react";
import { Card, Empty } from "@/components/ui";
import type { GraphData } from "@/lib/graph";
import { PromptGraph } from "./PromptGraph";
import { PromptGrid } from "./PromptGrid";
import { PromptDialog } from "./PromptDialog";
import type { PromptCardData } from "./PromptCard";
import type { InlineOption } from "./inline-actions";

/**
 * Owns the "which prompt is open" state so that opening the editor never
 * re-renders the graph beneath it.
 */
export function PromptsView({
  view,
  graph,
  prompts,
  categories,
  tags,
}: {
  view: "graph" | "cards";
  graph: GraphData;
  prompts: PromptCardData[];
  categories: InlineOption[];
  tags: InlineOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (prompts.length === 0) {
    return (
      <Card>
        <Empty>No prompts match these filters.</Empty>
      </Card>
    );
  }

  return (
    <>
      {view === "graph" ? (
        <PromptGraph data={graph} onOpenPrompt={setEditingId} />
      ) : (
        <PromptGrid prompts={prompts} onOpen={setEditingId} />
      )}

      {editingId && (
        <PromptDialog
          key={editingId}
          promptId={editingId}
          categories={categories}
          tags={tags}
          onClose={() => setEditingId(null)}
        />
      )}
    </>
  );
}
