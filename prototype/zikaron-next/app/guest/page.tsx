"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Button, Card, EmptyState } from "@/components/ui";
import { WITNESS_TYPE_LABELS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cityName, formatDate, icsFor } from "@/lib/utils";

export default function GuestPage() {
  const { registrations, salons, witnesses, session, cancelRegistration, ready } = useStore();
  if (!ready) return null;
  const mine = registrations.filter((r) => session.guestRegistrationIds.includes(r.id));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">ההרשמות שלי</h1>
      {mine.length === 0 ? (
        <EmptyState title="עוד לא נרשמת לסלון" action={<Link href="/salons" className="inline-flex h-11 items-center rounded-lg bg-brand px-5 font-medium">מציאת סלון</Link>}>
          מצאו סלון קרוב במפה ונרשמו בצעד אחד.
        </EmptyState>
      ) : (
        mine.map((r) => {
          const salon = salons.find((s) => s.id === r.salonId);
          if (!salon) return null;
          const witness = witnesses.find((w) => w.id === salon.witnessId);
          return (
            <Card key={r.id} className="space-y-4 p-6">
              <div>
                <p className="text-muted">{formatDate(salon.date)} · {salon.time}</p>
                <h2 className="mt-1 text-xl font-semibold">הסלון של {salon.orgName ?? salon.hostName}</h2>
                <p className="mt-1">{salon.digital ? "סלון דיגיטלי — הקישור יגיע יום לפני" : `${salon.address}, ${cityName(salon.cityId)}${salon.floor ? ` · קומה ${salon.floor}` : ""}`}</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted">נרשמת ל</dt><dd className="font-medium">{r.seats} {r.seats === 1 ? "מקום" : "מקומות"}</dd></div>
                <div><dt className="text-muted">עדות</dt><dd className="font-medium">{witness ? `${witness.name} · ${WITNESS_TYPE_LABELS[witness.type]}` : "תעודכן בקרוב"}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <a href={icsFor(salon)} download={`zikaron-${salon.id}.ics`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 font-medium hover:bg-brand-strong"><CalendarPlus className="size-4" />הוספה ליומן</a>
                <Link href={`/salons/${salon.id}`} className="inline-flex h-10 items-center rounded-lg border border-line px-4 hover:bg-cream">דף הסלון</Link>
                <Button variant="danger" className="ms-auto" onClick={() => { if (confirm("לבטל את ההרשמה? המארח/ת יקבל/תקבל עדכון.")) { cancelRegistration(r.id); toast("ההרשמה בוטלה"); } }}>ביטול הרשמה</Button>
              </div>
            </Card>
          );
        })
      )}
    </main>
  );
}
