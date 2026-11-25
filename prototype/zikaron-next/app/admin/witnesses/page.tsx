"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Phone, Plus } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { CITIES, LANGUAGES, WITNESS_STATUS_LABELS, WITNESS_TYPE_LABELS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, cn, displayPhone, downloadCsv, isPhone, normalizePhone, timeAgo, witnessLoad } from "@/lib/utils";
import type { WitnessStatus, WitnessType } from "@/lib/types";

export const statusTone = (s: WitnessStatus) =>
  ({ available: "green", not_available: "neutral", archived: "neutral", not_contacted: "brand", no_answer: "rose" } as const)[s];

const PIPELINE: WitnessStatus[] = ["not_contacted", "no_answer", "available", "not_available", "archived"];

export default function WitnessesPage() {
  const { witnesses, salons, ready } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<WitnessStatus | "">("");
  const [type, setType] = useState("");
  const [adding, setAdding] = useState(false);
  const load = useMemo(() => witnessLoad(salons), [salons]);

  const rows = useMemo(
    () =>
      witnesses
        .filter((w) => (!q || `${w.name} ${w.phone} ${cityName(w.cityId)}`.includes(q)) && (!status || w.status === status) && (!type || w.type === type))
        .sort((a, b) => PIPELINE.indexOf(a.status) - PIPELINE.indexOf(b.status) || a.name.localeCompare(b.name, "he")),
    [witnesses, q, status, type],
  );

  if (!ready) return null;
  const count = (s: WitnessStatus) => witnesses.filter((w) => w.status === s).length;

  return (
    <main className="space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">עדים</h1>
          <p className="mt-1 text-muted">מציג {rows.length} מתוך {witnesses.length}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => downloadCsv(`witnesses-${new Date().toISOString().slice(0, 10)}.csv`, ["שם", "סוג", "טלפון", "עיר", "שפות", "סטטוס", "סלונים השנה"], rows.map((w) => [w.name, WITNESS_TYPE_LABELS[w.type], displayPhone(w.phone), cityName(w.cityId), w.languages.join(" / "), WITNESS_STATUS_LABELS[w.status], `${load[w.id] ?? 0}/${w.maxSalons}`]))}>
            <Download className="size-4" />ייצוא
          </Button>
          <Button onClick={() => setAdding(true)}><Plus className="size-4" />הוספת עד/ה</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="סטטוס">
        <button role="tab" aria-selected={!status} onClick={() => setStatus("")} className={cn("rounded-lg border px-3 py-1.5 text-sm", !status ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:bg-cream")}>הכל · {witnesses.length}</button>
        {PIPELINE.map((s) => (
          <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={cn("rounded-lg border px-3 py-1.5 text-sm", status === s ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:bg-cream")}>
            {WITNESS_STATUS_LABELS[s]} · {count(s)}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="חיפוש: שם, טלפון או עיר" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש" />
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="סוג"><option value="">כל הסוגים</option>{(Object.keys(WITNESS_TYPE_LABELS) as WitnessType[]).map((t) => <option key={t} value={t}>{WITNESS_TYPE_LABELS[t]}</option>)}</Select>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line bg-cream/60 text-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-start [&>th]:font-medium"><th>שם</th><th>סוג</th><th>עיר</th><th>שפות</th><th>סטטוס</th><th>סלונים השנה</th><th>קשר אחרון</th></tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-b border-line/60 hover:bg-cream/40 [&>td]:px-4 [&>td]:py-3">
                <td><Link href={`/admin/witnesses/${w.id}`} className="font-medium hover:underline">{w.name}</Link></td>
                <td>{WITNESS_TYPE_LABELS[w.type]}</td>
                <td>{cityName(w.cityId)}</td>
                <td>{w.languages.join(", ")}</td>
                <td><Badge tone={statusTone(w.status)}>{WITNESS_STATUS_LABELS[w.status]}</Badge></td>
                <td className="tabular-nums">{load[w.id] ?? 0}/{w.maxSalons}</td>
                <td className="text-muted">{w.lastContactAt ? timeAgo(w.lastContactAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {adding && <AddWitnessDialog onClose={() => setAdding(false)} />}
    </main>
  );
}

function AddWitnessDialog({ onClose }: { onClose: () => void }) {
  const { witnesses, addWitness } = useStore();
  const router = useRouter();
  const [f, setF] = useState({ name: "", phone: "", type: "survivor" as WitnessType, cityId: "", languages: ["עברית"], stairs: true, bio: "" });
  const [touched, setTouched] = useState(false);
  const normalized = isPhone(f.phone) ? normalizePhone(f.phone) : null;
  // Duplicate check runs while typing — not after save, and not only on blur.
  const duplicate = normalized ? witnesses.find((w) => w.phone === normalized) : undefined;
  const errors = {
    name: f.name.trim().length < 2 ? "נא למלא שם מלא" : "",
    phone: !isPhone(f.phone) ? "מספר לא תקין — לדוגמה 052-555-0101 או 08-123-4567" : duplicate ? "המספר כבר שייך לעד/ה קיים/ת" : "",
    cityId: !f.cityId ? "בחרו עיר" : "",
    languages: f.languages.length === 0 ? "בחרו לפחות שפה אחת" : "",
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = () => {
    setTouched(true);
    if (invalid) return;
    const city = CITIES.find((c) => c.id === f.cityId)!;
    const id = addWitness({ ...f, name: f.name.trim(), phone: normalized!, status: "not_contacted", lat: city.lat, lng: city.lng, availability: [], maxSalons: 2 });
    toast.success(`${f.name} נוסף/ה`);
    router.push(`/admin/witnesses/${id}`);
  };

  return (
    <div className="fixed inset-0 z-[2000] grid place-items-center overflow-y-auto bg-ink/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-xl space-y-4 p-6" role="dialog" aria-modal="true" aria-labelledby="add-w" onClick={(e) => e.stopPropagation()}>
        <h2 id="add-w" className="text-xl font-semibold">הוספת עד/ה</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="שם מלא" required error={touched ? errors.name : ""}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="טלפון" required error={(touched || duplicate) ? errors.phone : ""}>
            <Input dir="ltr" inputMode="tel" value={f.phone} aria-invalid={!!duplicate} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
          {duplicate && (
            <p className="sm:col-span-2 -mt-2 flex items-center gap-2 rounded-lg bg-brand/20 px-3 py-2 text-sm">
              <Phone className="size-4" /> זה המספר של <Link className="font-medium underline" href={`/admin/witnesses/${duplicate.id}`}>{duplicate.name}</Link> — אולי לעדכן את הכרטיס הקיים?
            </p>
          )}
          <Field label="סוג" required><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as WitnessType })}>{(Object.keys(WITNESS_TYPE_LABELS) as WitnessType[]).map((t) => <option key={t} value={t}>{WITNESS_TYPE_LABELS[t]}</option>)}</Select></Field>
          <Field label="עיר" required error={touched ? errors.cityId : ""}><Select value={f.cityId} onChange={(e) => setF({ ...f, cityId: e.target.value })}><option value="">בחירה…</option>{CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">שפות עדות <span className="text-rose">*</span></legend>
            <div className="flex flex-wrap gap-3">
              {[...LANGUAGES, "Deutsch"].map((l) => (
                <label key={l} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-ink" checked={f.languages.includes(l)} onChange={(e) => setF({ ...f, languages: e.target.checked ? [...f.languages, l] : f.languages.filter((x) => x !== l) })} />{l}
                </label>
              ))}
            </div>
            {touched && errors.languages && <p className="mt-1 text-sm text-rose">{errors.languages}</p>}
          </fieldset>
          <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-4 accent-ink" checked={f.stairs} onChange={(e) => setF({ ...f, stairs: e.target.checked })} />יכול/ה לעלות מדרגות
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>ביטול</Button>
          <Button onClick={save} disabled={!!duplicate}>שמירה ומעבר לכרטיס</Button>
        </div>
      </Card>
    </div>
  );
}
