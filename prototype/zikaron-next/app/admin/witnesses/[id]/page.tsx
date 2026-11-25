"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Check, ExternalLink, Phone, X } from "lucide-react";
import { CheckGroup, Dl, EditableSection } from "@/components/editable-section";
import { Notes } from "@/components/notes";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import {
  ACCESSIBILITY_NEED_LABELS, ARCHIVED_REASON_LABELS, CITIES, COMMUNITIES, LANGUAGES, PROGRAM_LABELS, SALON_DAYS,
  SPECIAL_POPULATION_LABELS, WITNESS_STATUS_LABELS, WITNESS_STATUS_TONE, WITNESS_TYPE_LABELS,
} from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, cn, displayPhone, formatDate, isEmail, isPhone, normalizePhone, salonsForWitness, shortDate, SLOT_LABELS, timeAgo, witnessLoad } from "@/lib/utils";
import type { ArchivedReason, Slot, Witness, WitnessStatus, WitnessType } from "@/lib/types";

const SLOTS: Slot[] = ["morning", "noon", "evening"];
const TABS = ["פרטים", "זמינות ושיבוץ", "היסטוריה"] as const;

const heDate = (d?: string) => (d ? new Date(`${d.slice(0, 10)}T12:00`).toLocaleDateString("he-IL") : "");
const age = (d?: string) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / (365.25 * 86400000)) : undefined);

