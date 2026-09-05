"use client";

import Link from "next/link";
import { Button, Card, CardTitle } from "@/components/ui";

export type LegendEntry = { label: string; count: number; color: string; slug: string };

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="font-mono text-[10px] text-ink-dim">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-400"
      />
    </div>
  );
}

export function GraphControls({
  legend,
  counts,
  linkDistance,
  charge,
  showLabels,
  onLinkDistance,
  onCharge,
  onShowLabels,
  onReset,
}: {
  legend: LegendEntry[];
  counts: { categories: number; prompts: number; tags: number };
  linkDistance: number;
  charge: number;
  showLabels: boolean;
  onLinkDistance: (value: number) => void;
  onCharge: (value: number) => void;
  onShowLabels: (value: boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          right={
            <span className="font-mono text-[10px] text-ink-dim">
              {counts.categories + counts.prompts + counts.tags} nodes
            </span>
          }
        >
          Categories
        </CardTitle>
        <ul className="space-y-1.5 p-3">
          {legend.length === 0 ? (
            <li className="font-mono text-[11px] text-ink-dim">Nothing to plot.</li>
          ) : (
            legend.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`/manage/prompts?category=${entry.slug}`}
                  className="flex items-center gap-2 font-mono text-[11px] text-ink-dim transition hover:text-ink"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate">{entry.label}</span>
                  <span className="ml-auto text-ink-dim/70">{entry.count}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card>
        <CardTitle>Legend</CardTitle>
        <ul className="space-y-2 p-3 font-mono text-[11px] text-ink-dim">
          <li className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-full bg-ink-dim" />
            category · size by prompts
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-ink-dim/70" />
            prompt
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2 shrink-0 rotate-45 border border-ink-dim" />
            tag · shared across categories
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full border-2 border-amber-400" />
            base fragment
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full bg-ink-dim/25" />
            inactive
          </li>
          <li className="mt-1 flex items-center gap-2">
            <svg width="22" height="6" aria-hidden>
              <line x1="0" y1="3" x2="22" y2="3" stroke="#2c3f63" strokeWidth="1.4" />
            </svg>
            belongs to
          </li>
          <li className="flex items-center gap-2">
            <svg width="22" height="6" aria-hidden>
              <line
                x1="0"
                y1="3"
                x2="22"
                y2="3"
                stroke="#1f3350"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            </svg>
            tagged
          </li>
        </ul>
      </Card>

      <Card>
        <CardTitle>Controls</CardTitle>
        <div className="space-y-3 p-3">
          <Slider
            label="Link distance"
            value={linkDistance}
            min={25}
            max={160}
            step={5}
            onChange={onLinkDistance}
          />
          <Slider
            label="Charge"
            value={charge}
            min={-800}
            max={-40}
            step={20}
            onChange={onCharge}
          />
          <label className="flex items-center gap-2 font-mono text-[11px] text-ink-dim">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(event) => onShowLabels(event.target.checked)}
            />
            Prompt labels
          </label>
          <Button type="button" variant="ghost" onClick={onReset} className="w-full">
            Fit to view
          </Button>
        </div>
      </Card>
    </div>
  );
}
