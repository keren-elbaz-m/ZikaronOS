"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { SalonCard } from "@/components/salon-card";
import { Button, Card, Choice, Field, Input, Select, Textarea } from "@/components/ui";
import { ACCESSIBILITY_LABELS, CITIES, LANGUAGES, SALON_DAYS, TRAININGS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, isEmail, isPhone, normalizePhone, shortDate } from "@/lib/utils";
import type { Accessibility, Salon } from "@/lib/types";

const DRAFT_KEY = "zikaron-host-draft";
const TIMES = Array.from({ length: 30 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

interface Draft {
  kind: "private" | "org";
  hostName: string;
  orgName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  digital: boolean;
  cityId: string;
  address: string;
  floor: string;
  apartment: string;
  accessibility: Accessibility[];
  isOpen: boolean;
  capacity: number;
  noteForGuests: string;
  wantsWitness: "yes" | "no" | "";
  hostedBefore: "yes" | "no" | "";
  language: string;
  trainingId: string;
}

const EMPTY: Draft = {
  kind: "private", hostName: "", orgName: "", phone: "", email: "",
  date: SALON_DAYS.find((d) => d.isDefault)?.date ?? SALON_DAYS[0].date, time: "19:30", digital: false,
  cityId: "", address: "", floor: "", apartment: "", accessibility: [],
  isOpen: true, capacity: 15, noteForGuests: "",
  wantsWitness: "", hostedBefore: "", language: "עברית", trainingId: "",
};

const STEPS = ["מי מארח/ת", "מתי ואיפה", "האורחים", "עדות והכנה"] as const;

function validate(d: Draft, step: number): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (d.hostName.trim().length < 2) e.hostName = "נא למלא שם מלא";
    if (d.kind === "org" && d.orgName.trim().length < 2) e.orgName = "נא למלא את שם הארגון";
    if (!isPhone(d.phone)) e.phone = "המספר לא תקין. בדקו את הספרות — לדוגמה 052-612-3456";
    if (!isEmail(d.email)) e.email = "כתובת מייל לא תקינה";
  }
  if (step === 1 && !d.digital) {
    if (!d.cityId) e.cityId = "בחרו עיר";
    if (d.address.trim().length < 3) e.address = "נא למלא רחוב ומספר";
    // The address must belong to the chosen city (legacy accepted "Dizengoff 100, Dimona" for Tel Aviv).
    const other = CITIES.find((c) => c.id !== d.cityId && d.address.includes(c.name));
    if (d.cityId && other) e.address = `הכתובת נראית ב${other.name}, אבל העיר שנבחרה היא ${CITIES.find((c) => c.id === d.cityId)?.name}`;
  }
  if (step === 2 && (d.capacity < 2 || d.capacity > 200)) e.capacity = "בין 2 ל-200 אורחים";
  if (step === 3) {
    if (!d.wantsWitness) e.wantsWitness = "בחרו אפשרות";
    if (!d.hostedBefore) e.hostedBefore = "בחרו אפשרות";
    if (d.hostedBefore === "no" && !d.trainingId) e.trainingId = "למארחים בפעם הראשונה — בחרו מפגש הדרכה";
  }
  return e;
}

