"use client";

import { useActionState } from "react";
import { loginPlayer, type ActionResult } from "@/app/actions";

const initial: ActionResult | null = null;

export function LoginForm() {
  const [state, action, pending] = useActionState(loginPlayer, initial);

  return (
    <form action={action} className="login-form">
      <label className="field">
        <span>Einladungscode</span>
        <input
          name="inviteCode"
          autoComplete="off"
          placeholder="z. B. POSTWEEKEND"
          required
        />
      </label>
      <label className="field">
        <span>Dein Name</span>
        <input
          name="name"
          autoComplete="name"
          placeholder="Vor- und Nachname"
          required
          minLength={2}
        />
      </label>
      {state && !state.ok ? <p className="form-error">{state.error}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Wird geprüft…" : "Zum Plan"}
      </button>
    </form>
  );
}
