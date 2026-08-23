import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { deleteExerciseRequest } from "@/app/actions";
import { AvailabilityButtons } from "@/components/AvailabilityButtons";
import { ExerciseRequestForm } from "@/components/ExerciseRequestForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getDb } from "@/lib/db";
import { formatSessionDay, formatSessionTime } from "@/lib/format";
import { availability, exerciseRequests, sessions } from "@/lib/schema";
import { getSettings } from "@/lib/seed";
import { requirePlayer } from "@/lib/session";

export default async function PlanPage() {
  const auth = await requirePlayer();
  if (!auth?.playerId || !auth.playerName) redirect("/");

  const db = getDb();
  const config = getSettings(db);
  const allSessions = db
    .select()
    .from(sessions)
    .orderBy(asc(sessions.sortOrder), asc(sessions.startsAt))
    .all();
  const myAvailability = db
    .select()
    .from(availability)
    .where(eq(availability.playerId, auth.playerId))
    .all();
  const myRequests = db
    .select()
    .from(exerciseRequests)
    .where(eq(exerciseRequests.playerId, auth.playerId))
    .orderBy(asc(exerciseRequests.createdAt))
    .all();

  const availMap = new Map(myAvailability.map((row) => [row.sessionId, row.status]));

  return (
    <>
      <SiteHeader
        title={config.weekendTitle}
        subtitle={config.weekendSubtitle}
        playerName={auth.playerName}
      />
      <main className="page-shell">
        <section className="section">
          <div className="section-head">
            <h2>Zeitplan</h2>
            <p>Melde dich für jede Einheit verbindlich an oder ab.</p>
          </div>
          <div className="session-list">
            {allSessions.length === 0 ? (
              <p className="muted">Noch keine Einheiten eingetragen.</p>
            ) : (
              allSessions.map((session) => (
                <article key={session.id} className="session-row">
                  <div className="session-meta">
                    <p className="session-day">{formatSessionDay(session.startsAt)}</p>
                    <h3 className="session-title">{session.title}</h3>
                    <p className="session-time">
                      {formatSessionTime(session.startsAt, session.endsAt)}
                    </p>
                    <p className="session-location">{session.location}</p>
                    {session.notes ? (
                      <p className="session-notes">{session.notes}</p>
                    ) : null}
                  </div>
                  <AvailabilityButtons
                    sessionId={session.id}
                    current={availMap.get(session.id)}
                  />
                </article>
              ))
            )}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Übungswünsche</h2>
            <p>Sag den Trainern, woran du individuell arbeiten möchtest.</p>
          </div>
          <div className="admin-panel" style={{ marginBottom: "1rem" }}>
            <ExerciseRequestForm />
          </div>
          {myRequests.length > 0 ? (
            <div className="request-list">
              {myRequests.map((req) => (
                <div key={req.id} className="request-item">
                  <p>{req.requestText}</p>
                  <small>Gesendet am {req.createdAt}</small>
                  <form action={deleteExerciseRequest.bind(null, req.id)} style={{ marginTop: "0.5rem" }}>
                    <button type="submit" className="btn-danger">
                      Löschen
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Du hast noch keine Wünsche eingereicht.</p>
          )}
        </section>
      </main>
    </>
  );
}
