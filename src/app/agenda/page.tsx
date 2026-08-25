import { redirect } from "next/navigation";
import { AgendaSessionCard } from "@/components/AgendaSessionCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getDb } from "@/lib/db";
import {
  formatAgendaTimeRange,
  formatSessionDay,
  isTrainingSession,
  sessionKindLabels,
} from "@/lib/format";
import {
  availability,
  players,
  type AvailabilityStatus,
} from "@/lib/schema";
import { getSettings } from "@/lib/seed";
import { listSessionsInSortOrder } from "@/lib/session-order";
import { requirePlayer } from "@/lib/session";

type NameBuckets = {
  yes: string[];
  maybe: string[];
  no: string[];
};

function emptyBuckets(): NameBuckets {
  return { yes: [], maybe: [], no: [] };
}

export default async function AgendaPage() {
  const auth = await requirePlayer();
  if (!auth?.playerId || !auth.playerName) redirect("/");

  const db = getDb();
  const config = getSettings(db);

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
            <h2>Programm</h2>
            <p>Terminplan mit Uhrzeiten und Rückmeldungen der Mannschaft.</p>
          </div>

          {!config.agendaPublished ? (
            <p className="muted agenda-unpublished">
              Programm folgt bald — sobald die Trainer es freigeben, siehst du hier
              Uhrzeiten und Themen.
            </p>
          ) : (
            <PublishedAgenda
              currentPlayerName={auth.playerName}
              currentPlayerId={auth.playerId}
            />
          )}
        </section>
      </main>
    </>
  );
}

function PublishedAgenda({
  currentPlayerName,
  currentPlayerId,
}: {
  currentPlayerName: string;
  currentPlayerId: number;
}) {
  const db = getDb();
  const sorted = listSessionsInSortOrder(db);
  const allPlayers = db.select().from(players).all();
  const allAvailability = db.select().from(availability).all();

  const playerNameById = new Map(allPlayers.map((p) => [p.id, p.name]));
  const myStatusBySession = new Map<number, AvailabilityStatus>();
  for (const row of allAvailability) {
    if (row.playerId === currentPlayerId) {
      myStatusBySession.set(row.sessionId, row.status);
    }
  }

  const namesBySession = new Map<number, NameBuckets>();
  for (const session of sorted) {
    namesBySession.set(session.id, emptyBuckets());
  }

  for (const row of allAvailability) {
    const buckets = namesBySession.get(row.sessionId);
    if (!buckets) continue;
    const name = playerNameById.get(row.playerId);
    if (!name) continue;
    const status = row.status as AvailabilityStatus;
    buckets[status].push(name);
  }

  for (const buckets of namesBySession.values()) {
    for (const key of ["yes", "maybe", "no"] as const) {
      buckets[key].sort((a, b) => a.localeCompare(b, "de"));
    }
  }

  if (sorted.length === 0) {
    return <p className="muted">Noch keine Termine im Programm.</p>;
  }

  return (
    <div className="session-list agenda-list">
      {sorted.map((session) => {
        const topic =
          session.notes.trim() !== "" ? session.notes.trim() : session.title;
        const kind = session.sessionKind;
        return (
          <AgendaSessionCard
            key={session.id}
            sessionId={session.id}
            sessionKind={kind}
            kindLabel={sessionKindLabels[kind]}
            dateLabel={formatSessionDay(session.sessionDate)}
            timeRange={formatAgendaTimeRange(
              session.agendaStartTime,
              session.agendaEndTime,
            )}
            topic={topic}
            names={namesBySession.get(session.id) ?? emptyBuckets()}
            currentPlayerName={currentPlayerName}
            currentPlayerStatus={myStatusBySession.get(session.id)}
            showOwnRsvpControls={!isTrainingSession(kind)}
          />
        );
      })}
    </div>
  );
}
