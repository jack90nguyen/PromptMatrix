"use client";

import { Masonry } from "@/components/Masonry";
import { PromptCard, type PromptCardData } from "./PromptCard";

export function PromptGrid({ prompts }: { prompts: PromptCardData[] }) {
  return (
    <Masonry minColumnWidth={260} maxColumns={4} gap={16}>
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} />
      ))}
    </Masonry>
  );
}
