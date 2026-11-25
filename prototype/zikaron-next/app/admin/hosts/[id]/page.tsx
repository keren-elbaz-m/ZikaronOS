"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, MessageCircle, Phone, Plus } from "lucide-react";
import { Dl, EditableSection } from "@/components/editable-section";
import { Notes } from "@/components/notes";
import { Badge, Card, EmptyState, Field, Input, Select, SeatsMeter } from "@/components/ui";
import { COMMUNITIES, ORG_TYPES, WITNESS_TYPE_LABELS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, displayPhone, formatDate, isEmail, isPhone, normalizePhone, seatsTaken } from "@/lib/utils";

export default function HostProfile() {
  const { id } = useParams<{ id: string }>();
  const { hosts, salons, registrations, witnesses, updateHost, ready } = useStore();
  if (!ready) return null;
  const h = hosts.find((x) => x.id === id);
  if (!h) return <main className="py-8"><EmptyState title="המארח/ת לא נמצא/ה" action={<Link className="underline" href="/admin/hosts">לכל המארחים</Link>} /></main>;

  const mine = salons.filter((s) => s.hostId === h.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const history = [...h.history].sort((a, b) => b.year - a.year);
  const value = { name: h.name, phone: displayPhone(h.phone), email: h.email, isOrg: h.isOrg, orgName: h.orgName ?? "", orgType: h.orgType ?? "", community: h.community ?? "" };
  const wa = `https://wa.me/${h.phone.replace(/\D/g, "")}`;

  return (
    <main className="space-y-6 py-8">
      <Link href="/admin/hosts" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowRight className="size-4" />לכל המארחים</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">{h.orgName ?? h.name}</h1>
            {h.history.length > 0 ? <Badge tone="green">מארח/ת חוזר/ת · {h.history.length} שנים</Badge> : <Badge tone="brand">מארח/ת חדש/ה</Badge>}
          </div>
          <p className="mt-1 text-muted">{h.isOrg ? `${h.name} · ${h.orgType ?? "ארגון"}` : "מארח/ת פרטי/ת"} · {h.community ?? "ללא קהילה"} · הצטרפ/ה ב-{new Date(h.joinedAt).toLocaleDateString("he-IL")} · מס׳ {h.id}</p>
        </div>
        <div className="flex gap-2">
          <a href={`tel:${h.phone}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-4 hover:bg-cream"><Phone className="size-4" /><span dir="ltr">{displayPhone(h.phone)}</span></a>
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-4 hover:bg-cream"><MessageCircle className="size-4" />וואטסאפ</a>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">הסלונים השנה ({mine.length})</h2>
              {h.isOrg && <span className="inline-flex items-center gap-1 text-sm text-muted"><Plus className="size-4" />ארגונים יכולים לפתוח כמה סלונים</span>}
            </div>
            {mine.length === 0 && <EmptyState title="עוד לא נפתח סלון השנה">כדאי ליצור קשר — {h.history.length ? "מארח/ת חוזר/ת שעוד לא חזר/ה." : "נרשמ/ה ולא סיימ/ה."}</EmptyState>}
            {mine.map((s) => {
              const taken = seatsTaken(s.id, registrations);
              const witness = witnesses.find((w) => w.id === s.witnessId);
              return (
                <Card key={s.id} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/admin/salons/${s.id}`} className="text-lg font-semibold hover:underline">{formatDate(s.date)} · {s.time}</Link>
                      <p className="text-sm text-muted">{s.digital ? "דיגיטלי" : `${s.address}, ${cityName(s.cityId)}`} · {s.language}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {!s.isOpen && <Badge tone="rose">סגור להרשמה</Badge>}
                      {s.hostContacted ? <Badge tone="green">נוצר קשר</Badge> : <Badge tone="brand">טרם נוצר קשר</Badge>}
                      {s.attendedPreparation && <Badge tone="green">הגיע/ה לערב הכנה</Badge>}
                      {s.specialPopulation && <Badge>אוכלוסייה מיוחדת</Badge>}
                    </div>
                  </div>
                  <SeatsMeter taken={taken} capacity={s.capacity} />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      {witness ? <>עד/ה: <Link href={`/admin/witnesses/${witness.id}`} className="font-medium hover:underline">{witness.name}</Link> <span className="text-muted">· {WITNESS_TYPE_LABELS[witness.type]}</span></> : s.wantsWitness ? <Badge tone="rose">ממתין לעד/ה</Badge> : <span className="text-muted">עדות עצמאית</span>}
                    </span>
                    <span className="text-muted">{s.volunteer ? `מתנדב/ת: ${s.volunteer}` : "אין מתנדב/ת"}</span>
                  </div>
                  {s.specialAttention && <p className="rounded-lg bg-brand/15 px-3 py-2 text-sm"><b>לתשומת לב: </b>{s.specialAttention}</p>}
                  <div className="flex justify-end"><Link href={`/admin/salons/${s.id}`} className="text-sm font-medium hover:underline">לניהול הסלון ←</Link></div>
                </Card>
              );
            })}
          </section>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">שנים קודמות</h2>
            {history.length === 0 ? <p className="mt-2 text-sm text-muted">זו השנה הראשונה.</p> : (
              <table className="mt-3 w-full text-sm">
                <thead className="text-muted"><tr className="[&>th]:py-2 [&>th]:text-start [&>th]:font-medium"><th>שנה</th><th>תאריך</th><th>אורחים</th><th>עד/ה</th></tr></thead>
                <tbody>{history.map((x) => <tr key={x.year + x.date} className="border-t border-line/60 [&>td]:py-2"><td className="font-medium tabular-nums">{x.year}</td><td className="tabular-nums">{new Date(x.date).toLocaleDateString("he-IL")}</td><td className="tabular-nums">{x.guests}</td><td>{x.witnessName ?? "—"}</td></tr>)}</tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <EditableSection
            title="פרטי המארח/ת"
            value={value}
            validate={(d) => ({
              ...(d.name.trim().length < 2 ? { name: "נא למלא שם מלא" } : {}),
              ...(!isPhone(d.phone) ? { phone: "מספר לא תקין" } : {}),
              ...(!isEmail(d.email) ? { email: "כתובת מייל לא תקינה" } : {}),
              ...(d.isOrg && d.orgName.trim().length < 2 ? { orgName: "נא למלא שם ארגון" } : {}),
              ...(d.isOrg && !d.orgType ? { orgType: "בחרו סוג ארגון" } : {}),
            })}
            onSave={(d) => updateHost(h.id, { ...d, phone: normalizePhone(d.phone)!, orgName: d.isOrg ? d.orgName.trim() : undefined, orgType: d.isOrg ? d.orgType : undefined, community: d.community || undefined })}
            view={(v) => <Dl items={[["שם", v.name], ["טלפון", <span key="p" dir="ltr">{v.phone}</span>], ["מייל", <span key="e" dir="ltr">{v.email}</span>], ["סוג", v.isOrg ? "ארגון" : "פרטי/ת"], ...(v.isOrg ? ([["ארגון", v.orgName], ["סוג ארגון", v.orgType]] as [string, React.ReactNode][]) : []), ["קהילה", v.community]]} />}
            edit={(d, set, e) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="שם" required error={e.name}><Input value={d.name} onChange={(x) => set("name", x.target.value)} /></Field>
                <Field label="טלפון" required error={e.phone}><Input dir="ltr" inputMode="tel" value={d.phone} onChange={(x) => set("phone", x.target.value)} /></Field>
                <Field label="מייל" required error={e.email}><Input dir="ltr" type="email" value={d.email} onChange={(x) => set("email", x.target.value)} /></Field>
                <Field label="סוג"><Select value={d.isOrg ? "org" : "private"} onChange={(x) => set("isOrg", x.target.value === "org")}><option value="private">פרטי/ת</option><option value="org">ארגון</option></Select></Field>
                {d.isOrg && <Field label="שם הארגון" required error={e.orgName}><Input value={d.orgName} onChange={(x) => set("orgName", x.target.value)} /></Field>}
                {d.isOrg && <Field label="סוג ארגון" required error={e.orgType}><Select value={d.orgType} onChange={(x) => set("orgType", x.target.value)}><option value="">בחירה…</option>{ORG_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>}
                <Field label="קהילה"><Select value={d.community} onChange={(x) => set("community", x.target.value)}><option value="">—</option>{COMMUNITIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              </div>
            )}
          />
          <Notes subject={{ kind: "host", id: h.id }} />
        </div>
      </div>
    </main>
  );
}
