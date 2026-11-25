"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Copy, ExternalLink, Phone, UserRound } from "lucide-react";
import { Badge, Button, Card, EmptyState, SeatsMeter } from "@/components/ui";
import { TRAININGS, WITNESS_TYPE_LABELS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, displayPhone, formatDate, seatsTaken } from "@/lib/utils";

export default function HostDashboard() {
  const { salons, registrations, witnesses, session, updateSalon, deleteSalon, ready } = useStore();
  const [contacted, setContacted] = useState(false);
  if (!ready) return null;

  const salon = salons.find((s) => s.id === session.hostSalonId);
  if (!salon) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="עוד אין לך סלון" action={<Link href="/host/new" className="inline-flex h-11 items-center rounded-lg bg-brand px-5 font-medium">פתיחת סלון</Link>}>
          פתיחת סלון לוקחת כמה דקות. אפשר לשמור טיוטה ולחזור אליה.
        </EmptyState>
      </main>
    );
  }

  const guests = registrations.filter((r) => r.salonId === salon.id);
  const taken = seatsTaken(salon.id, registrations);
  const witness = witnesses.find((w) => w.id === salon.witnessId);
  const training = TRAININGS.find((t) => t.id === salon.trainingId);
  const link = typeof window !== "undefined" ? `${window.location.origin}/salons/${salon.id}` : "";

  const checklist = [
    { done: true, text: "פרסום הסלון" },
    { done: !salon.wantsWitness || !!witness, text: salon.wantsWitness ? "צוות עד/ה" : "עדות — באחריותי" },
    ...(salon.wantsWitness ? [{ done: !!witness && contacted, text: witness ? "יצירת קשר עם העד/ה" : "יצירת קשר עם העד/ה (אחרי הציוות)" }] : []),
    { done: !training, text: training ? `הדרכה ב-${new Date(training.date).toLocaleDateString("he-IL")}` : "הדרכה (לא נדרשת)" },
    { done: guests.length > 0, text: "האורח/ת הראשון/ה נרשם/ה" },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted">{formatDate(salon.date)} · {salon.time} · {salon.digital ? "דיגיטלי" : `${salon.address}, ${cityName(salon.cityId)}`}</p>
          <h1 className="mt-1 text-3xl font-semibold">הסלון שלי</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(link); toast("הקישור הועתק — שלחו לחברים"); }}><Copy className="size-4" />העתקת קישור</Button>
          <Link href={`/salons/${salon.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-4 hover:bg-cream"><ExternalLink className="size-4" />דף הסלון</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">אורחים ({guests.length})</h2>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-ink" checked={salon.isOpen} onChange={(e) => { updateSalon(salon.id, { isOpen: e.target.checked }); toast(e.target.checked ? "הסלון פתוח להרשמה" : "ההרשמה נסגרה"); }} />
              פתוח להרשמה
            </label>
          </div>
          <SeatsMeter taken={taken} capacity={salon.capacity} />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">מקומות:</span>
            {[-5, -1, +1, +5].map((n) => (
              <button key={n} className="rounded-md border border-line px-2 py-0.5 tabular-nums hover:bg-cream disabled:opacity-40" disabled={salon.capacity + n < Math.max(2, taken)}
                onClick={() => updateSalon(salon.id, { capacity: salon.capacity + n })}>{n > 0 ? `+${n}` : n}</button>
            ))}
          </div>
          {guests.length === 0 ? (
            <EmptyState title="עוד לא נרשמו אורחים">שתפו את הקישור לסלון — רוב ההרשמות מגיעות משיתוף ישיר.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-start text-muted">
                  <tr className="border-b border-line"><th className="py-2 text-start font-medium">שם</th><th className="text-start font-medium">מקומות</th><th className="text-start font-medium">טלפון</th><th className="text-start font-medium">מייל</th></tr>
                </thead>
                <tbody>
                  {guests.map((g) => (
                    <tr key={g.id} className="border-b border-line/60">
                      <td className="py-2.5 font-medium">{g.name}</td>
                      <td className="tabular-nums">{g.seats}</td>
                      <td dir="ltr" className="text-end"><a className="hover:underline" href={`tel:${g.phone}`}>{displayPhone(g.phone)}</a></td>
                      <td dir="ltr" className="text-end">{g.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">העד/ה</h2>
            {witness ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-brand/30"><UserRound className="size-5" /></span>
                  <div>
                    <p className="font-semibold">{witness.name}</p>
                    <p className="text-sm text-muted">{WITNESS_TYPE_LABELS[witness.type]}</p>
                  </div>
                </div>
                <p className="text-sm text-muted">{witness.bio}</p>
                <label className="flex items-center gap-2 rounded-lg bg-cream px-3 py-2 text-sm">
                  <input type="checkbox" className="size-4 accent-ink" checked={contacted} onChange={(e) => setContacted(e.target.checked)} />
                  יצרתי קשר עם העד/ה
                </label>
                <p className="inline-flex items-center gap-2 text-sm text-muted"><Phone className="size-4" />פרטי הקשר נשלחו אליך במייל ובהודעה</p>
              </div>
            ) : salon.wantsWitness ? (
              <div className="mt-3 space-y-2"><Badge tone="brand">בתהליך ציוות</Badge><p className="text-sm text-muted">הצוות שלנו מחפש עד/ה שפנוי/ה ב-{formatDate(salon.date)} בערב. נעדכן כאן ובמייל.</p></div>
            ) : (
              <p className="mt-3 text-sm text-muted">בחרת להביא עדות משלך.</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold">מה נשאר לעשות</h2>
            <ul className="mt-3 space-y-2">
              {checklist.map((c) => (
                <li key={c.text} className="flex items-center gap-2 text-sm">
                  {c.done ? <CheckCircle2 className="size-5 text-green" /> : <Circle className="size-5 text-line" />}
                  <span className={c.done ? "text-muted line-through" : ""}>{c.text}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Button variant="danger" className="w-full" onClick={() => { if (confirm(guests.length ? `ביטול הסלון יודיע ל-${guests.length} נרשמים. להמשיך?` : "לבטל את הסלון?")) { deleteSalon(salon.id); toast("הסלון בוטל"); } }}>ביטול הסלון</Button>
        </div>
      </div>
    </main>
  );
}
