"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { CITIES } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, displayPhone, downloadCsv, shortDate, timeAgo } from "@/lib/utils";

export default function GuestsPage() {
  const { registrations, salons, ready } = useStore();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [seats, setSeats] = useState("");

  const rows = useMemo(
    () =>
      registrations
        .map((r) => ({ r, s: salons.find((x) => x.id === r.salonId) }))
        .filter(({ r, s }) => s && (!q || `${r.name} ${r.email} ${r.phone}`.includes(q)) && (!city || s.cityId === city) && (!seats || r.seats === Number(seats)))
        .sort((a, b) => b.r.createdAt.localeCompare(a.r.createdAt)),
    [registrations, salons, q, city, seats],
  );

  if (!ready) return null;
  const totalSeats = rows.reduce((n, x) => n + x.r.seats, 0);

  return (
    <main className="space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">אורחים</h1>
          <p className="mt-1 text-muted">{rows.length} הרשמות · {totalSeats} מקומות</p>
        </div>
        <Button variant="secondary" disabled={!rows.length} onClick={() => downloadCsv(`guests-${new Date().toISOString().slice(0, 10)}.csv`, ["שם", "טלפון", "מייל", "מקומות", "סלון", "תאריך", "עיר"], rows.map(({ r, s }) => [r.name, displayPhone(r.phone), r.email, r.seats, s!.orgName ?? s!.hostName, s!.date, cityName(s!.cityId)]))}>
          <Download className="size-4" />ייצוא ({rows.length})
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="חיפוש: שם, מייל או טלפון" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש" />
        <Select value={city} onChange={(e) => setCity(e.target.value)} aria-label="עיר הסלון"><option value="">כל הערים</option>{CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select value={seats} onChange={(e) => setSeats(e.target.value)} aria-label="מקומות"><option value="">כל הגדלים</option>{[1, 2, 3].map((n) => <option key={n} value={n}>{n} מקומות</option>)}</Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="אין הרשמות שתואמות לסינון" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line bg-cream/60 text-muted">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium"><th>שם</th><th>מקומות</th><th>טלפון</th><th>מייל</th><th>סלון</th><th>נרשם/ה</th></tr>
            </thead>
            <tbody>
              {rows.map(({ r, s }) => (
                <tr key={r.id} className="border-b border-line/60 hover:bg-cream/40 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-medium">{r.name}</td>
                  <td className="tabular-nums">{r.seats}</td>
                  <td dir="ltr" className="text-end">{displayPhone(r.phone)}</td>
                  <td dir="ltr" className="text-end">{r.email}</td>
                  <td><Link className="hover:underline" href={`/admin/salons/${s!.id}`}>{s!.orgName ?? s!.hostName}</Link> <span className="text-muted">· {shortDate(s!.date)} · {s!.digital ? "דיגיטלי" : cityName(s!.cityId)}</span></td>
                  <td className="text-muted">{timeAgo(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </main>
  );
}
