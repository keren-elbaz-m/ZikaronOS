import type { City, Registration, Salon, SalonDay, Training, Witness } from "./types";

// Demo data only — fictional people, real city coordinates.

export const CITIES: City[] = [
  { id: "tlv", name: "תל אביב-יפו", lat: 32.0809, lng: 34.7806 },
  { id: "jlm", name: "ירושלים", lat: 31.7683, lng: 35.2137 },
  { id: "hfa", name: "חיפה", lat: 32.794, lng: 34.9896 },
  { id: "bsh", name: "באר שבע", lat: 31.2518, lng: 34.7913 },
  { id: "rlz", name: "ראשון לציון", lat: 31.973, lng: 34.7925 },
  { id: "pt", name: "פתח תקווה", lat: 32.0871, lng: 34.8875 },
  { id: "nzr", name: "נצרת עילית", lat: 32.7037, lng: 35.3271 },
  { id: "mdn", name: "מודיעין", lat: 31.8969, lng: 35.0104 },
];

export const LANGUAGES = ["עברית", "English", "Русский", "Français", "Español", "العربية"];

export const SALON_DAYS: SalonDay[] = [
  { date: "2027-04-29", label: "חמישי" },
  { date: "2027-05-01", label: "מוצאי שבת" },
  { date: "2027-05-02", label: "ראשון" },
  { date: "2027-05-03", label: "ערב יום השואה", isDefault: true },
  { date: "2027-05-04", label: "יום השואה" },
  { date: "2027-05-05", label: "רביעי" },
];

export const TRAININGS: Training[] = [
  { id: "t1", date: "2027-04-20T19:00", place: "זום", online: true },
  { id: "t2", date: "2027-04-22T18:30", place: "בית העם, תל אביב", online: false },
  { id: "t3", date: "2027-04-25T20:00", place: "זום", online: true },
];

export const ACCESSIBILITY_LABELS = {
  elevator: "מעלית",
  wheelchair: "נגיש לכיסא גלגלים",
  ground_floor: "קומת קרקע",
} as const;

export const WITNESS_TYPE_LABELS = {
  survivor: "ניצול/ת שואה",
  second_gen: "דור שני",
  third_gen: "דור שלישי",
  expert: "מומחה/ית",
} as const;

const city = (id: string) => CITIES.find((c) => c.id === id)!;
const near = (id: string, dLat: number, dLng: number) => ({ lat: city(id).lat + dLat, lng: city(id).lng + dLng });

const base = { email: "host@example.com", hostedBefore: false, createdAt: "2027-03-01T10:00" };

export const SEED_SALONS: Salon[] = [
  { ...base, id: "s1", hostName: "נועה כהן", phone: "+972526123456", date: "2027-05-03", time: "19:30", digital: false, cityId: "tlv", address: "שדרות רוטשילד 40", floor: "3", apartment: "7", ...near("tlv", -0.017, -0.004), accessibility: ["elevator"], language: "עברית", capacity: 20, isOpen: true, noteForGuests: "נדליק נר ונשמע עדות. אפשר להביא משהו קטן לכיבוד.", wantsWitness: true, hostedBefore: true, trainingId: "t2", witnessId: "w1" },
  { ...base, id: "s2", hostName: "דניאל לוי", phone: "+972545551234", date: "2027-05-03", time: "20:00", digital: false, cityId: "tlv", address: "אבן גבירול 112", ...near("tlv", 0.005, 0.0015), accessibility: ["elevator", "wheelchair"], language: "עברית", capacity: 15, isOpen: true, noteForGuests: "סלון אינטימי, נשב בעיגול ונשוחח אחרי העדות.", wantsWitness: true, trainingId: "t1" },
  { ...base, id: "s3", hostName: "Sarah Miller", phone: "+972523456789", date: "2027-05-02", time: "19:00", digital: false, cityId: "jlm", address: "עמק רפאים 22", ...near("jlm", -0.01, -0.0), accessibility: ["ground_floor"], language: "English", capacity: 12, isOpen: true, noteForGuests: "An English-speaking evening, all are welcome.", wantsWitness: true, trainingId: "t1" },
  { ...base, id: "s4", hostName: "קהילת נווה שאנן", orgName: "מתנ\"ס נווה שאנן", phone: "+97248123456", date: "2027-05-04", time: "11:00", digital: false, cityId: "hfa", address: "דרך חנקין 30", ...near("hfa", -0.01, 0.012), accessibility: ["wheelchair", "ground_floor"], language: "עברית", capacity: 60, isOpen: true, noteForGuests: "מפגש קהילתי פתוח, מתאים גם לבני נוער.", wantsWitness: true, hostedBefore: true, trainingId: "t3" },
  { ...base, id: "s5", hostName: "אולגה פטרוב", phone: "+972546789012", date: "2027-05-03", time: "18:30", digital: false, cityId: "bsh", address: "רגר 50", ...near("bsh", 0.0, 0.0), accessibility: [], language: "Русский", capacity: 14, isOpen: true, noteForGuests: "ערב בשפה הרוסית עם תרגום לעברית.", wantsWitness: false },
  { ...base, id: "s6", hostName: "משפחת אברהם", phone: "+972502345678", date: "2027-05-01", time: "21:00", digital: true, cityId: "mdn", address: "", ...near("mdn", 0, 0), accessibility: [], language: "עברית", capacity: 40, isOpen: true, noteForGuests: "סלון דיגיטלי בזום — הקישור יישלח לנרשמים.", wantsWitness: true, trainingId: "t3" },
  { ...base, id: "s7", hostName: "יוסי מזרחי", phone: "+972528765432", date: "2027-05-03", time: "20:00", digital: false, cityId: "rlz", address: "הרצל 70", ...near("rlz", 0.002, -0.001), accessibility: ["elevator"], language: "עברית", capacity: 10, isOpen: true, noteForGuests: "", wantsWitness: true },
  { ...base, id: "s8", hostName: "מיכל רוזן", phone: "+972533334444", date: "2027-05-04", time: "19:00", digital: false, cityId: "pt", address: "רוטשילד 15", ...near("pt", 0.001, 0.0), accessibility: ["ground_floor"], language: "עברית", capacity: 18, isOpen: false, noteForGuests: "", wantsWitness: false },
];

