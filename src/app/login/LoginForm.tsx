"use client";

import { useActionState } from "react";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" autoComplete="username" autoFocus required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
        <ErrorText>{state.error}</ErrorText>
      </form>
    </Card>
  );
}
