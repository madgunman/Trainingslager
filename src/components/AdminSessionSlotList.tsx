"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteSession, reorderSessionSlots } from "@/app/actions";
import { SessionEditor } from "@/components/AdminForms";
import { statusLabels } from "@/lib/format";
import type { AvailabilityStatus, DayPart, SessionKind } from "@/lib/schema";

export type AdminSessionSlot = {
  id: number;
  title: string;
  sessionDate: string;
  dayPart: DayPart;
  sessionKind: SessionKind;
  notes: string;
  location: string;
  agendaStartTime: string | null;
  agendaEndTime: string | null;
  heading: string;
  kindLabel: string;
  responses: { playerName: string; status: AvailabilityStatus }[];
};

function reorderIds(ids: number[], draggedId: number, targetId: number) {
  if (draggedId === targetId) return ids;
  const next = [...ids];
  const from = next.indexOf(draggedId);
  const to = next.indexOf(targetId);
  if (from < 0 || to < 0) return ids;
  next.splice(from, 1);
  next.splice(to, 0, draggedId);
  return next;
}

export function AdminSessionSlotList({ slots }: { slots: AdminSessionSlot[] }) {
  const router = useRouter();
  const [orderedSlots, setOrderedSlots] = useState(slots);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const dragIdRef = useRef<number | null>(null);

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function persistOrder(nextIds: number[]) {
    startTransition(async () => {
      const result = await reorderSessionSlots(nextIds);
      if (!result.ok) {
        setOrderedSlots(slots);
        return;
      }
      router.refresh();
    });
  }

  function handleDrop(targetId: number) {
    const draggedId = dragIdRef.current;
    dragIdRef.current = null;
    setDraggingId(null);
    if (draggedId === null || draggedId === targetId) return;

    const nextIds = reorderIds(
      orderedSlots.map((slot) => slot.id),
      draggedId,
      targetId,
    );
    const nextSlots = nextIds
      .map((id) => orderedSlots.find((slot) => slot.id === id))
      .filter((slot): slot is AdminSessionSlot => Boolean(slot));

    setOrderedSlots(nextSlots);
    persistOrder(nextIds);
  }

  if (orderedSlots.length === 0) {
    return <p className="muted">Noch keine Zeitslots angelegt.</p>;
  }

  return (
    <div className="admin-slot-list" data-pending={pending || undefined}>
      <p className="muted admin-slot-hint">
        Ziehe am Griff, um Slots im Programm anzuordnen.
      </p>
      {orderedSlots.map((slot) => {
        const isOpen = expanded.has(slot.id);
        const isDragging = draggingId === slot.id;

        return (
          <article
            key={slot.id}
            className="admin-slot-card admin-panel"
            data-dragging={isDragging || undefined}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(slot.id);
            }}
          >
            <div className="admin-slot-header">
              <button
                type="button"
                className="admin-slot-drag"
                draggable
                aria-label={`${slot.heading} verschieben`}
                onDragStart={(event) => {
                  dragIdRef.current = slot.id;
                  setDraggingId(slot.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(slot.id));
                }}
                onDragEnd={() => {
                  dragIdRef.current = null;
                  setDraggingId(null);
                }}
              >
                ⠿
              </button>
              <button
                type="button"
                className="admin-slot-toggle"
                aria-expanded={isOpen}
                onClick={() => toggleExpanded(slot.id)}
              >
                <span className="pill pill-maybe admin-kind-badge">{slot.kindLabel}</span>
                <span className="admin-slot-heading">{slot.heading}</span>
                <span className="admin-slot-chevron" aria-hidden>
                  {isOpen ? "▾" : "▸"}
                </span>
              </button>
            </div>

            {isOpen ? (
              <div className="admin-slot-body">
                {slot.notes ? <p className="muted">{slot.notes}</p> : null}

                <div className="admin-slot-rsvp">
                  <table className="rsvp-table">
                    <thead>
                      <tr>
                        <th>Spieler</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slot.responses.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="muted">
                            Noch keine Rückmeldungen
                          </td>
                        </tr>
                      ) : (
                        slot.responses.map((row) => (
                          <tr key={`${slot.id}-${row.playerName}-${row.status}`}>
                            <td>{row.playerName}</td>
                            <td>
                              <span className={`pill pill-${row.status}`}>
                                {statusLabels[row.status]}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <SessionEditor
                  key={slot.id}
                  session={{
                    id: slot.id,
                    title: slot.title,
                    sessionDate: slot.sessionDate,
                    dayPart: slot.dayPart,
                    sessionKind: slot.sessionKind,
                    location: slot.location,
                    notes: slot.notes,
                    listPosition: 0,
                    agendaStartTime: slot.agendaStartTime,
                    agendaEndTime: slot.agendaEndTime,
                  }}
                />

                <form action={deleteSession.bind(null, slot.id)}>
                  <button type="submit" className="btn-danger">
                    Slot löschen
                  </button>
                </form>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
