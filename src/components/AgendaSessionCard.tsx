"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AvailabilityButtons } from "@/components/AvailabilityButtons";
import { statusLabels } from "@/lib/format";
import type { AvailabilityStatus, SessionKind } from "@/lib/schema";

type RsvpStatus = "yes" | "maybe" | "no";

const CHIP_ORDER: RsvpStatus[] = ["yes", "maybe", "no"];

type AgendaSessionCardProps = {
  sessionId: number;
  sessionKind: SessionKind;
  kindLabel: string;
  dateLabel: string;
  timeRange: string | null;
  topic: string;
  names: {
    yes: string[];
    maybe: string[];
    no: string[];
  };
  currentPlayerName?: string;
  currentPlayerStatus?: AvailabilityStatus;
  showOwnRsvpControls?: boolean;
};

function useFineHover() {
  const [fineHover, setFineHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFineHover(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return fineHover;
}

export function AgendaSessionCard({
  sessionId,
  sessionKind,
  kindLabel,
  dateLabel,
  timeRange,
  topic,
  names,
  currentPlayerName,
  currentPlayerStatus,
  showOwnRsvpControls = false,
}: AgendaSessionCardProps) {
  const [openStatus, setOpenStatus] = useState<RsvpStatus | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const fineHover = useFineHover();
  const baseId = useId();

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenStatus(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenStatus(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <article
      ref={rootRef}
      className={`agenda-card session-row agenda-card--${sessionKind}`}
    >
      <div className="agenda-meta session-meta">
        {sessionKind !== "training" ? (
          <span className="agenda-kind-badge">{kindLabel}</span>
        ) : null}
        <p className="agenda-date session-day">{dateLabel}</p>
        {timeRange ? (
          <p className="agenda-time session-time">{timeRange}</p>
        ) : (
          <p className="agenda-time session-time muted">Uhrzeit folgt</p>
        )}
        <h3 className="agenda-topic session-title">{topic}</h3>
      </div>

      {showOwnRsvpControls ? (
        <AvailabilityButtons sessionId={sessionId} current={currentPlayerStatus} />
      ) : null}

      <div className="agenda-chips">
        {CHIP_ORDER.map((status) => {
          const list = names[status];
          const label = statusLabels[status];
          const isOpen = openStatus === status;
          const popoverId = `${baseId}-${sessionId}-${status}`;

          return (
            <div
              key={status}
              className="agenda-chip-wrap"
              data-open={isOpen || undefined}
              onMouseEnter={() => {
                if (fineHover) setOpenStatus(status);
              }}
              onMouseLeave={() => {
                if (fineHover) setOpenStatus(null);
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setOpenStatus(null);
                }
              }}
            >
              <button
                type="button"
                className={`pill pill-${status} agenda-chip`}
                aria-expanded={isOpen}
                aria-controls={popoverId}
                onClick={() => {
                  if (!fineHover) {
                    setOpenStatus((prev) => (prev === status ? null : status));
                  }
                }}
                onFocus={() => {
                  if (fineHover) setOpenStatus(status);
                }}
              >
                {list.length} {label}
              </button>
              {isOpen ? (
                <div
                  id={popoverId}
                  role="dialog"
                  aria-label={`${label}: ${list.length}`}
                  className="agenda-popover"
                >
                  {list.length === 0 ? (
                    <p className="muted agenda-popover-empty">Noch niemand</p>
                  ) : (
                    <ul className="agenda-name-list">
                      {list.map((name) => (
                        <li
                          key={name}
                          className={
                            currentPlayerName && name === currentPlayerName
                              ? "agenda-name-self"
                              : undefined
                          }
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}
