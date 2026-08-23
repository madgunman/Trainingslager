"use client";

import { useActionState, useEffect, useRef } from "react";
import { createExerciseRequest, type ActionResult } from "@/app/actions";

const initial: ActionResult | null = null;

export function ExerciseRequestForm() {
  const [state, action, pending] = useActionState(createExerciseRequest, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="exercise-form">
      <label className="field">
        <span>Welche Übung oder welchen Schwerpunkt wünschst du dir?</span>
        <textarea
          name="requestText"
          rows={3}
          maxLength={500}
          placeholder="z. B. Aufschlagvarianten im Unterdruck, Footwork nach Rückhand-Block…"
          required
        />
      </label>
      {state && !state.ok ? <p className="form-error">{state.error}</p> : null}
      {state?.ok ? <p className="form-ok">Wunsch gespeichert – danke!</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Senden…" : "Übungswunsch senden"}
      </button>
    </form>
  );
}
