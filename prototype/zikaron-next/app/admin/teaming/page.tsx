"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { WITNESS_TYPE_LABELS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, cn, formatDate, matchWitnesses, type Match } from "@/lib/utils";

function Teaming() {
  const { salons, witnesses, assignWitness, ready } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [confirm, setConfirm] = useState<Match | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);

  const waiting = salons.filter((s) => s.wantsWitness && !s.witnessId).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const selectedId = params.get("salon") ?? waiting[0]?.id;
  const salon = salons.find((s) => s.id === selectedId);

  const load = useMemo(() => {
    const l: Record<string, number> = {};
    salons.forEach((s) => s.witnessId && (l[s.witnessId] = (l[s.witnessId] ?? 0) + 1));
    return l;
  }, [salons]);
  const matches = useMemo(() => (salon ? matchWitnesses(salon, witnesses, load) : []), [salon, witnesses, load]);
  const visible = showBlocked ? matches : matches.filter((m) => !m.blocked);

  if (!ready) return null;

  const doAssign = () => {
    if (!salon || !confirm) return;
    assignWitness(salon.id, confirm.witness.id);
    toast.success(`${confirm.witness.name} צוות/ה לסלון של ${salon.hostName}`, {
      description: "המארח/ת יקבל/תקבל את הפרטים בדף הסלון",
      action: { label: "ביטול", onClick: () => assignWitness(salon.id, undefined) },
    });
    setConfirm(null);
    const nextSalon = waiting.find((s) => s.id !== salon.id);
    router.replace(nextSalon ? `/admin/teaming?salon=${nextSalon.id}` : "/admin/teaming");
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-semibold">ציוות עדים</h1>
      <p className="mt-1 text-muted">{waiting.length} סלונים ממתינים. ההתאמות מדורגות לפי תאריך ושעה, שפה, נגישות ומרחק — עם הסבר לכל אחת.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card className="h-fit p-2">
          {waiting.length === 0 ? (
            <EmptyState title="אין סלונים שממתינים לעד/ה">עבודה טובה.</EmptyState>
          ) : (
            <ul>
              {waiting.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => router.replace(`/admin/teaming?salon=${s.id}`)}
                    className={cn("w-full rounded-lg px-4 py-3 text-start", s.id === salon?.id ? "bg-brand/25" : "hover:bg-cream")}
                    aria-current={s.id === salon?.id}
                  >
                    <p className="font-medium">הסלון של {s.orgName ?? s.hostName}</p>
                    <p className="text-sm text-muted">{formatDate(s.date)} · {s.time} · {s.digital ? "דיגיטלי" : cityName(s.cityId)} · {s.language}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {salon && salon.wantsWitness && !salon.witnessId && (
          <section className="space-y-3" aria-label="התאמות">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{visible.length} התאמות לסלון של {salon.orgName ?? salon.hostName}</h2>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-ink" checked={showBlocked} onChange={(e) => setShowBlocked(e.target.checked)} />
                הצג גם לא זמינים
              </label>
            </div>
            {visible.length === 0 && (
              <EmptyState title="אין עד/ה זמין/ה במועד הזה">סמנו &quot;הצג גם לא זמינים&quot; כדי לראות מי קרוב/ה להתאים, או פנו למארח/ת לגבי מועד אחר.</EmptyState>
            )}
            {visible.map((m, i) => (
              <Card key={m.witness.id} className={cn("p-5", m.blocked && "opacity-60")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{m.witness.name}</h3>
                      {i === 0 && !m.blocked && <Badge tone="ink">ההתאמה הטובה ביותר</Badge>}
                    </div>
                    <p className="text-sm text-muted">{WITNESS_TYPE_LABELS[m.witness.type]} · {cityName(m.witness.cityId)} · {m.witness.languages.join(", ")}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-3xl font-semibold tabular-nums">{Math.max(0, m.score)}</p>
                    <p className="text-xs text-muted">ציון התאמה</p>
                  </div>
                </div>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {m.reasons.map((r) => (
                    <li key={r.text} className="flex items-center gap-2 text-sm">
                      {r.ok ? <Check className="size-4 shrink-0 text-green" /> : <X className="size-4 shrink-0 text-rose" />}
                      {r.text}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-end">
                  <Button disabled={m.blocked} onClick={() => setConfirm(m)}>ציוות לסלון</Button>
                </div>
              </Card>
            ))}
          </section>
        )}
      </div>

      {confirm && salon && (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={() => setConfirm(null)}>
          <Card className="w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 id="confirm-title" className="text-xl font-semibold">לאשר את הציוות?</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-cream p-3"><p className="text-muted">סלון</p><p className="font-medium">{salon.orgName ?? salon.hostName}</p><p>{formatDate(salon.date)} · {salon.time}</p></div>
              <div className="rounded-lg bg-cream p-3"><p className="text-muted">עד/ה</p><p className="font-medium">{confirm.witness.name}</p><p>{WITNESS_TYPE_LABELS[confirm.witness.type]}</p></div>
            </div>
            <p className="mt-4 text-sm text-muted">המארח/ת יראה/תראה את פרטי העד/ה בדף הסלון. אפשר לבטל מיד אחרי מתוך ההודעה.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>ביטול</Button>
              <Button onClick={doAssign}>אישור ציוות</Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Teaming />
    </Suspense>
  );
}
