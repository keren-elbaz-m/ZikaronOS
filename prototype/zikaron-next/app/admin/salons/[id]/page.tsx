"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ExternalLink, Mail, Phone } from "lucide-react";
import { Notes } from "@/components/notes";
import { Badge, Button, Card, EmptyState, SeatsMeter } from "@/components/ui";
import { ACCESSIBILITY_LABELS, TRAININGS, WITNESS_TYPE_LABELS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, displayPhone, downloadCsv, formatDate, seatsTaken } from "@/lib/utils";

export default function AdminSalonPage() {
  const { id } = useParams<{ id: string }>();
  const { salons, registrations, witnesses, updateSalon, assignWitness, cancelRegistration, ready } = useStore();
  if (!ready) return null;
  const s = salons.find((x) => x.id === id);
  if (!s) return <main className="py-8"><EmptyState title="הסלון לא נמצא" action={<Link className="underline" href="/admin/salons">לכל הסלונים</Link>} /></main>;

  const guests = registrations.filter((r) => r.salonId === s.id);
  const taken = seatsTaken(s.id, registrations);
  const witness = witnesses.find((w) => w.id === s.witnessId);
  const training = TRAININGS.find((t) => t.id === s.trainingId);

  const flag = (key: "hostContacted" | "attendedPreparation" | "isOpen", label: string) => (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
      <span>{label}</span>
      <input type="checkbox" role="switch" className="size-5 accent-ink" checked={!!s[key]} onChange={(e) => { updateSalon(s.id, { [key]: e.target.checked }); toast(`${label}: ${e.target.checked ? "כן" : "לא"}`); }} />
    </label>
  );

  return (
    <main className="space-y-6 py-8">
      <Link href="/admin/salons" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowRight className="size-4" />לכל הסלונים</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted">{formatDate(s.date)} · {s.time} · {s.digital ? "דיגיטלי" : `${s.address}, ${cityName(s.cityId)}${s.floor ? `, קומה ${s.floor}` : ""}`}</p>
          <h1 className="mt-1 text-3xl font-semibold">הסלון של {s.orgName ?? s.hostName}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{s.language}</Badge>
            {s.accessibility.map((a) => <Badge key={a}>{ACCESSIBILITY_LABELS[a]}</Badge>)}
            {!s.hostedBefore && <Badge tone="brand">מארח/ת בפעם הראשונה</Badge>}
            {!s.isOpen && <Badge tone="rose">סגור להרשמה</Badge>}
          </div>
        </div>
        <Link href={`/salons/${s.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-4 hover:bg-cream"><ExternalLink className="size-4" />הדף הציבורי</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">אורחים ({guests.length})</h2>
              <Button variant="secondary" size="sm" disabled={!guests.length} onClick={() => downloadCsv(`guests-${s.id}.csv`, ["שם", "טלפון", "מייל", "מקומות"], guests.map((g) => [g.name, displayPhone(g.phone), g.email, g.seats]))}>ייצוא</Button>
            </div>
            <SeatsMeter taken={taken} capacity={s.capacity} />
            {guests.length === 0 ? (
              <p className="text-sm text-muted">עוד לא נרשמו אורחים.</p>
            ) : (
              <ul className="divide-y divide-line">
                {guests.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 text-sm">
                    <span className="min-w-32 font-medium">{g.name}</span>
                    <span className="tabular-nums">{g.seats} מקומות</span>
                    <a dir="ltr" href={`tel:${g.phone}`} className="text-muted hover:underline">{displayPhone(g.phone)}</a>
                    <span dir="ltr" className="text-muted">{g.email}</span>
                    <button className="ms-auto text-rose hover:underline" onClick={() => { if (confirm(`להסיר את ${g.name} מהסלון? האורח/ת יקבל/תקבל הודעה.`)) { cancelRegistration(g.id); toast("ההרשמה הוסרה"); } }}>הסרה</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">עד/ה</h2>
            {witness ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/admin/witnesses/${witness.id}`} className="font-medium hover:underline">{witness.name}</Link>
                  <p className="text-sm text-muted">{WITNESS_TYPE_LABELS[witness.type]} · {cityName(witness.cityId)} · <span dir="ltr">{displayPhone(witness.phone)}</span></p>
                </div>
                <Button variant="danger" size="sm" onClick={() => { if (confirm("לבטל את השיבוץ?")) { assignWitness(s.id, undefined); toast("השיבוץ בוטל"); } }}>ביטול שיבוץ</Button>
              </div>
            ) : s.wantsWitness ? (
              <div className="mt-3 flex items-center justify-between">
                <Badge tone="rose">ממתין לעד/ה</Badge>
                <Link href={`/admin/teaming?salon=${s.id}`} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium hover:bg-brand-strong">מציאת עד/ה</Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">המארח/ת מביא/ה עדות משלו/ה.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">מעקב צוות</h2>
            {flag("hostContacted", "נוצר קשר עם המארח/ת")}
            {flag("attendedPreparation", "הגיע/ה לערב הכנה")}
            {flag("isOpen", "פתוח להרשמה")}
            <p className="text-sm text-muted">הדרכה: {training ? `${new Date(training.date).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })} · ${training.place}` : "לא נבחרה"}</p>
          </Card>
          <Card className="space-y-2 p-6 text-sm">
            <h2 className="text-lg font-semibold">פרטי קשר</h2>
            <p className="font-medium">{s.hostName}{s.orgName && ` · ${s.orgName}`}</p>
            <a dir="ltr" href={`tel:${s.phone}`} className="flex items-center justify-end gap-2 hover:underline">{displayPhone(s.phone)}<Phone className="size-4" /></a>
            <a dir="ltr" href={`mailto:${s.email}`} className="flex items-center justify-end gap-2 hover:underline">{s.email}<Mail className="size-4" /></a>
          </Card>
          <Notes subject={{ kind: "salon", id: s.id }} />
        </div>
      </div>
    </main>
  );
}
