"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Home, Search, UsersRound } from "lucide-react";
import { SALON_DAYS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { seatsTaken, shortDate } from "@/lib/utils";

export default function HomePage() {
  const { salons, registrations } = useStore();
  const open = salons.filter((s) => s.isOpen);
  const seatsLeft = open.reduce((n, s) => n + Math.max(0, s.capacity - seatsTaken(s.id, registrations)), 0);
  const first = SALON_DAYS[0].date;
  const last = SALON_DAYS[SALON_DAYS.length - 1].date;

  return (
    <main>
      <section className="border-b border-line bg-cream">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-md bg-paper px-3 py-1 text-sm">
              <CalendarDays className="size-4" /> שבוע זיכרון בסלון · <bdi dir="ltr">{shortDate(first)}–{shortDate(last)}</bdi>
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              זיכרון בסלון.
              <br />
              <span className="text-muted">מפגש אחד, סיפור אחד, בבית.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              מארחים פותחים את הבית, עדים מספרים, ואנחנו מחברים ביניהם. מצאו סלון קרוב אליכם או פתחו סלון משלכם — זה לוקח כמה דקות.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/salons" className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-6 text-lg font-medium hover:bg-brand-strong">
                <Search className="size-5" /> מצאו סלון
              </Link>
              <Link href="/host/new" className="inline-flex h-12 items-center gap-2 rounded-lg border border-ink bg-paper px-6 text-lg font-medium hover:bg-cream">
                <Home className="size-5" /> פתחו סלון
              </Link>
            </div>
          </div>
          <div className="grid content-center gap-3">
            {[
              { n: open.length, t: "סלונים פתוחים להרשמה" },
              { n: seatsLeft, t: "מקומות פנויים כרגע" },
              { n: new Set(open.map((s) => s.cityId)).size, t: "ערים ויישובים" },
            ].map((s) => (
              <div key={s.t} className="flex items-baseline justify-between rounded-xl border border-line bg-paper px-6 py-5">
                <span className="text-muted">{s.t}</span>
                <span className="text-4xl font-semibold tabular-nums">{s.n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-semibold">איך זה עובד</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { icon: Home, t: "פותחים סלון", d: "בוחרים יום, שעה וכמה אורחים. רואים תצוגה מקדימה של הסלון לפני שמפרסמים." },
            { icon: UsersRound, t: "אנחנו מצוותים עדות", d: "הצוות מתאים עד/ה לפי תאריך, שעה, שפה ומרחק — ותקבלו את הפרטים ישירות לדף הסלון." },
            { icon: Search, t: "אורחים נרשמים", d: "אורחים מוצאים אתכם במפה ונרשמים בצעד אחד. אתם רואים מי מגיע בזמן אמת." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-xl border border-line bg-paper p-6">
              <span className="text-sm text-muted">שלב {i + 1}</span>
              <s.icon className="mt-3 size-7" />
              <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
        <Link href="/salons" className="mt-10 inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline">
          לכל הסלונים <ArrowLeft className="size-4" />
        </Link>
      </section>
    </main>
  );
}
