"use client";

import Link from "next/link";
import { Accessibility, Languages, MapPin, MonitorPlay, UserRound } from "lucide-react";
import { ACCESSIBILITY_LABELS } from "@/lib/data";
import { cityName, cn, formatDate } from "@/lib/utils";
import type { Salon } from "@/lib/types";
import { Badge } from "./ui";

export function SalonCard({ salon, left, active, onHover, witnessName }: { salon: Salon; left: number; active?: boolean; onHover?: (id?: string) => void; witnessName?: string }) {
  return (
    <Link
      href={`/salons/${salon.id}`}
      onMouseEnter={() => onHover?.(salon.id)}
      onMouseLeave={() => onHover?.(undefined)}
      className={cn(
        "block rounded-xl border bg-paper p-4 transition-colors hover:border-ink",
        active ? "border-ink ring-2 ring-brand" : "border-line",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{formatDate(salon.date)} · {salon.time}</p>
          <h3 className="mt-0.5 text-lg font-semibold">הסלון של {salon.orgName ?? salon.hostName}</h3>
        </div>
        {left === 0 ? <Badge tone="rose">מלא</Badge> : <Badge tone={left <= 3 ? "brand" : "green"}>{left} מקומות</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          {salon.digital ? <MonitorPlay className="size-4" /> : <MapPin className="size-4" />}
          {salon.digital ? "סלון דיגיטלי" : cityName(salon.cityId)}
        </span>
        <span className="inline-flex items-center gap-1.5"><Languages className="size-4" />{salon.language}</span>
        {salon.accessibility.length > 0 && (
          <span className="inline-flex items-center gap-1.5"><Accessibility className="size-4" />{salon.accessibility.map((a) => ACCESSIBILITY_LABELS[a]).join(" · ")}</span>
        )}
        {witnessName && <span className="inline-flex items-center gap-1.5 text-ink"><UserRound className="size-4" />עדות: {witnessName}</span>}
      </div>
    </Link>
  );
}
