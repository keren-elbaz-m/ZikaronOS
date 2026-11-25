"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { COMMUNITIES } from "@/lib/data";
import { useStore } from "@/lib/store";
import { displayPhone, downloadCsv } from "@/lib/utils";

export default function HostsPage() {
  const { hosts, salons, ready } = useStore();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [community, setCommunity] = useState("");
  const [filter, setFilter] = useState("");

  const rows = useMemo(
    () =>
      hosts
        .map((h) => {
          const mine = salons.filter((s) => s.hostId === h.id);
          return { h, mine, returning: h.history.length > 0, waiting: mine.some((s) => s.wantsWitness && !s.witnessId) };
        })
        .filter(({ h, mine, returning }) =>
          (!q || `${h.name} ${h.orgName ?? ""} ${h.email} ${h.phone}`.includes(q)) &&
          (!kind || (kind === "org" ? h.isOrg : !h.isOrg)) &&
          (!community || h.community === community) &&
          (!filter || (filter === "no_salon" ? mine.length === 0 : filter === "returning" ? returning : filter === "new" ? !returning : true)))
        .sort((a, b) => a.h.name.localeCompare(b.h.name, "he")),
    [hosts, salons, q, kind, community, filter],
  );

  if (!ready) return null;
  return (
    <main className="space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">מארחים</h1>
          <p className="mt-1 text-muted">מציג {rows.length} מתוך {hosts.length} · {hosts.filter((h) => h.history.length).length} מארחים חוזרים</p>
        </div>
        <Button variant="secondary" onClick={() => downloadCsv(`hosts-${new Date().toISOString().slice(0, 10)}.csv`, ["שם", "ארגון", "טלפון", "מייל", "קהילה", "סלונים השנה", "שנים קודמות", "הצטרפות"], rows.map(({ h, mine }) => [h.name, h.orgName ?? "", displayPhone(h.phone), h.email, h.community ?? "", mine.length, h.history.length, h.joinedAt]))}>
          <Download className="size-4" />ייצוא ({rows.length})
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Input placeholder="חיפוש: שם, ארגון, מייל, טלפון" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש" />
        <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="סוג"><option value="">פרטיים וארגונים</option><option value="private">פרטיים</option><option value="org">ארגונים</option></Select>
        <Select value={community} onChange={(e) => setCommunity(e.target.value)} aria-label="קהילה"><option value="">כל הקהילות</option>{COMMUNITIES.map((c) => <option key={c}>{c}</option>)}</Select>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="סינון"><option value="">כולם</option><option value="no_salon">עוד לא פתחו סלון</option><option value="returning">מארחים חוזרים</option><option value="new">מארחים חדשים</option></Select>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line bg-cream/60 text-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium"><th>מארח/ת</th><th>קהילה</th><th>טלפון</th><th>השנה</th><th>שנים קודמות</th><th>הצטרפות</th></tr>
          </thead>
          <tbody>
            {rows.map(({ h, mine, returning, waiting }) => (
              <tr key={h.id} className="border-b border-line/60 hover:bg-cream/40 [&>td]:px-4 [&>td]:py-3">
                <td>
                  <Link href={`/admin/hosts/${h.id}`} className="font-medium hover:underline">{h.orgName ?? h.name}</Link>
                  {h.isOrg && <p className="text-xs text-muted">{h.name} · {h.orgType}</p>}
                </td>
                <td>{h.community ?? "—"}</td>
                <td dir="ltr" className="text-end">{displayPhone(h.phone)}</td>
                <td>
                  {mine.length === 0 ? <Badge tone="brand">עוד לא פתח/ה סלון</Badge> : <span className="tabular-nums">{mine.length} סלונים</span>}
                  {waiting && <Badge tone="rose" className="ms-1">ממתין לעד/ה</Badge>}
                </td>
                <td>{returning ? <Badge tone="green">{h.history.length} שנים</Badge> : <span className="text-muted">חדש/ה</span>}</td>
                <td className="text-muted tabular-nums">{new Date(h.joinedAt).toLocaleDateString("he-IL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
