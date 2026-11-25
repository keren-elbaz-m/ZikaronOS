"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Home, LayoutDashboard, Search, UserRoundSearch, Users, UsersRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { cityName, cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { salons, witnesses, registrations } = useStore();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const waiting = salons.filter((s) => s.wantsWitness && !s.witnessId).length;
  const toCall = witnesses.filter((w) => w.status === "not_contacted" || w.status === "no_answer").length;
  const items = [
    { href: "/admin", label: "לוח בקרה", icon: LayoutDashboard, exact: true },
    { href: "/admin/salons", label: "סלונים", icon: Home, count: salons.length },
    { href: "/admin/witnesses", label: "עדים", icon: UsersRound, count: toCall, countLabel: "לטיפול", tone: toCall ? "brand" : undefined },
    { href: "/admin/guests", label: "אורחים", icon: Users, count: registrations.length },
    { href: "/admin/teaming", label: "ציוות", icon: UserRoundSearch, count: waiting, countLabel: "ממתינים", tone: waiting ? "rose" : undefined },
  ];

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:pt-8">
        <button
          onClick={() => setPaletteOpen(true)}
          className="mb-4 flex h-10 w-full items-center gap-2 rounded-lg border border-line bg-paper px-3 text-sm text-muted hover:border-ink"
        >
          <Search className="size-4" /> חיפוש מהיר
          <kbd className="ms-auto rounded border border-line px-1.5 text-[11px]" dir="ltr">⌘K</kbd>
        </button>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="ניווט צוות">
          {items.map((it) => {
            const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn("flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm", active ? "bg-ink text-paper" : "hover:bg-cream")}
              >
                <it.icon className="size-4" />
                {it.label}
                {it.count !== undefined && it.count > 0 && (
                  <span
                    title={it.countLabel}
                    className={cn(
                      "ms-auto rounded-md px-1.5 text-xs tabular-nums",
                      active ? "bg-paper/20" : it.tone === "rose" ? "bg-rose/15 text-rose" : it.tone === "brand" ? "bg-brand/40" : "bg-cream text-muted",
                    )}
                  >
                    {it.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const { salons, witnesses, registrations } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const results = useMemo(() => {
    const t = q.trim();
    const all = [
      ...salons.map((s) => ({ kind: "סלון", title: `הסלון של ${s.orgName ?? s.hostName}`, sub: `${s.date.slice(5).split("-").reverse().join(".")} · ${s.digital ? "דיגיטלי" : cityName(s.cityId)}`, href: `/admin/salons/${s.id}`, hay: `${s.hostName} ${s.orgName ?? ""} ${s.address} ${s.email} ${s.phone}` })),
      ...witnesses.map((w) => ({ kind: "עד/ה", title: w.name, sub: cityName(w.cityId), href: `/admin/witnesses/${w.id}`, hay: `${w.name} ${w.phone}` })),
      ...registrations.map((r) => ({ kind: "אורח/ת", title: r.name, sub: `${r.seats} מקומות`, href: `/admin/salons/${r.salonId}`, hay: `${r.name} ${r.email} ${r.phone}` })),
    ];
    return (t ? all.filter((r) => r.hay.includes(t) || r.title.includes(t)) : all.slice(0, 8)).slice(0, 10);
  }, [q, salons, witnesses, registrations]);

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-ink/40 p-4 pt-[12vh]" onClick={onClose}>
      <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-line bg-paper shadow-xl" role="dialog" aria-label="חיפוש מהיר" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="size-4 text-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === "Enter" && results[idx]) go(results[idx].href);
            }}
            placeholder="שם, טלפון, מייל או כתובת…"
            className="h-12 w-full bg-transparent outline-none"
          />
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1" role="listbox">
          {results.length === 0 && <li className="px-4 py-6 text-center text-muted">לא נמצאו תוצאות</li>}
          {results.map((r, i) => (
            <li key={r.href + r.title} role="option" aria-selected={i === idx}>
              <button onMouseEnter={() => setIdx(i)} onClick={() => go(r.href)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start", i === idx && "bg-cream")}>
                <span className="w-14 shrink-0 text-xs text-muted">{r.kind}</span>
                <span className="font-medium">{r.title}</span>
                <span className="ms-auto text-sm text-muted">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
