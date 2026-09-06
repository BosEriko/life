"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { UnitsGate } from "@/components/units-gate";
import { EMPTY_PROFILE, watchProfile, type Profile } from "@/models/profile";
import { DEFAULT_UNITS, type Units } from "@/lib/units";

type UnitsContextValue = {
  units: Units;
  profile: Profile;
  ready: boolean;
};

const UnitsContext = createContext<UnitsContextValue>({
  units: DEFAULT_UNITS,
  profile: EMPTY_PROFILE,
  ready: false,
});

export function useUnits(): Units {
  return useContext(UnitsContext).units;
}

export function useUnitsContext(): UnitsContextValue {
  return useContext(UnitsContext);
}

export function UnitsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchProfile(
      user.uid,
      (next) => {
        setProfile(next);
        setReady(true);
      },
      () => setReady(true),
    );
  }, [user]);

  const units = useMemo<Units>(
    () => ({
      weight: profile.weightUnit ?? DEFAULT_UNITS.weight,
      volume: profile.volumeUnit ?? DEFAULT_UNITS.volume,
      height: profile.heightUnit ?? DEFAULT_UNITS.height,
    }),
    [profile.weightUnit, profile.volumeUnit, profile.heightUnit],
  );

  const needsUnits =
    ready &&
    !!user &&
    (profile.weightUnit == null ||
      profile.volumeUnit == null ||
      profile.heightUnit == null);

  return (
    <UnitsContext.Provider value={{ units, profile, ready }}>
      {children}
      {needsUnits ? <UnitsGate current={units} /> : null}
    </UnitsContext.Provider>
  );
}
