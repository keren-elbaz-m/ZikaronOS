"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Map as MapIcon, List, X } from "lucide-react";
import { SalonCard } from "@/components/salon-card";
import { Button, EmptyState, Input, Select } from "@/components/ui";
import { CITIES, LANGUAGES, SALON_DAYS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, cityName, seatsTaken, shortDate, slotOf, SLOT_LABELS } from "@/lib/utils";
import type { Slot } from "@/lib/types";

const SalonMap = dynamic(() => import("@/components/salon-map"), {
  ssr: false,
  loading: () => <div className="grid size-full place-items-center bg-cream text-muted">טוען מפה…</div>,
});

function SalonSearch() {
  const { salons, registrations, witnesses } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [hoverId, setHoverId] = useState<string>();
  const [view, setView] = useState<"list" | "map">("list");

  // Filters live in the URL, so every search is a shareable link.
  const f = {
    q: params.get("q") ?? "",
    city: params.get("city") ?? "",
    date: params.get("date") ?? "",
    slot: (params.get("slot") ?? "") as Slot | "",
    lang: params.get("lang") ?? "",
    type: params.get("type") ?? "",
    seats: Number(params.get("seats") ?? 1),
    access: params.get("access") === "1",
  };
  const setF = (patch: Partial<Record<keyof typeof f, string | number | boolean>>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v === "" || v === false || (k === "seats" && v === 1) ? next.delete(k) : next.set(k, String(v === true ? 1 : v))));
    router.replace(`/salons?${next.toString()}`, { scroll: false });
  };
  const active = Object.entries(f).filter(([k, v]) => (k === "seats" ? v !== 1 : !!v)).length;

  const results = useMemo(
    () =>
      salons
        .filter((s) => s.isOpen)
        .map((salon) => ({ salon, left: Math.max(0, salon.capacity - seatsTaken(salon.id, registrations)) }))
        .filter(({ salon, left }) => {
          if (f.q && !`${salon.hostName} ${salon.orgName ?? ""} ${salon.address} ${cityName(salon.cityId)}`.includes(f.q)) return false;
          if (f.city && salon.cityId !== f.city) return false;
          if (f.date && salon.date !== f.date) return false;
          if (f.slot && slotOf(salon.time) !== f.slot) return false;
          if (f.lang && salon.language !== f.lang) return false;
          if (f.type === "digital" && !salon.digital) return false;
          if (f.type === "physical" && salon.digital) return false;
          if (f.access && !(salon.digital || salon.accessibility.includes("wheelchair") || salon.accessibility.includes("elevator") || salon.accessibility.includes("ground_floor"))) return false;
          return left >= f.seats || left === 0;
        })
        .sort((a, b) => Number(a.left === 0) - Number(b.left === 0) || a.salon.date.localeCompare(b.salon.date) || a.salon.time.localeCompare(b.salon.time)),
    [salons, registrations, f.q, f.city, f.date, f.slot, f.lang, f.type, f.seats, f.access],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">מציאת סלון</h1>
          <p className="mt-1 text-muted">{results.length} סלונים{active ? " תואמים לסינון" : " פתוחים להרשמה"}</p>
        </div>
        <div className="flex rounded-lg border border-line bg-paper p-0.5 lg:hidden">
          <button onClick={() => setView("list")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === "list" && "bg-cream font-medium")}><List className="size-4" />רשימה</button>
          <button onClick={() => setView("map")} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", view === "map" && "bg-cream font-medium")}><MapIcon className="size-4" />מפה</button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Input className="sm:col-span-2" placeholder="חיפוש לפי שם, כתובת או עיר" value={f.q} onChange={(e) => setF({ q: e.target.value })} aria-label="חיפוש חופשי" />
        <Select aria-label="עיר" value={f.city} onChange={(e) => setF({ city: e.target.value })}>
          <option value="">כל הערים</option>
          {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select aria-label="תאריך" value={f.date} onChange={(e) => setF({ date: e.target.value })}>
          <option value="">כל הימים</option>
          {SALON_DAYS.map((d) => <option key={d.date} value={d.date}>{shortDate(d.date)} · {d.label}</option>)}
        </Select>
        <Select aria-label="שעה" value={f.slot} onChange={(e) => setF({ slot: e.target.value })}>
          <option value="">כל השעות</option>
          {(Object.keys(SLOT_LABELS) as Slot[]).map((s) => <option key={s} value={s}>{SLOT_LABELS[s]}</option>)}
        </Select>
        <Select aria-label="שפה" value={f.lang} onChange={(e) => setF({ lang: e.target.value })}>
          <option value="">כל השפות</option>
          {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
        </Select>
        <Select aria-label="סוג סלון" value={f.type} onChange={(e) => setF({ type: e.target.value })}>
          <option value="">פיזי ודיגיטלי</option>
          <option value="physical">פיזי</option>
          <option value="digital">דיגיטלי</option>
        </Select>
        <Select aria-label="כמה מגיעים" value={f.seats} onChange={(e) => setF({ seats: Number(e.target.value) })}>
          {[1, 2, 3].map((n) => <option key={n} value={n}>{n === 1 ? "אדם אחד" : `${n} אנשים`}</option>)}
        </Select>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4 xl:col-span-8">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-ink" checked={f.access} onChange={(e) => setF({ access: e.target.checked })} />
            נגיש (מעלית / קומת קרקע / כיסא גלגלים)
          </label>
          {active > 0 && (
            <button onClick={() => router.replace("/salons", { scroll: false })} className="ms-auto inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline">
              <X className="size-4" /> ניקוי {active} סינונים
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section aria-label="תוצאות" className={cn("space-y-3", view === "map" && "hidden lg:block")}>
          {results.length === 0 ? (
            <EmptyState title="לא מצאנו סלון שמתאים לסינון" action={<Button variant="secondary" onClick={() => router.replace("/salons")}>ניקוי הסינון</Button>}>
              נסו יום אחר, עיר סמוכה או סלון דיגיטלי. ואם אין סלון באזור — אולי זה הזמן לפתוח אחד.
            </EmptyState>
          ) : (
            results.map(({ salon, left }) => (
              <SalonCard key={salon.id} salon={salon} left={left} active={hoverId === salon.id} onHover={setHoverId} witnessName={witnesses.find((w) => w.id === salon.witnessId)?.name} />
            ))
          )}
        </section>
        <section aria-label="מפה" className={cn("h-[70vh] overflow-hidden rounded-xl border border-line lg:sticky lg:top-24", view === "list" && "hidden lg:block")}>
          <SalonMap items={results} activeId={hoverId} onSelect={(id) => router.push(`/salons/${id}`)} />
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <SalonSearch />
    </Suspense>
  );
}
