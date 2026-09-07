"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button, Card, CardTitle, Empty, Label, Select } from "@/components/ui";
import { TagPicker } from "@/components/TagPicker";
import {
  composePrompt,
  selectFragments,
  type CategoryPayload,
  type TagMatchMode,
} from "@/lib/compose";
import { loadCategory } from "./composer-actions";

type Category = { id: string; name: string; slug: string };

const EMPTY_PAYLOAD: CategoryPayload = { fragments: [], tags: [] };

export function ComposerClient({ categories }: { categories: Category[] }) {
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [payload, setPayload] = useState<CategoryPayload>(EMPTY_PAYLOAD);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mode, setMode] = useState<TagMatchMode>("OR");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [withTitles, setWithTitles] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!categoryId) {
      setPayload(EMPTY_PAYLOAD);
      return;
    }
    setExcluded([]);
    startTransition(async () => {
      setPayload(await loadCategory(categoryId));
    });
  }, [categoryId]);

  const matched = useMemo(
    () => selectFragments(payload.fragments, selectedTags, mode),
    [payload.fragments, selectedTags, mode],
  );

  const used = useMemo(
    () => matched.filter((fragment) => !excluded.includes(fragment.id)),
    [matched, excluded],
  );

  const output = useMemo(() => composePrompt(used, { withTitles }), [used, withTitles]);

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (categories.length === 0) {
    return (
      <Card>
        <Empty>
          Nothing to compose yet. Create a prompt under{" "}
          <Link href="/manage/prompts/new" className="text-accent hover:underline">
            Prompts
          </Link>
          .
        </Empty>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-5">
          <Card className="p-4">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setSelectedTags([]);
              }}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Card>

          <Card>
            <CardTitle
              right={
                <div className="flex gap-1">
                  {(["OR", "AND"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMode(option)}
                      className={
                        "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition " +
                        (mode === option
                          ? "bg-accent-dim/50 text-accent"
                          : "text-ink-dim hover:text-ink")
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              }
            >
              Tags
            </CardTitle>
            <div className="p-4">
              <TagPicker
                tags={payload.tags}
                selected={selectedTags}
                onToggle={(slug) => setSelectedTags((current) => toggle(current, slug))}
                onClear={() => setSelectedTags([])}
                emptyLabel={pending ? "loading..." : "No tagged fragments in this category."}
              />
            </div>
          </Card>

          <Card>
            <CardTitle
              right={
                <span className="font-mono text-[11px] text-ink-dim">
                  {used.length}/{matched.length}
                </span>
              }
            >
              Fragments
            </CardTitle>
            {matched.length === 0 ? (
              <Empty>Pick a cell or a tag to pull fragments in.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {matched.map((fragment) => (
                  <li key={fragment.id} className="flex items-start gap-2 px-4 py-2">
                    <input
                      type="checkbox"
                      id={`use-${fragment.id}`}
                      checked={!excluded.includes(fragment.id)}
                      onChange={() => setExcluded((current) => toggle(current, fragment.id))}
                      className="mt-1 accent-cyan-400"
                    />
                    <label
                      htmlFor={`use-${fragment.id}`}
                      className="cursor-pointer text-[13px] leading-snug text-ink"
                    >
                      {fragment.title}
                      {fragment.isBase && (
                        <span className="ml-1.5 font-mono text-[10px] uppercase text-amber-400">
                          base
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="flex flex-col">
          <CardTitle
            right={
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 font-mono text-[11px] text-ink-dim">
                  <input
                    type="checkbox"
                    checked={withTitles}
                    onChange={(event) => setWithTitles(event.target.checked)}
                  />
                  titles
                </label>
                <span className="font-mono text-[11px] text-ink-dim">{output.length} chars</span>
                <Button type="button" onClick={copy} disabled={output.length === 0}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            }
          >
            Composed prompt
          </CardTitle>
          <textarea
            readOnly
            value={output}
            placeholder="Pick a category and tags to build a prompt."
            className="m-4 min-h-[24rem] flex-1 resize-y rounded-md border border-line bg-canvas p-3 font-mono text-[13px] leading-relaxed text-ink placeholder:text-ink-dim/70 outline-none focus:border-line-hi"
          />
        </Card>
      </div>
    </div>
  );
}
