"use client";

import { useActionState } from "react";
import { loginAdmin, type ActionResult } from "@/app/actions";

const initial: ActionResult | null = null;

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(loginAdmin, initial);

  return (
    <form action={action} className="login-form">
      <label className="field">
        <span>Trainer-Passwort</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state && !state.ok ? <p className="form-error">{state.error}</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Anmelden…" : "Admin öffnen"}
      </button>
    </form>
  );
}
