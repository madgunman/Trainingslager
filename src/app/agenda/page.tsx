import { redirect } from "next/navigation";
import { AgendaSessionCard } from "@/components/AgendaSessionCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getDb } from "@/lib/db";
import {
  dayPartOrder,
  formatAgendaTimeRange,
  formatSessionDay,
  isTrainingSession,
  sessionKindLabels,
} from "@/lib/format";
import {
  availability,
  players,
  sessions,
  type AvailabilityStatus,
  type DayPart,
} from "@/lib/schema";
import { getSettings } from "@/lib/seed";
import { requirePlayer } from "@/lib/session";

type NameBuckets = {
  yes: string[];
  maybe: string[];
  no: string[];
};

function emptyBuckets(): NameBuckets {
  return { yes: [], maybe: [], no: [] };
}

function compareNullableTime(a: string | null, b: string | null) {
  const aEmpty = !a?.trim();
  const bEmpty = !b?.trim();
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return a!.localeCompare(b!);
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
  const allSessions = db.select().from(sessions).all();
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
  for (const session of allSessions) {
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

  const sorted = [...allSessions].sort((a, b) => {
    const byDate = a.sessionDate.localeCompare(b.sessionDate);
    if (byDate !== 0) return byDate;

    const byTime = compareNullableTime(a.agendaStartTime, b.agendaStartTime);
    if (byTime !== 0) return byTime;

    const byOrder = a.sortOrder - b.sortOrder;
    if (byOrder !== 0) return byOrder;

    return (
      (dayPartOrder[a.dayPart as DayPart] ?? 99) -
      (dayPartOrder[b.dayPart as DayPart] ?? 99)
    );
  });

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
