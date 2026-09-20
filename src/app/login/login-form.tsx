"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { loginAction, type LoginState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { labels } from "@/lib/labels";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label={labels.login.password} htmlFor="password" error={state.error}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          dir="ltr"
          aria-invalid={state.error ? true : undefined}
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        <LockKeyhole className="size-4" aria-hidden />
        {pending ? labels.login.submitting : labels.login.submit}
      </Button>
    </form>
  );
}
