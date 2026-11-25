"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; label: string; home: string }[] = [
  { role: "guest", label: "אורח/ת", home: "/salons" },
  { role: "host", label: "מארח/ת", home: "/host" },
  { role: "admin", label: "צוות", home: "/admin" },
];

const NAV: Record<Role, { href: string; label: string }[]> = {
  guest: [
    { href: "/salons", label: "מציאת סלון" },
    { href: "/guest", label: "ההרשמות שלי" },
  ],
  host: [
    { href: "/host", label: "הסלון שלי" },
    { href: "/host/new", label: "פתיחת סלון" },
  ],
  admin: [
    { href: "/admin", label: "לוח בקרה" },
    { href: "/admin/salons", label: "סלונים" },
    { href: "/admin/teaming", label: "ציוות עדים" },
  ],
};

export function Logo() {
  return (
    <span className="relative inline-grid size-11 place-items-center bg-brand text-[13px] font-semibold leading-[1.05] text-ink">
      <span className="text-center">זיכרון<br />בסלון</span>
      <span className="absolute bottom-0 left-0 size-2.5 bg-ink [clip-path:polygon(0_0,100%_100%,0_100%)]" />
    </span>
  );
}

export function SiteHeader() {
  const { session, setRole, reset } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  // The page you're on decides the demo role, so deep links always show the right menu.
  const pathRole: Role | null = pathname.startsWith("/admin") ? "admin" : pathname.startsWith("/host") ? "host" : pathname.startsWith("/guest") ? "guest" : null;
  useEffect(() => {
    if (pathRole && pathRole !== session.role) setRole(pathRole);
  }, [pathRole, session.role, setRole]);

  return (
    <header className="sticky top-0 z-[1000] border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-3" aria-label="דף הבית">
          <Logo />
        </Link>
        <nav className="hidden gap-1 md:flex">
          {NAV[session.role].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium hover:bg-cream",
                (pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href + "/"))) && "bg-cream",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted sm:inline">הדגמה בתור</span>
          <div className="flex rounded-lg border border-line bg-cream p-0.5" role="radiogroup" aria-label="תפקיד בהדגמה">
            {ROLES.map((r) => (
              <button
                key={r.role}
                role="radio"
                aria-checked={session.role === r.role}
                onClick={() => {
                  setRole(r.role);
                  router.push(r.home);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium sm:text-sm",
                  session.role === r.role ? "bg-paper shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              reset();
              router.push("/");
            }}
            title="איפוס נתוני ההדגמה"
            aria-label="איפוס נתוני ההדגמה"
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-cream hover:text-ink"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-1.5 md:hidden">
        {NAV[session.role].map((n) => (
          <Link key={n.href} href={n.href} className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm", pathname === n.href && "bg-cream font-medium")}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
