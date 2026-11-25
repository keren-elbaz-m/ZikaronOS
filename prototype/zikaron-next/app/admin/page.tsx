"use client";

import Link from "next/link";
import { ArrowLeft, AlertTriangle, UserRoundSearch, UsersRound } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cityName, formatDate, seatsTaken, shortDate } from "@/lib/utils";

export default function AdminDashboard() {
  const { salons, registrations, witnesses, ready } = useStore();
  if (!ready) return null;

  const needWitness = salons.filter((s) => s.wantsWitness && !s.witnessId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const seats = registrations.reduce((n, r) => n + r.seats, 0);
  const capacity = salons.filter((s) => s.isOpen).reduce((n, s) => n + s.capacity, 0);
  const assignedWitnessIds = new Set(salons.map((s) => s.witnessId).filter(Boolean));
  const almostFull = salons.filter((s) => s.isOpen && s.capacity - seatsTaken(s.id, registrations) <= 2);

  const kpis = [
    { label: "סלונים", value: salons.length, sub: `${salons.filter((s) => s.isOpen).length} פתוחים · ${salons.filter((s) => s.digital).length} דיגיטליים` },
    { label: "ממתינים לעד/ה", value: needWitness.length, sub: "דורש ציוות", tone: needWitness.length ? "rose" : "green" },
    { label: "אורחים רשומים", value: seats, sub: `${Math.round((seats / Math.max(1, capacity)) * 100)}% מהקיבולת` },
    { label: "עדים זמינים", value: witnesses.filter((w) => !assignedWitnessIds.has(w.id)).length, sub: `מתוך ${witnesses.length}` },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-semibold">לוח בקרה</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-sm text-muted">{k.label}</p>
            <p className={`mt-1 text-4xl font-semibold tabular-nums ${k.tone === "rose" ? "text-rose" : ""}`}>{k.value}</p>
            <p className="mt-1 text-sm text-muted">{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><UserRoundSearch className="size-5" />צריכים עד/ה</h2>
            <Link href="/admin/teaming" className="inline-flex items-center gap-1 text-sm font-medium hover:underline">לציוות <ArrowLeft className="size-4" /></Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {needWitness.length === 0 && <li className="py-3 text-muted">כל הסלונים צוותו 🎉</li>}
            {needWitness.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">הסלון של {s.orgName ?? s.hostName}</p>
                  <p className="text-sm text-muted">{formatDate(s.date)} · {s.time} · {s.digital ? "דיגיטלי" : cityName(s.cityId)}</p>
                </div>
                <Link href={`/admin/teaming?salon=${s.id}`} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium hover:bg-brand-strong">מציאת עד/ה</Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="size-5" />כמעט מלאים</h2>
          <ul className="mt-4 divide-y divide-line">
            {almostFull.length === 0 && <li className="py-3 text-muted">אין סלונים שמתקרבים לתפוסה מלאה.</li>}
            {almostFull.map((s) => {
              const left = Math.max(0, s.capacity - seatsTaken(s.id, registrations));
              return (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">הסלון של {s.orgName ?? s.hostName}</p>
                    <p className="text-sm text-muted">{shortDate(s.date)} · {cityName(s.cityId)}</p>
                  </div>
                  <Badge tone={left === 0 ? "rose" : "brand"}>{left === 0 ? "מלא" : `נותרו ${left}`}</Badge>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted"><UsersRound className="size-4" />כדאי להציע למארחים להגדיל את הסלון או לכוון אורחים לסלונים סמוכים.</p>
        </Card>
      </div>
    </main>
  );
}
