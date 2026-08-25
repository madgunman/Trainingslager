import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { publishAgenda, unpublishAgenda } from "@/app/actions";
import { AdminSessionSlotList, type AdminSessionSlot } from "@/components/AdminSessionSlotList";
import { SessionEditor, SettingsForm } from "@/components/AdminForms";
import { SiteHeader } from "@/components/SiteHeader";
import { getDb } from "@/lib/db";
import { formatSessionDay, formatSessionSlot, isTrainingSession, sessionKindLabels } from "@/lib/format";
import {
  availability,
  exerciseRequests,
  players,
} from "@/lib/schema";
import { getSettings } from "@/lib/seed";
import { listSessionsInListOrder } from "@/lib/session-list";
import { requireAdmin } from "@/lib/session";

function formatAgendaTimeRange(
  start: string | null,
  end: string | null,
): string {
  if (!start && !end) return "ohne Uhrzeit";
  if (start && end) return `${start}–${end}`;
  return start || end || "ohne Uhrzeit";
}

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const db = getDb();
  const config = getSettings(db);
  const allSessions = listSessionsInListOrder(db);
  const allPlayers = db.select().from(players).orderBy(asc(players.name)).all();
  const allAvailability = db.select().from(availability).all();
  const allRequests = db
    .select({
      id: exerciseRequests.id,
      requestText: exerciseRequests.requestText,
      createdAt: exerciseRequests.createdAt,
      playerName: players.name,
    })
    .from(exerciseRequests)
    .innerJoin(players, eq(exerciseRequests.playerId, players.id))
    .orderBy(asc(exerciseRequests.createdAt))
    .all();

  const playerNameById = new Map(allPlayers.map((p) => [p.id, p.name]));
  const agendaPublished = config.agendaPublished;

  const adminSlots: AdminSessionSlot[] = allSessions.map((session) => {
    const topic = session.notes.trim() !== "" ? session.notes : session.title;
    const kindLabel = sessionKindLabels[session.sessionKind];
    const heading = isTrainingSession(session.sessionKind)
      ? formatSessionSlot(session.sessionDate, session.dayPart)
      : `${formatSessionDay(session.sessionDate)} · ${formatAgendaTimeRange(
          session.agendaStartTime,
          session.agendaEndTime,
        )} · ${topic}`;

    const responses = allAvailability
      .filter((row) => row.sessionId === session.id)
      .map((row) => ({
        playerName: playerNameById.get(row.playerId) ?? "Unbekannt",
        status: row.status,
      }));

    return {
      id: session.id,
      title: session.title,
      sessionDate: session.sessionDate,
      dayPart: session.dayPart,
      sessionKind: session.sessionKind,
      notes: session.notes,
      location: session.location,
      agendaStartTime: session.agendaStartTime,
      agendaEndTime: session.agendaEndTime,
      heading,
      kindLabel,
      responses,
    };
  });

  return (
    <>
      <SiteHeader title={config.weekendTitle} isAdmin />
      <main className="page-shell">
        <section className="section">
          <div className="section-head">
            <h2>Wochenende steuern</h2>
            <p>Zeitplan pflegen, Rückmeldungen und Übungswünsche im Blick behalten.</p>
          </div>
          <div className="admin-panel" style={{ marginBottom: "1rem" }}>
            <h3>Programm</h3>
            <p>
              Status:{" "}
              <strong>{agendaPublished ? "Veröffentlicht" : "Entwurf"}</strong>
            </p>
            <p className="muted">
              Das Spieler-Programm zeigt Datum, Uhrzeit und Thema für alle Slot-Arten.
              Trainingsslots zählen zusätzlich zur Verfügbarkeit; optionale Slots (Anreise,
              Essen, …) nur im Programm.
            </p>
            {allSessions.length === 0 ? (
              <p className="muted">Noch keine Zeitslots für die Vorschau.</p>
            ) : (
              <ul style={{ margin: "0.75rem 0 1rem", paddingLeft: "1.1rem" }}>
                {allSessions.map((session) => {
                  const topic =
                    session.notes.trim() !== "" ? session.notes : session.title;
                  const kindLabel = sessionKindLabels[session.sessionKind];
                  return (
                    <li key={session.id}>
                      {kindLabel} · {formatSessionDay(session.sessionDate)} ·{" "}
                      {formatAgendaTimeRange(
                        session.agendaStartTime,
                        session.agendaEndTime,
                      )}{" "}
                      · {topic}
                    </li>
                  );
                })}
              </ul>
            )}
            {agendaPublished ? (
              <form action={unpublishAgenda}>
                <button type="submit" className="btn-danger">
                  Programm zurückziehen
                </button>
              </form>
            ) : (
              <form action={publishAgenda}>
                <button type="submit" className="btn-primary">
                  Programm veröffentlichen
                </button>
              </form>
            )}
          </div>
          <div className="admin-grid">
            <div className="admin-panel">
              <h3>Einstellungen</h3>
              <SettingsForm
                weekendTitle={config.weekendTitle}
                weekendSubtitle={config.weekendSubtitle}
                inviteCode={config.inviteCode}
              />
            </div>
            <div className="admin-panel">
              <h3>Neuer Zeitslot</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                Neue Slots erscheinen unten in der Liste.
              </p>
              <SessionEditor key={`new-${allSessions.length}`} />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Zeitslots</h2>
            <p>
              {allSessions.filter((s) => isTrainingSession(s.sessionKind)).length} Trainingsslots
              · {allSessions.length} Slots gesamt
            </p>
          </div>
          <AdminSessionSlotList
            key={allSessions.map((session) => `${session.listPosition}-${session.id}`).join("|")}
            slots={adminSlots}
          />
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Übungswünsche</h2>
            <p>{allRequests.length} eingegangene Wünsche</p>
          </div>
          <div className="request-list">
            {allRequests.length === 0 ? (
              <p className="muted">Noch keine Übungswünsche.</p>
            ) : (
              allRequests.map((req) => (
                <div key={req.id} className="request-item">
                  <p>{req.requestText}</p>
                  <small>
                    {req.playerName} · {req.createdAt}
                  </small>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Angemeldete Spieler</h2>
            <p>{allPlayers.length} Personen haben sich eingeloggt</p>
          </div>
          <div className="admin-panel">
            {allPlayers.length === 0 ? (
              <p className="muted">Noch niemand angemeldet.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {allPlayers.map((player) => (
                  <li key={player.id}>{player.name}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
