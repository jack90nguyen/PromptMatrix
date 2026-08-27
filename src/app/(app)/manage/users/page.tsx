import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/current-user";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  ErrorText,
  Input,
  Label,
  PageHeader,
  Select,
} from "@/components/ui";
import { createUser, updateUser } from "./actions";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const { error } = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      _count: { select: { editedPrompts: true } },
    },
  });

  return (
    <>
      <PageHeader title="Users" />
      {error && <div className="mb-5">
        <ErrorText>{error}</ErrorText>
      </div>}

      <Card className="mb-5">
        <CardTitle>New user</CardTitle>
        <form action={createUser} className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_8rem_auto]">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required />
          </div>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" name="role" defaultValue="EDITOR">
              <option value="EDITOR">EDITOR</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle right={<span className="font-mono text-[11px] text-ink-dim">{users.length}</span>}>
          All users
        </CardTitle>
        <ul className="divide-y divide-line">
          {users.map((user) => (
            <li key={user.id} className="p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <code className="font-mono text-[13px] text-ink">{user.username}</code>
                {user.id === admin.id && <Badge tone="accent">You</Badge>}
                {!user.isActive && <Badge tone="danger">Disabled</Badge>}
                <span className="ml-auto font-mono text-[11px] text-ink-dim">
                  {user._count.editedPrompts} prompts edited
                </span>
              </div>
              <form action={updateUser} className="grid gap-3 sm:grid-cols-[1fr_8rem_1fr_auto]">
                <input type="hidden" name="id" value={user.id} />
                <Input name="name" defaultValue={user.name} required />
                <Select name="role" defaultValue={user.role}>
                  <option value="EDITOR">EDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                </Select>
                <Input
                  name="password"
                  type="password"
                  minLength={8}
                  placeholder="New password (optional)"
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 font-mono text-[11px] text-ink-dim">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={user.isActive}
                      className="accent-cyan-400"
                    />
                    active
                  </label>
                  <Button type="submit" variant="ghost">
                    Save
                  </Button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
