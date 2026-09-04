/**
 * Imports the CS ticket playbook from Lark Base into the prompt library.
 *
 *   npx tsx scripts/import-lark-tickets.ts --dry-run
 *   npx tsx scripts/import-lark-tickets.ts
 *
 * Source: base MZ1NbE0H9acwOZsFfscj4SuSpuh, table "Ticket AI Label".
 * Mapping: Case -> title, AI Label -> a single tag, "Action tiếp theo" +
 * Template -> body, everything into the existing "Ticket Label" category.
 *
 * Re-runnable: a prompt is matched by (category, title), so a second run
 * updates bodies and tags rather than duplicating rows. Nothing is written
 * back to Lark - the CLI is only read from.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/slug";

const BASE_TOKEN = "MZ1NbE0H9acwOZsFfscj4SuSpuh";
const TABLE_ID = "tbltIrnbmEJT22PZ";
const CATEGORY_NAME = "Ticket Label";
const SORT_STEP = 10;

/** Columns pulled from Lark, in the order the CLI returns them. */
const FIELDS = ["Case", "AI Label", "Action tiếp theo", "Template", "Nội dung đầy đủ"] as const;

type LarkRow = {
  recordId: string;
  case: string;
  label: string;
  action: string;
  template: string;
  full: string;
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function fetchRows(): LarkRow[] {
  const args = [
    "base",
    "+record-list",
    "--base-token",
    BASE_TOKEN,
    "--table-id",
    TABLE_ID,
    "--as",
    "bot",
    "--limit",
    "200",
    "--format",
    "json",
    ...FIELDS.flatMap((field) => ["--field-id", field]),
  ];
  const raw = execFileSync("lark-cli", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const parsed = JSON.parse(raw) as {
    ok: boolean;
    error?: unknown;
    data: {
      data: unknown[][];
      fields: string[];
      record_id_list: string[];
      has_more: boolean;
    };
  };
  if (!parsed.ok) throw new Error(`lark-cli failed: ${JSON.stringify(parsed.error)}`);

  const { data, fields, record_id_list, has_more } = parsed.data;
  if (has_more) {
    // The CLI exposes no page token, so a bigger table needs a different read.
    throw new Error("Lark returned has_more=true; this importer only handles one page of 200.");
  }

  const index = (name: string) => {
    const at = fields.indexOf(name);
    if (at < 0) throw new Error(`Lark table has no field "${name}"`);
    return at;
  };
  const [iCase, iLabel, iAction, iTemplate, iFull] = FIELDS.map(index);

  return data.map((row, position) => ({
    recordId: record_id_list[position]!,
    case: text(row[iCase!]),
    label: text(row[iLabel!]),
    action: text(row[iAction!]),
    template: text(row[iTemplate!]),
    full: text(row[iFull!]),
  }));
}

/**
 * The next action is an internal instruction and the template is what the
 * customer receives, so they are labelled rather than run together - an
 * unlabelled join reads as if the instruction were part of the reply.
 */
function buildBody(row: LarkRow): string {
  const parts: string[] = [];
  if (row.action) parts.push(`Next action:\n${row.action}`);
  if (row.template) parts.push(`Template:\n${row.template}`);
  if (parts.length > 0) return parts.join("\n\n");
  return row.full;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const category = await prisma.category.findFirst({
    where: { name: CATEGORY_NAME },
    select: { id: true, name: true },
  });
  if (!category) throw new Error(`Category "${CATEGORY_NAME}" does not exist - create it first`);

  const rows = fetchRows();
  const usable = rows.filter((row) => row.case && buildBody(row));
  const skipped = rows.filter((row) => !row.case || !buildBody(row));

  const labels = [...new Set(usable.map((row) => row.label).filter(Boolean))].sort();
  const existingTags = await prisma.tag.findMany({ select: { id: true, name: true, slug: true } });
  const tagByName = new Map(existingTags.map((tag) => [tag.name, tag]));
  const newLabels = labels.filter((label) => !tagByName.has(label));

  const existingPrompts = await prisma.prompt.findMany({
    where: { categoryId: category.id },
    select: { id: true, title: true },
  });
  const promptByTitle = new Map(existingPrompts.map((prompt) => [prompt.title, prompt.id]));
  const toUpdate = usable.filter((row) => promptByTitle.has(row.case));
  const toCreate = usable.filter((row) => !promptByTitle.has(row.case));

  const bodies = usable.map((row) => buildBody(row).length).sort((a, b) => a - b);

  console.log(`source        : Lark base ${BASE_TOKEN} / ${TABLE_ID}`);
  console.log(`category      : ${category.name}`);
  console.log(`rows in Lark  : ${rows.length}`);
  console.log(`importable    : ${usable.length}   (create ${toCreate.length}, update ${toUpdate.length})`);
  console.log(`skipped       : ${skipped.length}`);
  skipped.forEach((row) => console.log(`   ! ${row.case || "(no Case)"} - nothing to put in the body`));
  console.log(`tags          : ${labels.length} referenced, ${newLabels.length} new`);
  newLabels.forEach((label) => console.log(`   + ${label}  ->  ${slugify(label)}`));
  console.log(
    `body length   : min ${bodies[0]}, median ${bodies[Math.floor(bodies.length / 2)]}, max ${bodies.at(-1)}`,
  );
  console.log("\nfirst 3 rows as they will be written:");
  usable.slice(0, 3).forEach((row, position) => {
    console.log(`\n--- #${position + 1} sortOrder=${(position + 1) * SORT_STEP} tag="${row.label}"`);
    console.log(`title: ${row.case}`);
    console.log(buildBody(row).split("\n").slice(0, 6).join("\n"));
  });

  if (dryRun) {
    console.log("\n--dry-run: nothing written.");
    await prisma.$disconnect();
    return;
  }

  for (const label of newLabels) {
    const tag = await prisma.tag.create({
      data: { name: label, slug: slugify(label) },
      select: { id: true, name: true, slug: true },
    });
    tagByName.set(tag.name, tag);
  }

  let created = 0;
  let updated = 0;
  for (const [position, row] of usable.entries()) {
    const tagId = row.label ? tagByName.get(row.label)?.id : undefined;
    const data = {
      title: row.case,
      body: buildBody(row),
      sortOrder: (position + 1) * SORT_STEP,
      isBase: false,
      isActive: true,
      categoryId: category.id,
    };
    const existingId = promptByTitle.get(row.case);

    if (existingId) {
      await prisma.prompt.update({
        where: { id: existingId },
        data: { ...data, tags: { set: tagId ? [{ id: tagId }] : [] } },
      });
      updated += 1;
    } else {
      await prisma.prompt.create({
        data: { ...data, tags: { connect: tagId ? [{ id: tagId }] : [] } },
      });
      created += 1;
    }
  }

  console.log(`\nwritten: ${created} created, ${updated} updated, ${newLabels.length} tags added`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
