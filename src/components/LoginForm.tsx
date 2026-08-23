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
          required
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Vorname</span>
          <input
            name="firstName"
            autoComplete="given-name"
            placeholder="Vorname"
            required
            minLength={1}
          />
        </label>
        <label className="field">
          <span>Nachname</span>
          <input
            name="lastName"
            autoComplete="family-name"
            placeholder="Nachname"
            required
            minLength={1}
          />
        </label>
      </div>
      {state && !state.ok ? <p className="form-error">{state.error}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Wird geprüft…" : "Zum Plan"}
      </button>
    </form>
  );
}
