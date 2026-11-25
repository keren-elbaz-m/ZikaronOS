import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js/max";
import { CITIES, SALON_DAYS } from "./data";
import type { Salon, Slot, Witness } from "./types";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const cityName = (id: string) => CITIES.find((c) => c.id === id)?.name ?? "";

// One time-of-day rule for the whole product (legacy had 07:00 and 08:00 variants).
export const slotOf = (time: string): Slot | null => {
  const h = Number(time.split(":")[0]);
  if (h >= 8 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "noon";
  if (h >= 17) return "evening";
  return null;
};
export const SLOT_LABELS: Record<Slot, string> = { morning: "בוקר", noon: "צהריים", evening: "ערב" };

export const formatDate = (date: string) => {
  const d = new Date(`${date}T12:00`);
  return d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
};
export const shortDate = (date: string) => {
  const [, m, d] = date.split("-");
  return `${Number(d)}.${Number(m)}`;
};
export const dayLabel = (date: string) => SALON_DAYS.find((d) => d.date === date)?.label;

// Same strict rule the server uses — the browser never says "valid" when the API will say "invalid".
export const normalizePhone = (raw: string) => {
  const p = parsePhoneNumberFromString(raw.trim(), "IL");
  return p?.isValid() ? p.number : null;
};
export const isPhone = (raw: string) => isValidPhoneNumber(raw.trim(), "IL");
export const displayPhone = (e164: string) => parsePhoneNumberFromString(e164)?.formatNational() ?? e164;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const seatsTaken = (salonId: string, regs: { salonId: string; seats: number }[]) =>
  regs.filter((r) => r.salonId === salonId).reduce((n, r) => n + r.seats, 0);

export const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export interface Match {
  witness: Witness;
  score: number;
  km: number;
  reasons: { ok: boolean; text: string }[];
  blocked: boolean;
}

// Explainable matching: every score comes with the reasons a coordinator can check.
export const matchWitnesses = (salon: Salon, witnesses: Witness[], load: Record<string, number>): Match[] => {
  const slot = slotOf(salon.time);
  return witnesses
    .map((w) => {
      const day = w.availability.find((a) => a.date === salon.date);
      const dateOk = !!day;
      const slotOk = !!day && !!slot && day.slots.includes(slot);
      const langOk = w.languages.includes(salon.language);
      const km = distanceKm(salon, w);
      const stairsOk = w.stairs || salon.digital || salon.accessibility.includes("elevator") || salon.accessibility.includes("ground_floor");
      const capacityOk = (load[w.id] ?? 0) < w.maxSalons;
      const reasons = [
        { ok: dateOk && slotOk, text: dateOk ? (slotOk ? `פנוי/ה ב${SLOT_LABELS[slot!]} ${shortDate(salon.date)}` : `פנוי/ה ב-${shortDate(salon.date)} אבל לא ב${slot ? SLOT_LABELS[slot] : "שעה זו"}`) : `לא פנוי/ה ב-${shortDate(salon.date)}` },
        { ok: langOk, text: langOk ? `מדבר/ת ${salon.language}` : `לא מדבר/ת ${salon.language}` },
        { ok: salon.digital || km < 25, text: salon.digital ? "סלון דיגיטלי — מרחק לא רלוונטי" : `${km.toFixed(1)} ק״מ מהסלון` },
        { ok: stairsOk, text: stairsOk ? "נגישות מתאימה" : "צריך/ה מעלית או קומת קרקע" },
        { ok: capacityOk, text: capacityOk ? `${load[w.id] ?? 0}/${w.maxSalons} סלונים השנה` : "הגיע/ה למכסת הסלונים" },
      ];
      const blocked = !(dateOk && slotOk) || !stairsOk || !capacityOk;
      const score = (dateOk && slotOk ? 50 : 0) + (langOk ? 20 : 0) + (stairsOk ? 10 : 0) + (salon.digital ? 20 : Math.max(0, 20 - km)) + (capacityOk ? 0 : -100);
      return { witness: w, score: Math.round(score), km, reasons, blocked };
    })
    .sort((a, b) => Number(a.blocked) - Number(b.blocked) || b.score - a.score);
};

export const icsFor = (salon: Salon) => {
  const [y, m, d] = salon.date.split("-");
  const [hh, mm] = salon.time.split(":");
  const start = `${y}${m}${d}T${hh}${mm}00`;
  const endH = String(Math.min(23, Number(hh) + 2)).padStart(2, "0");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Zikaron BaSalon//Prototype//HE", "BEGIN:VEVENT",
    `UID:${salon.id}@zikaronbasalon.example`, `DTSTART;TZID=Asia/Jerusalem:${start}`, `DTEND;TZID=Asia/Jerusalem:${y}${m}${d}T${endH}${mm}00`,
    `SUMMARY:זיכרון בסלון — הסלון של ${salon.hostName}`,
    `LOCATION:${salon.digital ? "סלון דיגיטלי" : `${salon.address}, ${cityName(salon.cityId)}`}`,
    "END:VEVENT", "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
};