export default function NewSalonPage() {
  const router = useRouter();
  const { createSalon } = useStore();
  const [d, setD] = useState<Draft>(EMPTY);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      setD({ ...EMPTY, ...JSON.parse(saved) });
      toast("המשכנו מהטיוטה ששמרת");
    }
  }, []);
  useEffect(() => {
    if (d !== EMPTY) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  }, [d]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const errors = validate(d, step);
  const err = (k: string) => (showErrors ? errors[k] : undefined);

  const preview: Salon = useMemo(() => {
    const city = CITIES.find((c) => c.id === d.cityId) ?? CITIES[0];
    return {
      id: "preview", hostName: d.hostName || "השם שלך", orgName: d.kind === "org" ? d.orgName || undefined : undefined, phone: "", email: "",
      date: d.date, time: d.time, digital: d.digital, cityId: d.cityId || city.id, address: d.address,
      lat: city.lat, lng: city.lng, accessibility: d.accessibility, language: d.language, capacity: d.capacity,
      isOpen: d.isOpen, noteForGuests: d.noteForGuests, wantsWitness: d.wantsWitness === "yes", hostedBefore: d.hostedBefore === "yes", createdAt: "",
    };
  }, [d]);

  const next = () => {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const city = CITIES.find((c) => c.id === d.cityId) ?? CITIES[0];
    const jitter = () => (Math.random() - 0.5) * 0.01;
    createSalon({
      hostName: d.hostName.trim(), orgName: d.kind === "org" ? d.orgName.trim() : undefined,
      phone: normalizePhone(d.phone)!, email: d.email.trim(), date: d.date, time: d.time, digital: d.digital,
      cityId: d.digital ? city.id : d.cityId, address: d.digital ? "" : d.address.trim(), floor: d.floor || undefined, apartment: d.apartment || undefined,
      lat: city.lat + jitter(), lng: city.lng + jitter(), accessibility: d.accessibility, language: d.language,
      capacity: d.capacity, isOpen: d.isOpen, noteForGuests: d.noteForGuests.trim(),
      wantsWitness: d.wantsWitness === "yes", hostedBefore: d.hostedBefore === "yes", trainingId: d.trainingId || undefined,
    });
    localStorage.removeItem(DRAFT_KEY);
    toast.success("הסלון פורסם! 🕯️");
    router.push("/host?created=1");
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-semibold">פתיחת סלון</h1>
      <p className="mt-1 text-muted">כמה דקות, ארבעה שלבים. הטיוטה נשמרת אוטומטית.</p>

      <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="שלבים">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              className={cn("w-full border-t-4 pt-2 text-start text-sm", i < step ? "border-ink" : i === step ? "border-brand font-semibold" : "border-line text-muted")}
              aria-current={i === step ? "step" : undefined}
            >
              <span className="me-1 tabular-nums">{i < step ? <Check className="inline size-4" /> : i + 1}</span>
              <span className="hidden sm:inline">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="space-y-6 p-6">
          <h2 className="text-xl font-semibold">{STEPS[step]}</h2>

          {step === 0 && (
            <>
              <Choice name="סוג מארח" value={d.kind} onChange={(v) => set("kind", v)} options={[{ value: "private", label: "מארח/ת פרטי/ת", hint: "בבית שלי" }, { value: "org", label: "ארגון או קהילה", hint: "מתנ״ס, בית ספר, חברה" }]} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="שם מלא" required error={err("hostName")}><Input autoComplete="name" value={d.hostName} aria-invalid={!!err("hostName")} onChange={(e) => set("hostName", e.target.value)} /></Field>
                {d.kind === "org" && <Field label="שם הארגון" required error={err("orgName")}><Input value={d.orgName} aria-invalid={!!err("orgName")} onChange={(e) => set("orgName", e.target.value)} /></Field>}
                <Field label="טלפון" required error={err("phone")} hint={d.phone && isPhone(d.phone) ? "✓ מספר תקין" : "נשתמש בו רק לתיאום העדות"}>
                  <Input dir="ltr" inputMode="tel" autoComplete="tel" placeholder="052-612-3456" value={d.phone} aria-invalid={!!err("phone")} onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <Field label="מייל" required error={err("email")}><Input dir="ltr" type="email" autoComplete="email" value={d.email} aria-invalid={!!err("email")} onChange={(e) => set("email", e.target.value)} /></Field>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="באיזה יום?" required>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SALON_DAYS.map((day) => (
                    <button key={day.date} type="button" onClick={() => set("date", day.date)} aria-pressed={d.date === day.date}
                      className={cn("rounded-lg border px-3 py-2 text-start", d.date === day.date ? "border-ink bg-brand/25" : "border-line hover:bg-cream")}>
                      <span className="block font-semibold tabular-nums">{shortDate(day.date)}</span>
                      <span className="block text-sm text-muted">{day.label}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="שעה" required><Select value={d.time} onChange={(e) => set("time", e.target.value)}>{TIMES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
                <Field label="סוג הסלון">
                  <Select value={d.digital ? "digital" : "physical"} onChange={(e) => set("digital", e.target.value === "digital")}>
                    <option value="physical">בבית / במקום פיזי</option>
                    <option value="digital">דיגיטלי (זום)</option>
                  </Select>
                </Field>
              </div>
              {!d.digital && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="עיר" required error={err("cityId")}>
                    <Select value={d.cityId} aria-invalid={!!err("cityId")} onChange={(e) => set("cityId", e.target.value)}>
                      <option value="">בחירה…</option>
                      {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="רחוב ומספר" required error={err("address")} hint="הכתובת המלאה נשלחת רק לנרשמים">
                    <Input value={d.address} aria-invalid={!!err("address")} onChange={(e) => set("address", e.target.value)} />
                  </Field>
                  <Field label="קומה"><Input inputMode="numeric" value={d.floor} onChange={(e) => set("floor", e.target.value.replace(/\D/g, "").slice(0, 3))} /></Field>
                  <Field label="דירה"><Input inputMode="numeric" value={d.apartment} onChange={(e) => set("apartment", e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
                  <fieldset className="sm:col-span-2">
                    <legend className="mb-2 text-sm font-medium">נגישות</legend>
                    <div className="flex flex-wrap gap-4">
                      {(Object.keys(ACCESSIBILITY_LABELS) as Accessibility[]).map((a) => (
                        <label key={a} className="inline-flex items-center gap-2">
                          <input type="checkbox" className="size-4 accent-ink" checked={d.accessibility.includes(a)}
                            onChange={(e) => set("accessibility", e.target.checked ? [...d.accessibility, a] : d.accessibility.filter((x) => x !== a))} />
                          {ACCESSIBILITY_LABELS[a]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Choice name="מי יכול להגיע" value={d.isOpen ? "open" : "private"} onChange={(v) => set("isOpen", v === "open")}
                options={[{ value: "open", label: "פתוח להרשמה באתר", hint: "יופיע במפה לכולם" }, { value: "private", label: "פרטי", hint: "רק אורחים שאזמין בעצמי" }]} />
              <Field label={`כמה אורחים? ${d.capacity}`} error={err("capacity")} hint="אפשר לשנות בהמשך">
                <input type="range" min={2} max={80} value={d.capacity} onChange={(e) => set("capacity", Number(e.target.value))} className="w-full accent-ink" />
              </Field>
              <Field label="כמה מילים לאורחים" hint={`${d.noteForGuests.length}/1000 · מה כדאי לדעת לפני שמגיעים?`}>
                <Textarea maxLength={1000} value={d.noteForGuests} onChange={(e) => set("noteForGuests", e.target.value)} placeholder="לדוגמה: נדליק נר, נשמע עדות ונשוחח. אפשר להביא משהו קטן לכיבוד." />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="תרצו שנצוות לכם עד/ה?" required error={err("wantsWitness")}>
                <Choice name="עד" value={d.wantsWitness || undefined} onChange={(v) => set("wantsWitness", v)} options={[{ value: "yes", label: "כן, בבקשה", hint: "הצוות ייצור קשר" }, { value: "no", label: "לא צריך", hint: "יש לי עדות משלי" }]} />
              </Field>
              <Field label="אירחת בעבר?" required error={err("hostedBefore")}>
                <Choice name="אירוח בעבר" value={d.hostedBefore || undefined} onChange={(v) => set("hostedBefore", v)} options={[{ value: "yes", label: "כן" }, { value: "no", label: "זו הפעם הראשונה" }]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="שפת הסלון"><Select value={d.language} onChange={(e) => set("language", e.target.value)}>{LANGUAGES.map((l) => <option key={l}>{l}</option>)}</Select></Field>
                <Field label="מפגש הדרכה למארחים" required={d.hostedBefore === "no"} error={err("trainingId")} hint={d.hostedBefore === "yes" ? "רשות למארחים ותיקים" : undefined}>
                  <Select value={d.trainingId} aria-invalid={!!err("trainingId")} onChange={(e) => set("trainingId", e.target.value)}>
                    <option value="">{d.hostedBefore === "yes" ? "בלי הדרכה" : "בחירה…"}</option>
                    {TRAININGS.map((t) => <option key={t.id} value={t.id}>{new Date(t.date).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })} · {t.place}</option>)}
                  </Select>
                </Field>
              </div>
            </>
          )}

          {showErrors && Object.keys(errors).length > 0 && (
            <p role="alert" className="rounded-lg bg-rose/10 px-4 py-3 text-sm text-rose">{Object.keys(errors).length === 1 ? "יש שדה אחד לתיקון בשלב הזה." : `יש ${Object.keys(errors).length} שדות לתיקון בשלב הזה.`}</p>
          )}

          <div className="flex justify-between border-t border-line pt-5">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowRight className="size-4" />חזרה</Button>
            <Button onClick={next} size="lg">{step === STEPS.length - 1 ? "פרסום הסלון" : "המשך"}{step < STEPS.length - 1 && <ArrowLeft className="size-4" />}</Button>
          </div>
        </Card>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-medium text-muted">כך האורחים יראו את הסלון</p>
          <div className="pointer-events-none"><SalonCard salon={preview} left={d.capacity} /></div>
          {preview.noteForGuests && <Card className="p-4 text-sm"><span className="text-muted">מהמארח/ת: </span>{preview.noteForGuests}</Card>}
        </aside>
      </div>
    </main>
  );
}
