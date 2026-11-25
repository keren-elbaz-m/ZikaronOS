"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownUp, Download } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { CITIES } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, seatsTaken, shortDate } from "@/lib/utils";

type SortKey = "date" | "host" | "city" | "fill";

export default function AdminSalons() {
  const { salons, registrations, witnesses, ready } = useStore();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: 1 });

  const rows = useMemo(() => {
    const list = salons.map((s) => {
      const taken = seatsTaken(s.id, registrations);
      const witness = witnesses.find((w) => w.id === s.witnessId);
      const st = !s.wantsWitness ? "self" : witness ? "assigned" : "waiting";
      return { s, taken, witness, st, fill: taken / s.capacity };
    });
    return list
      .filter(({ s, st }) => (!q || `${s.hostName} ${s.orgName ?? ""} ${s.address} ${s.email}`.includes(q)) && (!city || s.cityId === city) && (!status || st === status))
      .sort((a, b) => {
        const v = { date: a.s.date + a.s.time > b.s.date + b.s.time ? 1 : -1, host: a.s.hostName.localeCompare(b.s.hostName, "he"), city: cityName(a.s.cityId).localeCompare(cityName(b.s.cityId), "he"), fill: a.fill - b.fill }[sort.key];
        return v * sort.dir;
      });
  }, [salons, registrations, witnesses, q, city, status, sort]);

  const exportCsv = () => {
    const header = ["מזהה", "מארח/ת", "ארגון", "תאריך", "שעה", "עיר", "כתובת", "רשומים", "קיבולת", "עד/ה"];
    const lines = rows.map(({ s, taken, witness }) => [s.id, s.hostName, s.orgName ?? "", s.date, s.time, cityName(s.cityId), s.address, taken, s.capacity, witness?.name ?? ""]);
    const csv = "﻿" + [header, ...lines].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `salons-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="py-3 text-start font-medium" aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : 1 }))}>
        {children}<ArrowDownUp className="size-3.5" />
      </button>
    </th>
  );

  if (!ready) return null;
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">סלונים</h1>
          <p className="mt-1 text-muted">מציג {rows.length} מתוך {salons.length}</p>
        </div>
        <Button variant="secondary" onClick={exportCsv}><Download className="size-4" />ייצוא CSV ({rows.length})</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="חיפוש: מארח, ארגון, כתובת, מייל" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש" />
        <Select value={city} onChange={(e) => setCity(e.target.value)} aria-label="עיר"><option value="">כל הערים</option>{CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="סטטוס עד"><option value="">כל הסטטוסים</option><option value="waiting">ממתין לעד/ה</option><option value="assigned">צוות עד/ה</option><option value="self">עדות עצמאית</option></Select>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line bg-cream/60 text-muted">
            <tr className="[&>th]:px-4">
              <Th k="host">מארח/ת</Th><Th k="date">מועד</Th><Th k="city">מיקום</Th><Th k="fill">תפוסה</Th>
              <th className="py-3 text-start font-medium">עד/ה</th><th className="py-3 text-start font-medium">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, taken, witness, st }) => (
              <tr key={s.id} className="border-b border-line/60 hover:bg-cream/40 [&>td]:px-4">
                <td className="py-3"><Link href={`/salons/${s.id}`} className="font-medium hover:underline">{s.orgName ?? s.hostName}</Link>{s.orgName && <p className="text-xs text-muted">{s.hostName}</p>}</td>
                <td className="tabular-nums">{shortDate(s.date)} · {s.time}</td>
                <td>{s.digital ? "דיגיטלי" : cityName(s.cityId)}</td>
                <td className="tabular-nums">{taken}/{s.capacity}</td>
                <td>{witness?.name ?? "—"}</td>
                <td>
                  {st === "waiting" ? <Link href={`/admin/teaming?salon=${s.id}`}><Badge tone="rose">ממתין לעד/ה</Badge></Link> : st === "assigned" ? <Badge tone="green">צוות</Badge> : <Badge>עצמאי</Badge>}
                  {!s.isOpen && <Badge className="ms-1">סגור</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