export default function WitnessProfile() {
  const { id } = useParams<{ id: string }>();
  const { witnesses, salons, updateWitness, assignWitness, ready } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>("פרטים");
  const w = witnesses.find((x) => x.id === id);
  const load = useMemo(() => witnessLoad(salons), [salons]);
  const assigned = salons.filter((s) => s.witnessId === id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const suggestions = useMemo(() => (w ? salonsForWitness(w, salons, load).filter((m) => !m.match.blocked).slice(0, 4) : []), [w, salons, load]);

  if (!ready) return null;
  if (!w) return <main className="py-8"><EmptyState title="העד/ה לא נמצא/ה" action={<Link className="underline" href="/admin/witnesses">לכל העדים</Link>} /></main>;

  const save = (patch: Partial<Witness>) => updateWitness(w.id, patch);

  return (
    <main className="space-y-6 py-8">
      <Link href="/admin/witnesses" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowRight className="size-4" />לכל העדים</Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold">{w.name}</h1>
            <Badge tone={WITNESS_STATUS_TONE[w.status]}>{WITNESS_STATUS_LABELS[w.status]}{w.status === "archived" && w.archivedReason && ` · ${ARCHIVED_REASON_LABELS[w.archivedReason]}`}</Badge>
          </div>
          <p className="mt-1 text-muted">
            {WITNESS_TYPE_LABELS[w.type]} · {cityName(w.cityId)}{w.birthDate && ` · בן/בת ${age(w.birthDate)}`} · {w.languages.join(", ")}
            {w.createdAt && ` · במאגר מ-${heDate(w.createdAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`tel:${w.phone}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-4 hover:bg-cream"><Phone className="size-4" /><span dir="ltr">{displayPhone(w.phone)}</span></a>
          {w.contact?.phone && <a href={`tel:${w.contact.phone}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-paper px-4 text-sm hover:bg-cream">{w.contact.relation || "איש קשר"}: {w.contact.name}</a>}
        </div>
      </header>

      {w.specialAttention && (
        <p className="flex items-start gap-2 rounded-xl border border-brand bg-brand/15 px-4 py-3"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><span><b>לתשומת לב: </b>{w.specialAttention}</span></p>
      )}

      <nav className="flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", tab === t ? "border-ink" : "border-transparent text-muted hover:text-ink")}>
            {t}
            {t === "זמינות ושיבוץ" && assigned.length > 0 && <span className="ms-1.5 rounded bg-cream px-1.5 text-xs">{assigned.length}</span>}
          </button>
        ))}
      </nav>

      {tab === "פרטים" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <PersonalSection w={w} save={save} />
            <ContactSection w={w} save={save} />
            <AccessibilitySection w={w} save={save} />
          </div>
          <div className="space-y-6">
            <BackgroundSection w={w} save={save} />
            <Notes subject={{ kind: "witness", id: w.id }} />
          </div>
        </div>
      )}

      {tab === "זמינות ושיבוץ" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <AvailabilityGrid w={w} assignedDates={assigned.map((s) => s.date)} save={save} />
            <Card className="p-6">
              <h2 className="text-lg font-semibold">שיבוצים השנה ({assigned.length}/{w.maxSalons})</h2>
              {assigned.length === 0 ? <p className="mt-2 text-sm text-muted">עוד לא שובץ/ה השנה.</p> : (
                <ul className="mt-3 divide-y divide-line">
                  {assigned.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <Link href={`/admin/salons/${s.id}`} className="font-medium hover:underline">הסלון של {s.orgName ?? s.hostName}</Link>
                        <p className="text-sm text-muted">{formatDate(s.date)} · {s.time} · {s.digital ? "דיגיטלי" : cityName(s.cityId)}{s.volunteer && ` · שובץ ע״י ${s.volunteer}`}</p>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => { if (confirm("לבטל את השיבוץ? המארח/ת יקבל/תקבל עדכון.")) { assignWitness(s.id, undefined); toast("השיבוץ בוטל"); } }}>ביטול שיבוץ</Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div className="space-y-6">
            <StatusSection w={w} assignedCount={assigned.length} save={save} />
            <Card className="p-6">
              <h2 className="text-lg font-semibold">סלונים שמתאימים</h2>
              {w.status !== "available" ? (
                <p className="mt-2 text-sm text-muted">כדי לקבל הצעות, עדכנו סטטוס ל&quot;זמין/ה השנה&quot; וסמנו זמינות.</p>
              ) : suggestions.length === 0 ? (
                <p className="mt-2 text-sm text-muted">אין כרגע סלון ממתין שמתאים לזמינות.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {suggestions.map(({ salon, match }) => (
                    <li key={salon.id} className="rounded-lg border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">הסלון של {salon.orgName ?? salon.hostName}</p>
                          <p className="text-sm text-muted">{formatDate(salon.date)} · {salon.time} · {salon.digital ? "דיגיטלי" : cityName(salon.cityId)}</p>
                        </div>
                        <span className="text-2xl font-semibold tabular-nums">{Math.max(0, match.score)}</span>
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {match.reasons.map((r) => <li key={r.text} className="inline-flex items-center gap-1">{r.ok ? <Check className="size-3.5 text-green" /> : <X className="size-3.5 text-rose" />}{r.text}</li>)}
                      </ul>
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" onClick={() => { assignWitness(salon.id, w.id); toast.success(`שובץ/ה לסלון של ${salon.hostName}`, { action: { label: "ביטול", onClick: () => assignWitness(salon.id, undefined) } }); }}>שיבוץ</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "היסטוריה" && <HistorySection w={w} save={save} />}
    </main>
  );
}

type SaveFn = (patch: Partial<Witness>) => void;

function PersonalSection({ w, save }: { w: Witness; save: SaveFn }) {
  const value = { name: w.name, type: w.type, phone: displayPhone(w.phone), email: w.email ?? "", cityId: w.cityId, address: w.address ?? "", apartment: w.apartment ?? "", specialAttention: w.specialAttention ?? "" };
  return (
    <EditableSection
      title="פרטים אישיים"
      value={value}
      validate={(d) => ({
        ...(d.name.trim().length < 2 ? { name: "נא למלא שם מלא" } : {}),
        ...(!/^[A-Za-zא-ת"'׳״\s-]+$/.test(d.name.trim()) ? { name: "השם יכול להכיל אותיות, רווח, מקף וגרש בלבד" } : {}),
        ...(!isPhone(d.phone) ? { phone: "מספר לא תקין — לדוגמה 052-555-0101 או 08-123-4567" } : {}),
        ...(d.email && !isEmail(d.email) ? { email: "כתובת מייל לא תקינה" } : {}),
        ...(d.specialAttention.length > 255 ? { specialAttention: "עד 255 תווים" } : {}),
      })}
      onSave={(d) => save({ ...d, phone: normalizePhone(d.phone)!, email: d.email.trim() || undefined })}
      view={(v) => (
        <Dl items={[["שם מלא", v.name], ["סוג", WITNESS_TYPE_LABELS[v.type]], ["טלפון", <span key="p" dir="ltr">{v.phone}</span>], ["מייל", v.email], ["עיר", cityName(v.cityId)], ["כתובת", [v.address, v.apartment && `דירה ${v.apartment}`].filter(Boolean).join(", ")], ["לתשומת לב", v.specialAttention]]} />
      )}
      edit={(d, set, e) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="שם מלא" required error={e.name}><Input value={d.name} onChange={(x) => set("name", x.target.value)} /></Field>
          <Field label="סוג" required><Select value={d.type} onChange={(x) => set("type", x.target.value as WitnessType)}>{(Object.keys(WITNESS_TYPE_LABELS) as WitnessType[]).map((t) => <option key={t} value={t}>{WITNESS_TYPE_LABELS[t]}</option>)}</Select></Field>
          <Field label="טלפון" required error={e.phone}><Input dir="ltr" inputMode="tel" value={d.phone} onChange={(x) => set("phone", x.target.value)} /></Field>
          <Field label="מייל" error={e.email}><Input dir="ltr" type="email" value={d.email} onChange={(x) => set("email", x.target.value)} /></Field>
          <Field label="עיר" required><Select value={d.cityId} onChange={(x) => set("cityId", x.target.value)}>{CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Field label="כתובת"><Input value={d.address} onChange={(x) => set("address", x.target.value)} /></Field>
            <Field label="דירה"><Input inputMode="numeric" value={d.apartment} onChange={(x) => set("apartment", x.target.value.replace(/\D/g, ""))} /></Field>
          </div>
          <Field className="sm:col-span-2" label="לתשומת לב הצוות" hint={`${d.specialAttention.length}/255 · מוצג כהתראה בראש הכרטיס`} error={e.specialAttention}>
            <Textarea maxLength={255} value={d.specialAttention} onChange={(x) => set("specialAttention", x.target.value)} />
          </Field>
        </div>
      )}
    />
  );
}

function ContactSection({ w, save }: { w: Witness; save: SaveFn }) {
  const c = w.contact ?? { name: "", relation: "", phone: "", email: "" };
  const value = { ...c, phone: c.phone ? displayPhone(c.phone) : "" };
  return (
    <EditableSection
      title="איש/אשת קשר"
      value={value}
      validate={(d) => ({
        ...(d.phone && !isPhone(d.phone) ? { phone: "מספר לא תקין" } : {}),
        ...(d.email && !isEmail(d.email) ? { email: "כתובת מייל לא תקינה" } : {}),
        ...(!d.name && (d.phone || d.email) ? { name: "למי שייכים הפרטים?" } : {}),
      })}
      onSave={(d) => save({ contact: d.name ? { ...d, phone: d.phone ? normalizePhone(d.phone)! : "" } : undefined })}
      view={(v) => v.name ? <Dl items={[["שם", v.name], ["קרבה", v.relation], ["טלפון", v.phone && <a key="p" dir="ltr" className="hover:underline" href={`tel:${v.phone}`}>{v.phone}</a>], ["מייל", v.email]]} /> : <p className="text-sm text-muted">לא הוגדר/ה איש/אשת קשר. מומלץ לעדים מבוגרים — בן/בת משפחה או מטפל/ת.</p>}
      edit={(d, set, e) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="שם" error={e.name}><Input value={d.name} onChange={(x) => set("name", x.target.value)} /></Field>
          <Field label="קרבה" hint="בן/בת, מטפל/ת, שכן/ה…"><Input value={d.relation} onChange={(x) => set("relation", x.target.value)} /></Field>
          <Field label="טלפון" error={e.phone}><Input dir="ltr" inputMode="tel" value={d.phone} onChange={(x) => set("phone", x.target.value)} /></Field>
          <Field label="מייל" error={e.email}><Input dir="ltr" type="email" value={d.email} onChange={(x) => set("email", x.target.value)} /></Field>
        </div>
      )}
    />
  );
}

function AccessibilitySection({ w, save }: { w: Witness; save: SaveFn }) {
  const value = { stairs: w.stairs, accessibilityNeed: w.accessibilityNeed ?? "", specialNeeds: w.specialNeeds ?? "", specialPopulations: w.specialPopulations ?? [], zoom: w.zoom ?? "not_interested", languages: w.languages };
  return (
    <EditableSection
      title="נגישות, קהלים ושפות"
      value={value}
      validate={(d) => ({ ...(d.languages.length === 0 ? { languages: "בחרו לפחות שפה אחת" } : {}), ...(d.specialNeeds.length > 1000 ? { specialNeeds: "עד 1000 תווים" } : {}) })}
      onSave={(d) => save(d)}
      view={(v) => (
        <Dl items={[
          ["מדרגות", v.stairs ? "יכול/ה לעלות מדרגות" : "צריך/ה מעלית או קומת קרקע"],
          ["עזרי ניידות", ACCESSIBILITY_NEED_LABELS[v.accessibilityNeed]],
          ["שפות עדות", v.languages.join(", ")],
          ["סלון בזום", v.zoom === "interested" ? "מעוניין/ת" : "לא מעוניין/ת"],
          ["קהלים מיוחדים", v.specialPopulations.map((p) => SPECIAL_POPULATION_LABELS[p]).join(" · ")],
          ["צרכים מיוחדים", v.specialNeeds],
        ]} />
      )}
      edit={(d, set, e) => (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="מדרגות"><Select value={d.stairs ? "yes" : "no"} onChange={(x) => set("stairs", x.target.value === "yes")}><option value="yes">יכול/ה לעלות מדרגות</option><option value="no">צריך/ה מעלית או קומת קרקע</option></Select></Field>
            <Field label="עזרי ניידות"><Select value={d.accessibilityNeed} onChange={(x) => set("accessibilityNeed", x.target.value as Witness["accessibilityNeed"])}>{Object.entries(ACCESSIBILITY_NEED_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <Field label="סלון בזום"><Select value={d.zoom} onChange={(x) => set("zoom", x.target.value as "interested" | "not_interested")}><option value="interested">מעוניין/ת</option><option value="not_interested">לא מעוניין/ת</option></Select></Field>
          </div>
          <fieldset><legend className="mb-2 text-sm font-medium">שפות עדות <span className="text-rose">*</span></legend>
            <CheckGroup options={Object.fromEntries([...LANGUAGES, "Deutsch"].map((l) => [l, l]))} value={d.languages} onChange={(v) => set("languages", v)} />
            {e.languages && <p className="mt-1 text-sm text-rose">{e.languages}</p>}
          </fieldset>
          <fieldset><legend className="mb-2 text-sm font-medium">קהלים מיוחדים</legend>
            <CheckGroup options={SPECIAL_POPULATION_LABELS} value={d.specialPopulations} onChange={(v) => set("specialPopulations", v)} />
          </fieldset>
          <Field label="צרכים מיוחדים" hint={`${d.specialNeeds.length}/1000`} error={e.specialNeeds}><Textarea maxLength={1000} value={d.specialNeeds} onChange={(x) => set("specialNeeds", x.target.value)} /></Field>
        </div>
      )}
    />
  );
}

function BackgroundSection({ w, save }: { w: Witness; save: SaveFn }) {
  const value = { countryOfBirth: w.countryOfBirth ?? "", birthDate: w.birthDate ?? "", howBrought: w.howBrought ?? "", community: w.community ?? "", programs: w.programs ?? [], siteLink: w.siteLink ?? "", hostedBefore: !!w.hostedBefore, bio: w.bio, presentation: w.presentation ?? "" };
  const maxBirth = `${new Date().getFullYear()}-01-01`;
  return (
    <EditableSection
      title="רקע ועדות"
      value={value}
      validate={(d) => ({
        ...(d.birthDate && d.birthDate >= maxBirth ? { birthDate: "תאריך לידה לא סביר" } : {}),
        ...(d.siteLink && !/^https?:\/\/\S+\.\S+/.test(d.siteLink) ? { siteLink: "קישור צריך להתחיל ב-https://" } : {}),
        ...(d.presentation.length > 2000 ? { presentation: "עד 2000 תווים" } : {}),
      })}
      onSave={(d) => save(d)}
      view={(v) => (
        <div className="space-y-5">
          <Dl items={[
            ["ארץ לידה", v.countryOfBirth],
            ["תאריך לידה", v.birthDate && `${heDate(v.birthDate)} (${age(v.birthDate)})`],
            ["איך הגיע/ה אלינו", v.howBrought],
            ["קהילה", v.community],
            ["תוכניות נוספות", v.programs.map((p) => PROGRAM_LABELS[p]).join(" · ")],
            ["סיפר/ה בסלון בעבר", v.hostedBefore ? "כן" : "לא"],
            ["קישור לאתר / סרטון", v.siteLink && <a key="l" href={v.siteLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline" dir="ltr">{v.siteLink.replace(/^https?:\/\//, "")}<ExternalLink className="size-3.5" /></a>],
            ["על העד/ה (פנימי)", v.bio],
          ]} />
          <div>
            <p className="text-sm text-muted">פסקה למפת הסלונים · כך זה מופיע לאורחים</p>
            {v.presentation ? <blockquote className="mt-2 rounded-lg border-s-4 border-brand bg-cream/60 px-4 py-3 leading-relaxed">{v.presentation}</blockquote> : <p className="mt-1 text-sm text-rose">חסרה פסקה — האורחים יראו רק שם וסוג.</p>}
          </div>
        </div>
      )}
      edit={(d, set, e) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ארץ לידה"><Input value={d.countryOfBirth} onChange={(x) => set("countryOfBirth", x.target.value)} /></Field>
          <Field label="תאריך לידה" error={e.birthDate}><Input type="date" max={maxBirth} value={d.birthDate} onChange={(x) => set("birthDate", x.target.value)} /></Field>
          <Field label="איך הגיע/ה אלינו"><Input value={d.howBrought} onChange={(x) => set("howBrought", x.target.value)} /></Field>
          <Field label="קהילה"><Select value={d.community} onChange={(x) => set("community", x.target.value)}><option value="">—</option>{COMMUNITIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="קישור לאתר / סרטון" error={e.siteLink}><Input dir="ltr" value={d.siteLink} placeholder="https://" onChange={(x) => set("siteLink", x.target.value)} /></Field>
          <Field label="סיפר/ה בסלון בעבר"><Select value={d.hostedBefore ? "yes" : "no"} onChange={(x) => set("hostedBefore", x.target.value === "yes")}><option value="yes">כן</option><option value="no">לא</option></Select></Field>
          <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium">תוכניות נוספות</legend><CheckGroup options={PROGRAM_LABELS} value={d.programs} onChange={(v) => set("programs", v)} /></fieldset>
          <Field className="sm:col-span-2" label="על העד/ה (פנימי)"><Textarea value={d.bio} onChange={(x) => set("bio", x.target.value)} /></Field>
          <Field className="sm:col-span-2" label="פסקה למפת הסלונים" hint={`${d.presentation.length}/2000 · מוצג לאורחים בדף הסלון — כתבו בגוף שלישי`} error={e.presentation}>
            <Textarea className="min-h-32" maxLength={2000} value={d.presentation} onChange={(x) => set("presentation", x.target.value)} />
          </Field>
        </div>
      )}
    />
  );
}

function StatusSection({ w, assignedCount, save }: { w: Witness; assignedCount: number; save: SaveFn }) {
  const value = { status: w.status, archivedReason: w.archivedReason ?? ("" as ArchivedReason | ""), statusNote: w.statusNote ?? "", lastContactAt: (w.lastContactAt ?? "").slice(0, 16), maxSalons: w.maxSalons };
  return (
    <EditableSection
      title="סטטוס השנה"
      value={value}
      validate={(d) => ({
        ...(d.status === "archived" && !d.archivedReason ? { archivedReason: "בחרו סיבה" } : {}),
        ...(d.status === "no_answer" && !d.lastContactAt ? { lastContactAt: "מתי היה הניסיון האחרון?" } : {}),
        ...(d.statusNote.length > 225 ? { statusNote: "עד 225 תווים" } : {}),
        ...(d.maxSalons < assignedCount ? { maxSalons: `כבר משובץ/ת ל-${assignedCount}` } : {}),
      })}
      onSave={(d) => {
        if (d.status !== "available" && assignedCount > 0) return `אי אפשר לשנות סטטוס — ${w.name} משובץ/ת ל-${assignedCount} סלונים. בטלו קודם את השיבוצים.`;
        if (d.status !== "available" && w.availability.length > 0 && !confirm("שינוי הסטטוס ימחק את הזמינות שהוזנה השנה. להמשיך?")) return "השינוי לא נשמר";
        save({
          status: d.status,
          archivedReason: d.status === "archived" ? (d.archivedReason as ArchivedReason) : undefined,
          statusNote: d.statusNote,
          lastContactAt: d.lastContactAt || new Date().toISOString(),
          maxSalons: d.maxSalons,
          availability: d.status === "available" ? w.availability : [],
        });
      }}
      view={(v) => (
        <Dl items={[
          ["סטטוס", <Badge key="s" tone={WITNESS_STATUS_TONE[v.status]}>{WITNESS_STATUS_LABELS[v.status]}</Badge>],
          ...(v.status === "archived" ? [["סיבה", v.archivedReason ? ARCHIVED_REASON_LABELS[v.archivedReason] : ""] as [string, React.ReactNode]] : []),
          ["קשר אחרון", v.lastContactAt && `${timeAgo(v.lastContactAt)} · ${new Date(v.lastContactAt).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}`],
          ["מקסימום סלונים השנה", `${v.maxSalons} (משובץ/ת ל-${assignedCount})`],
          ["הערה לסטטוס", v.statusNote],
        ]} />
      )}
      edit={(d, set, e) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="סטטוס"><Select value={d.status} onChange={(x) => set("status", x.target.value as WitnessStatus)}>{(Object.keys(WITNESS_STATUS_LABELS) as WitnessStatus[]).map((s) => <option key={s} value={s}>{WITNESS_STATUS_LABELS[s]}</option>)}</Select></Field>
          {d.status === "archived" && (
            <Field label="סיבה לארכיון" required error={e.archivedReason}><Select value={d.archivedReason} onChange={(x) => set("archivedReason", x.target.value as ArchivedReason)}><option value="">בחירה…</option>{(Object.keys(ARCHIVED_REASON_LABELS) as ArchivedReason[]).map((r) => <option key={r} value={r}>{ARCHIVED_REASON_LABELS[r]}</option>)}</Select></Field>
          )}
          <Field label="קשר אחרון" required={d.status === "no_answer"} error={e.lastContactAt}><Input type="datetime-local" value={d.lastContactAt} max={new Date().toISOString().slice(0, 16)} onChange={(x) => set("lastContactAt", x.target.value)} /></Field>
          <Field label="מקסימום סלונים השנה" error={e.maxSalons}><Select value={d.maxSalons} onChange={(x) => set("maxSalons", Number(x.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n}>{n}</option>)}</Select></Field>
          <Field className="sm:col-span-2" label="הערה לסטטוס" hint={`${d.statusNote.length}/225 · למשל: מתי לחזור אליו/ה`} error={e.statusNote}><Textarea maxLength={225} value={d.statusNote} onChange={(x) => set("statusNote", x.target.value)} /></Field>
        </div>
      )}
    />
  );
}

function AvailabilityGrid({ w, assignedDates, save }: { w: Witness; assignedDates: string[]; save: SaveFn }) {
  const toggle = (date: string, slot: Slot) => {
    const day = w.availability.find((a) => a.date === date);
    const on = !!day?.slots.includes(slot);
    if (on && assignedDates.includes(date)) {
      toast.error("יש שיבוץ ביום הזה — בטלו קודם את השיבוץ.");
      return;
    }
    const slots = on ? day!.slots.filter((s) => s !== slot) : [...(day?.slots ?? []), slot];
    const availability = [...w.availability.filter((a) => a.date !== date), ...(slots.length ? [{ date, slots }] : [])].sort((a, b) => a.date.localeCompare(b.date));
    save({ availability, status: availability.length ? "available" : w.status, lastContactAt: new Date().toISOString() });
  };
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">זמינות בשבוע זיכרון בסלון</h2>
      <p className="mt-1 text-sm text-muted">לחיצה על משבצת מסמנת או מבטלת. נשמר מיד. סימון זמינות מעביר את העד/ה לסטטוס &quot;זמין/ה&quot;.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead><tr className="text-muted"><th className="py-2 text-start font-medium">יום</th>{SLOTS.map((s) => <th key={s} className="py-2 font-medium">{SLOT_LABELS[s]}</th>)}</tr></thead>
          <tbody>
            {SALON_DAYS.map((d) => {
              const day = w.availability.find((a) => a.date === d.date);
              const booked = assignedDates.includes(d.date);
              return (
                <tr key={d.date} className="border-t border-line/60">
                  <td className="py-2"><span className="font-medium tabular-nums">{shortDate(d.date)}</span> <span className="text-muted">{d.label}</span></td>
                  {SLOTS.map((slot) => {
                    const on = !!day?.slots.includes(slot);
                    return (
                      <td key={slot} className="p-1 text-center">
                        <button aria-pressed={on} aria-label={`${shortDate(d.date)} ${SLOT_LABELS[slot]}`} onClick={() => toggle(d.date, slot)}
                          className={cn("h-9 w-full rounded-md border text-xs", on ? (booked ? "border-ink bg-ink text-paper" : "border-ink bg-brand") : "border-line bg-paper hover:bg-cream")}>
                          {on ? (booked ? "משובץ/ת" : "זמין/ה") : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function HistorySection({ w, save }: { w: Witness; save: SaveFn }) {
  const history = [...(w.history ?? [])].sort((a, b) => b.year - a.year);
  const [editing, setEditing] = useState<number | null>(null);
  const [text, setText] = useState("");
  if (history.length === 0) return <EmptyState title="אין היסטוריה משנים קודמות">סלונים וסיכומי שנה יופיעו כאן בסוף כל עונה.</EmptyState>;
  return (
    <div className="space-y-4">
      {history.map((h) => (
        <Card key={h.year} className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tabular-nums">{h.year}</h2>
            <span className="text-sm text-muted">{h.salons.length} סלונים</span>
          </div>
          <ul className="mt-3 divide-y divide-line text-sm">
            {h.salons.map((s) => (
              <li key={s.date + s.host} className="grid grid-cols-[6rem_1fr_auto] gap-3 py-2">
                <span className="tabular-nums">{heDate(s.date)}</span><span className="font-medium">{s.host}</span><span className="text-muted">שובץ ע״י {s.assignedBy}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <p className="text-sm text-muted">סיכום השנה</p>
            {editing === h.year ? (
              <div className="mt-2 space-y-2">
                <Textarea maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>ביטול</Button>
                  <Button size="sm" onClick={() => { save({ history: (w.history ?? []).map((x) => (x.year === h.year ? { ...x, summary: text.trim() } : x)) }); setEditing(null); toast.success("הסיכום נשמר"); }}>שמירה</Button>
                </div>
              </div>
            ) : (
              <button className="mt-1 w-full rounded-lg px-3 py-2 text-start hover:bg-cream" onClick={() => { setEditing(h.year); setText(h.summary ?? ""); }}>
                {h.summary || <span className="text-muted">הוספת סיכום שנה…</span>}
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
