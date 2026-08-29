"use client";

import { Masonry } from "@/components/Masonry";
import { PromptCard, type PromptCardData } from "./PromptCard";

export function PromptGrid({
  prompts,
  onOpen,
}: {
  prompts: PromptCardData[];
  onOpen: (id: string) => void;
}) {
  return (
    <Masonry minColumnWidth={260} maxColumns={4} gap={16}>
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} onOpen={onOpen} />
      ))}
    </Masonry>
  );
}
