"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SEED_REGISTRATIONS, SEED_SALONS, SEED_WITNESSES } from "./data";
import type { Registration, Role, Salon, Session, Witness } from "./types";

interface State {
  salons: Salon[];
  registrations: Registration[];
  witnesses: Witness[];
  session: Session;
}

const KEY = "zikaron-prototype-v1";
const initial = (): State => ({
  salons: SEED_SALONS,
  registrations: SEED_REGISTRATIONS,
  witnesses: SEED_WITNESSES,
  session: { role: "guest", guestRegistrationIds: [] },
});

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

interface Store extends State {
  ready: boolean;
  setRole: (role: Role) => void;
  createSalon: (s: Omit<Salon, "id" | "createdAt">) => string;
  updateSalon: (id: string, patch: Partial<Salon>) => void;
  deleteSalon: (id: string) => void;
  register: (r: Omit<Registration, "id" | "createdAt">) => string;
  cancelRegistration: (id: string) => void;
  assignWitness: (salonId: string, witnessId: string | undefined) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const setRole = useCallback((role: Role) => setState((s) => ({ ...s, session: { ...s.session, role } })), []);

  const createSalon: Store["createSalon"] = useCallback((data) => {
    const id = uid("s");
    setState((s) => ({
      ...s,
      salons: [...s.salons, { ...data, id, createdAt: new Date().toISOString() }],
      session: { ...s.session, role: "host", hostSalonId: id },
    }));
    return id;
  }, []);

  const updateSalon: Store["updateSalon"] = useCallback(
    (id, patch) => setState((s) => ({ ...s, salons: s.salons.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    [],
  );

  const deleteSalon: Store["deleteSalon"] = useCallback(
    (id) =>
      setState((s) => ({
        ...s,
        salons: s.salons.filter((x) => x.id !== id),
        registrations: s.registrations.filter((r) => r.salonId !== id),
        session: { ...s.session, hostSalonId: s.session.hostSalonId === id ? undefined : s.session.hostSalonId },
      })),
    [],
  );

  const register: Store["register"] = useCallback((data) => {
    const id = uid("r");
    setState((s) => ({
      ...s,
      registrations: [...s.registrations, { ...data, id, createdAt: new Date().toISOString() }],
      session: { ...s.session, role: "guest", guestRegistrationIds: [...s.session.guestRegistrationIds, id] },
    }));
    return id;
  }, []);

  const cancelRegistration: Store["cancelRegistration"] = useCallback(
    (id) =>
      setState((s) => ({
        ...s,
        registrations: s.registrations.filter((r) => r.id !== id),
        session: { ...s.session, guestRegistrationIds: s.session.guestRegistrationIds.filter((x) => x !== id) },
      })),
    [],
  );

  const assignWitness: Store["assignWitness"] = useCallback(
    (salonId, witnessId) => setState((s) => ({ ...s, salons: s.salons.map((x) => (x.id === salonId ? { ...x, witnessId } : x)) })),
    [],
  );

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    setState(initial());
  }, []);

  const value = useMemo(
    () => ({ ...state, ready, setRole, createSalon, updateSalon, deleteSalon, register, cancelRegistration, assignWitness, reset }),
    [state, ready, setRole, createSalon, updateSalon, deleteSalon, register, cancelRegistration, assignWitness, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
};
