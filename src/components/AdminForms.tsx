"use client";

import { useActionState } from "react";
import {
  saveWeekendSettings,
  upsertSession,
  type ActionResult,
} from "@/app/actions";
import { formatDateTimeLocal } from "@/lib/format";
import type { Session } from "@/lib/schema";

const initial: ActionResult | null = null;

export function SettingsForm({
  weekendTitle,
  weekendSubtitle,
  inviteCode,
}: {
  weekendTitle: string;
  weekendSubtitle: string;
  inviteCode: string;
}) {
  const [state, action, pending] = useActionState(saveWeekendSettings, initial);

  return (
    <form action={action} className="admin-card-form">
      <label className="field">
        <span>Titel</span>
        <input name="weekendTitle" defaultValue={weekendTitle} required />
      </label>
      <label className="field">
        <span>Untertitel</span>
        <input name="weekendSubtitle" defaultValue={weekendSubtitle} />
      </label>
      <label className="field">
        <span>Einladungscode für Spieler</span>
        <input name="inviteCode" defaultValue={inviteCode} required />
      </label>
      <label className="field">
        <span>Neues Admin-Passwort (optional)</span>
        <input name="newPassword" type="password" autoComplete="new-password" />
      </label>
      {state && !state.ok ? <p className="form-error">{state.error}</p> : null}
      {state?.ok ? <p className="form-ok">Einstellungen gespeichert.</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Speichern…" : "Einstellungen speichern"}
      </button>
    </form>
  );
}

export function SessionEditor({ session }: { session?: Session }) {
  const [state, action, pending] = useActionState(upsertSession, initial);

  return (
    <form action={action} className="admin-card-form">
      {session ? <input type="hidden" name="id" value={session.id} /> : null}
      <label className="field">
        <span>Titel der Einheit</span>
        <input name="title" defaultValue={session?.title ?? ""} required />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Beginn</span>
          <input
            type="datetime-local"
            name="startsAt"
            defaultValue={session ? formatDateTimeLocal(session.startsAt) : ""}
            required
          />
        </label>
        <label className="field">
          <span>Ende</span>
          <input
            type="datetime-local"
            name="endsAt"
            defaultValue={session ? formatDateTimeLocal(session.endsAt) : ""}
            required
          />
        </label>
      </div>
      <label className="field">
        <span>Ort</span>
        <input
          name="location"
          defaultValue={session?.location ?? "Halle am Kristanplatz"}
        />
      </label>
      <label className="field">
        <span>Notizen</span>
        <textarea name="notes" rows={2} defaultValue={session?.notes ?? ""} />
      </label>
      <label className="field">
        <span>Reihenfolge</span>
        <input
          type="number"
          name="sortOrder"
          defaultValue={session?.sortOrder ?? 0}
        />
      </label>
      {state && !state.ok ? <p className="form-error">{state.error}</p> : null}
      {state?.ok ? <p className="form-ok">Einheit gespeichert.</p> : null}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Speichern…" : session ? "Einheit aktualisieren" : "Einheit anlegen"}
      </button>
    </form>
  );
}