export const SEED_REGISTRATIONS: Registration[] = [
  { id: "r1", salonId: "s1", name: "אורי שמש", phone: "+972521112222", email: "ori@example.com", seats: 2, createdAt: "2027-04-01T12:00" },
  { id: "r2", salonId: "s1", name: "תמר גל", phone: "+972521113333", email: "tamar@example.com", seats: 3, createdAt: "2027-04-02T12:00" },
  { id: "r3", salonId: "s1", name: "רון בר", phone: "+972521114444", email: "ron@example.com", seats: 3, createdAt: "2027-04-03T12:00" },
  { id: "r4", salonId: "s7", name: "ליה דור", phone: "+972521115555", email: "lia@example.com", seats: 3, createdAt: "2027-04-03T12:00" },
  { id: "r5", salonId: "s7", name: "עמית פז", phone: "+972521116666", email: "amit@example.com", seats: 3, createdAt: "2027-04-04T12:00" },
  { id: "r6", salonId: "s7", name: "גיל נוי", phone: "+972521117777", email: "gil@example.com", seats: 2, createdAt: "2027-04-05T12:00" },
  { id: "r7", salonId: "s4", name: "שירה אל", phone: "+972521118888", email: "shira@example.com", seats: 3, createdAt: "2027-04-05T12:00" },
];

export const SEED_WITNESSES: Witness[] = [
  { id: "w1", name: "חנה ברגר", type: "survivor", cityId: "tlv", ...near("tlv", 0.01, 0.01), languages: ["עברית", "Deutsch"], stairs: true, availability: [{ date: "2027-05-03", slots: ["evening"] }, { date: "2027-05-04", slots: ["morning", "noon"] }], maxSalons: 2, bio: "נולדה בווינה ב-1934, ניצלה בזכות הקינדרטרנספורט." },
  { id: "w2", name: "אברהם שטרן", type: "survivor", cityId: "tlv", ...near("tlv", -0.02, 0.02), languages: ["עברית"], stairs: false, availability: [{ date: "2027-05-03", slots: ["evening"] }], maxSalons: 1, bio: "שרד את גטו לודז' ואת אושוויץ. מספר על החיים שאחרי." },
  { id: "w3", name: "רות אלון", type: "second_gen", cityId: "rlz", ...near("rlz", 0.01, 0.0), languages: ["עברית", "English"], stairs: true, availability: [{ date: "2027-05-03", slots: ["evening"] }, { date: "2027-05-02", slots: ["evening"] }], maxSalons: 3, bio: "בתם של ניצולי טרזינשטט; מספרת את סיפור הוריה ואת השתיקה בבית." },
  { id: "w4", name: "David Klein", type: "expert", cityId: "jlm", ...near("jlm", 0.01, 0.01), languages: ["English", "עברית"], stairs: true, availability: [{ date: "2027-05-02", slots: ["evening"] }, { date: "2027-05-04", slots: ["noon"] }], maxSalons: 3, bio: "Historian at a Jerusalem research institute, specializing in testimony." },
  { id: "w5", name: "יעל נחום", type: "third_gen", cityId: "hfa", ...near("hfa", 0.0, 0.0), languages: ["עברית"], stairs: true, availability: [{ date: "2027-05-04", slots: ["morning", "noon"] }], maxSalons: 2, bio: "נכדה לניצולים, מובילה פרויקט תיעוד בחיפה." },
  { id: "w6", name: "מרים כ\"ץ", type: "survivor", cityId: "mdn", ...near("mdn", 0.0, 0.01), languages: ["עברית", "Français"], stairs: false, availability: [{ date: "2027-05-01", slots: ["evening"] }, { date: "2027-05-03", slots: ["evening"] }], maxSalons: 2, bio: "הוסתרה כילדה בכפר בצרפת; מספרת על חסידי אומות העולם." },
];
