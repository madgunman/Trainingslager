"use client";

import { useTransition } from "react";
import { setAvailability } from "@/app/actions";
import type { AvailabilityStatus } from "@/lib/schema";
import { statusLabels } from "@/lib/format";

const options: AvailabilityStatus[] = ["yes", "no", "maybe"];

export function AvailabilityButtons({
  sessionId,
  current,
}: {
  sessionId: number;
  current?: AvailabilityStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="avail-group" data-pending={pending || undefined}>
      {options.map((status) => (
        <button
          key={status}
          type="button"
          className={`avail-btn avail-${status}`}
          data-active={current === status || undefined}
          disabled={pending}
          onClick={() => startTransition(() => setAvailability(sessionId, status))}
        >
          {statusLabels[status]}
        </button>
      ))}
    </div>
  );
}
