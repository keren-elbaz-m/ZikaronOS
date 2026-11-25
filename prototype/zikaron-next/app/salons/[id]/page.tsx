"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Accessibility, ArrowRight, CalendarPlus, CheckCircle2, Copy, Languages, MapPin, MonitorPlay } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, SeatsMeter, Stepper } from "@/components/ui";
import { ACCESSIBILITY_LABELS, WITNESS_TYPE_LABELS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, displayPhone, formatDate, icsFor, isEmail, isPhone, normalizePhone, seatsTaken } from "@/lib/utils";

export default function SalonPage() {
  const { id } = useParams<{ id: string }>();
  const { salons, registrations, witnesses, register, ready } = useStore();
  const salon = salons.find((s) => s.id === id);
  const [seats, setSeats] = useState(1);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [touched, setTouched] = useState(false);
  const [doneId, setDoneId] = useState<string>();

  if (!ready) return null;
  if (!salon) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="הסלון לא נמצא" action={<Link className="underline" href="/salons">חזרה לכל הסלונים</Link>}>
          ייתכן שהמארח/ת סגר/ה את הסלון. יש עוד הרבה סלונים פתוחים.
        </EmptyState>
      </main>
    );
  }

  const taken = seatsTaken(salon.id, registrations);
  const left = Math.max(0, salon.capacity - taken);
  const maxSeats = Math.min(3, left);
  const witness = witnesses.find((w) => w.id === salon.witnessId);
  const errors = {
    name: form.name.trim().length < 2 ? "נא למלא שם מלא" : "",
    phone: !isPhone(form.phone) ? "מספר טלפון לא תקין — לדוגמה 052-612-3456" : "",
    email: !isEmail(form.email) ? "כתובת מייל לא תקינה" : "",
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid || left === 0) return;
    const rid = register({ salonId: salon.id, name: form.name.trim(), phone: normalizePhone(form.phone)!, email: form.email.trim(), seats: Math.min(seats, maxSeats) });
    setDoneId(rid);
    toast.success("נרשמת לסלון!");
  };

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast("הקישור הועתק");
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Link href="/salons" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowRight className="size-4" />לכל הסלונים</Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <article className="space-y-6">
          <header>
            <p className="text-muted">{formatDate(salon.date)} · {salon.time}</p>
            <h1 className="mt-1 text-3xl font-semibold md:text-4xl">הסלון של {salon.orgName ?? salon.hostName}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {salon.digital ? <Badge><MonitorPlay className="size-3.5" />דיגיטלי</Badge> : <Badge><MapPin className="size-3.5" />{cityName(salon.cityId)}</Badge>}
              <Badge><Languages className="size-3.5" />{salon.language}</Badge>
              {salon.accessibility.map((a) => <Badge key={a}><Accessibility className="size-3.5" />{ACCESSIBILITY_LABELS[a]}</Badge>)}
            </div>
          </header>

          {salon.noteForGuests && (
            <Card className="p-5">
              <h2 className="text-sm font-medium text-muted">מהמארח/ת</h2>
              <p className="mt-2 text-lg leading-relaxed">{salon.noteForGuests}</p>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="text-sm font-medium text-muted">העדות בסלון</h2>
            {witness ? (
              <div className="mt-2">
                <p className="text-lg font-semibold">{witness.name} · {WITNESS_TYPE_LABELS[witness.type]}</p>
                <p className="mt-1 text-muted">{witness.bio}</p>
              </div>
            ) : salon.wantsWitness ? (
              <p className="mt-2">הצוות שלנו מצוות עכשיו עד/ה לסלון הזה. הפרטים יופיעו כאן ובמייל לנרשמים.</p>
            ) : (
              <p className="mt-2">המארח/ת יספר/תספר את הסיפור בעצמו/ה או יקרין/תקרין עדות מתועדת.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-medium text-muted">איפה</h2>
            <p className="mt-2 text-lg">
              {salon.digital ? "סלון בזום — הקישור יישלח לנרשמים יום לפני." : `${cityName(salon.cityId)} · הכתובת המלאה תישלח לנרשמים`}
            </p>
          </Card>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            {doneId ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto size-12 text-green" />
                <h2 className="text-2xl font-semibold">נרשמת! נתראה בסלון</h2>
                <p className="text-muted">שלחנו אישור ל-{form.email}. {salon.digital ? "קישור הזום יגיע יום לפני." : `הכתובת המלאה: ${salon.address}, ${cityName(salon.cityId)}${salon.floor ? `, קומה ${salon.floor}` : ""}.`}</p>
                <div className="grid gap-2">
                  <a href={icsFor(salon)} download={`zikaron-${salon.id}.ics`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand font-medium hover:bg-brand-strong"><CalendarPlus className="size-4" />הוספה ליומן</a>
                  <Button variant="secondary" onClick={share}><Copy className="size-4" />שיתוף הסלון עם חברים</Button>
                  <Link href="/guest" className="text-sm underline underline-offset-4">לכל ההרשמות שלי</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold">הרשמה לסלון</h2>
                  <p className="text-sm text-muted">צעד אחד, בלי סיסמה. אפשר לבטל בכל עת.</p>
                </div>
                <SeatsMeter taken={taken} capacity={salon.capacity} />
                {left === 0 ? (
                  <EmptyState title="הסלון מלא" action={<Link className="underline" href={`/salons?date=${salon.date}&city=${salon.cityId}`}>סלונים אחרים באותו יום ובאותה עיר</Link>} />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">כמה תגיעו?</span>
                      <Stepper label="מספר מגיעים" value={Math.min(seats, maxSeats)} min={1} max={maxSeats} onChange={setSeats} />
                    </div>
                    {maxSeats < 3 && <p className="-mt-3 text-sm text-muted">נותרו {left} מקומות בלבד בסלון הזה.</p>}
                    <Field label="שם מלא" required error={touched ? errors.name : ""}>
                      <Input autoComplete="name" value={form.name} aria-invalid={touched && !!errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </Field>
                    <Field label="טלפון" required error={touched ? errors.phone : ""} hint={form.phone && isPhone(form.phone) ? displayPhone(normalizePhone(form.phone)!) : "לתזכורת לפני הסלון"}>
                      <Input dir="ltr" inputMode="tel" autoComplete="tel" placeholder="052-612-3456" value={form.phone} aria-invalid={touched && !!errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </Field>
                    <Field label="מייל" required error={touched ? errors.email : ""}>
                      <Input dir="ltr" type="email" autoComplete="email" value={form.email} aria-invalid={touched && !!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </Field>
                    <Button type="submit" size="lg" className="w-full">הרשמה ל-{Math.min(seats, maxSeats)} {Math.min(seats, maxSeats) === 1 ? "מקום" : "מקומות"}</Button>
                    <p className="text-center text-xs text-muted">פרטי המארח/ת והכתובת המלאה יישלחו אחרי ההרשמה.</p>
                  </>
                )}
              </form>
            )}
          </Card>
        </aside>
      </div>
    </main>
  );
}
