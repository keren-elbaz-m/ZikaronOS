export type Slot = "morning" | "noon" | "evening";
export type Role = "guest" | "host" | "admin";
export type WitnessType = "survivor" | "second_gen" | "third_gen" | "expert";
export type Accessibility = "elevator" | "wheelchair" | "ground_floor";

export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface SalonDay {
  date: string; // YYYY-MM-DD
  label: string;
  isDefault?: boolean;
}

export interface Training {
  id: string;
  date: string; // ISO
  place: string;
  online: boolean;
}

export interface Salon {
  id: string;
  hostName: string;
  orgName?: string;
  phone: string;
  email: string;
  date: string;
  time: string; // HH:mm
  digital: boolean;
  cityId: string;
  address: string;
  floor?: string;
  apartment?: string;
  lat: number;
  lng: number;
  accessibility: Accessibility[];
  language: string;
  capacity: number;
  isOpen: boolean;
  noteForGuests: string;
  wantsWitness: boolean;
  hostedBefore: boolean;
  trainingId?: string;
  witnessId?: string;
  createdAt: string;
  // Staff follow-up
  hostContacted?: boolean;
  attendedPreparation?: boolean;
}

export interface Note {
  id: string;
  subject: { kind: "salon" | "witness"; id: string };
  text: string;
  author: string;
  createdAt: string;
}

export type WitnessStatus = "not_contacted" | "no_answer" | "available" | "not_available" | "archived";

export interface Registration {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  email: string;
  seats: number;
  createdAt: string;
}

export interface Witness {
  id: string;
  name: string;
  type: WitnessType;
  phone: string;
  status: WitnessStatus;
  lastContactAt?: string;
  cityId: string;
  lat: number;
  lng: number;
  languages: string[];
  stairs: boolean;
  availability: { date: string; slots: Slot[] }[];
  maxSalons: number;
  bio: string;
}

export interface Session {
  role: Role;
  hostSalonId?: string;
  guestRegistrationIds: string[];
}
