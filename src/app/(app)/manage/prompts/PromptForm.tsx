"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardTitle,
  Chip,
  ErrorText,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { savePrompt, type PromptFormState } from "./actions";
import { InlineCreate } from "./InlineCreate";
import { createCategoryInline, createTagInline, type InlineOption } from "./inline-actions";

export type PromptDefaults = {
  id: string;
  title: string;
  body: string;
  categoryId: string;
  sortOrder: number;
  isBase: boolean;
  isActive: boolean;
  tagIds: string[];
};

const BLANK: PromptDefaults = {
  id: "",
  title: "",
  body: "",
  categoryId: "",
  sortOrder: 0,
  isBase: false,
  isActive: true,
  tagIds: [],
};

const initialState: PromptFormState = { error: null };

function byName(a: InlineOption, b: InlineOption): number {
  return a.name.localeCompare(b.name);
}

export function PromptForm({
  categories: initialCategories,
  tags: initialTags,
  defaults = BLANK,
}: {
  categories: InlineOption[];
  tags: InlineOption[];
  defaults?: PromptDefaults;
}) {
  const [state, formAction, pending] = useActionState(savePrompt, initialState);
  const [categories, setCategories] = useState(initialCategories);
  const [tags, setTags] = useState(initialTags);
  const [categoryId, setCategoryId] = useState(defaults.categoryId);
  const [tagIds, setTagIds] = useState<string[]>(defaults.tagIds);

  function toggleTag(id: string) {
    setTagIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {tagIds.map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}

      <div className="space-y-5">
        <Card>
          <CardTitle>Fragment</CardTitle>
          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={defaults.title}
                placeholder="Mug 11oz - size and print area"
                required
              />
            </div>
            <div>
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                name="body"
                defaultValue={defaults.body}
                rows={18}
                placeholder="The prompt fragment text..."
                required
              />
            </div>
            <ErrorText>{state.error}</ErrorText>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
              <Link href="/manage/prompts">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardTitle>Placement</CardTitle>
          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="categoryId">Category</Label>
              <Select
                id="categoryId"
                name="categoryId"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                required
              >
                <option value="">Select...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <div className="mt-2">
                <InlineCreate
                  label="New category"
                  placeholder="Packaging"
                  create={createCategoryInline}
                  onCreated={(item) => {
                    setCategories((current) => [...current, item].sort(byName));
                    setCategoryId(item.id);
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sortOrder">Sort order</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={defaults.sortOrder}
              />
              <p className="mt-1.5 font-mono text-[11px] text-ink-dim">
                Lower numbers come first in the composed output.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="isBase"
                defaultChecked={defaults.isBase}
                className="mt-1 accent-cyan-400"
              />
              <span>
                Base fragment
                <span className="mt-0.5 block font-mono text-[11px] text-ink-dim">
                  Always included for its category, whatever the tags.
                </span>
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={defaults.isActive}
                className="accent-cyan-400"
              />
              Active
            </label>
          </div>
        </Card>

        <Card>
          <CardTitle right={<span className="font-mono text-[11px] text-ink-dim">{tagIds.length}</span>}>
            Tags
          </CardTitle>
          <div className="p-4">
            {tags.length === 0 ? (
              <p className="font-mono text-[11px] text-ink-dim">No tags yet.</p>
            ) : (
              <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
                {tags.map((tag) => (
                  <Chip
                    key={tag.id}
                    active={tagIds.includes(tag.id)}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Chip>
                ))}
              </div>
            )}
            <div className="mt-3">
              <InlineCreate
                label="New tag"
                placeholder="Gift box"
                create={createTagInline}
                onCreated={(item) => {
                  setTags((current) => [...current, item].sort(byName));
                  setTagIds((current) => [...current, item.id]);
                }}
              />
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}
