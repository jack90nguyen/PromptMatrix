import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import { displayPrefix, looksLikeKey } from "@/lib/api-key";
import { ConfirmForm } from "@/components/ConfirmForm";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Empty,
  ErrorText,
  Input,
  Label,
  PageHeader,
} from "@/components/ui";
import { createApiKey, revokeApiKey } from "./actions";
import { NewKeyBanner } from "./NewKeyBanner";

function ago(date: Date | null): string {
  if (!date) return "never used";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "used just now";
  if (minutes < 60) return `used ${minutes}m ago`;
  if (minutes < 1440) return `used ${Math.floor(minutes / 60)}h ago`;
  return `used ${Math.floor(minutes / 1440)}d ago`;
}

export default async function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  await requireAdmin();
  const { error, created } = await searchParams;

  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="API keys" />
      {error && (
        <div className="mb-5">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
      {created && looksLikeKey(created) && <NewKeyBanner apiKey={created} />}

      <Card className="mb-5">
        <CardTitle>New key</CardTitle>
        <form action={createApiKey} className="flex items-end gap-3 p-4">
          <div className="flex-1">
            <Label htmlFor="name">Label</Label>
            <Input id="name" name="name" placeholder="n8n workflow" required />
          </div>
          <Button type="submit">Create</Button>
        </form>
      </Card>

      <Card className="mb-5">
        <CardTitle>Usage</CardTitle>
        <div className="space-y-3 p-4">
          <p className="text-sm text-ink-dim">
            One read-only endpoint composes a prompt from a category and tags:
          </p>
          <pre className="overflow-x-auto rounded border border-line bg-canvas p-3 font-mono text-[11px] leading-relaxed text-ink-dim">
{`GET /api/compose
  ?key=pm_xxxxxxxx_...      required
  &category=product         required, slug
  &tags=mug,upload-photo    optional, comma separated
  &mode=OR                  optional, OR (default) or AND
  &format=json              optional, json (default) or text

# the key may also travel as a header instead:
curl -H "Authorization: Bearer pm_..." \\
  ".../api/compose?category=product&tags=mug"`}
          </pre>
          <p className="font-mono text-[11px] text-amber-400">
            A key in the query string is recorded by access logs, browser history and any proxy
            on the way. Prefer the header where the caller supports it, and revoke a key the
            moment it leaks.
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle right={<span className="font-mono text-[11px] text-ink-dim">{keys.length}</span>}>
          All keys
        </CardTitle>
        {keys.length === 0 ? (
          <Empty>No API keys yet.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink">{key.name}</span>
                    {!key.isActive && <Badge tone="danger">Revoked</Badge>}
                  </div>
                  <code className="mt-1 block font-mono text-[11px] text-ink-dim">
                    {displayPrefix(key.prefix)}
                  </code>
                </div>
                <span className="font-mono text-[11px] text-ink-dim">{ago(key.lastUsedAt)}</span>
                <span className="font-mono text-[11px] text-ink-dim/70">
                  by {key.createdBy?.name ?? "deleted user"}
                </span>
                <ConfirmForm
                  action={revokeApiKey}
                  title="Revoke API key"
                  message={`"${key.name}" (${displayPrefix(key.prefix)}) stops working immediately. Anything calling the API with it will start getting 401.`}
                  triggerLabel="revoke"
                  confirmLabel="Revoke"
                >
                  <input type="hidden" name="id" value={key.id} />
                </ConfirmForm>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
