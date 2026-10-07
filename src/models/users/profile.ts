import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { EMPTY_ONBOARDING, readOnboarding, type Onboarding, type OnboardingSection } from "@/lib/onboarding";
import { NAV_IDS, readNavOrder, readOrder, readSubmenuOrder, SUBMENU_IDS, type NavId, type SubmenuOrder, type SubmenuSection } from "@/lib/nav-order";
import {
  isHeightUnit,
  isVolumeUnit,
  isWeightUnit,
  type HeightUnit,
  type VolumeUnit,
  type WeightUnit,
} from "@/lib/units";

export type Sex = "male" | "female" | "unspecified";

export type Profile = {
  name: string | null;
  birthday: string | null;
  heightFeet: number | null;
  heightInches: number | null;
  sex: Sex | null;
  timezone: string | null;
  weightUnit: WeightUnit | null;
  volumeUnit: VolumeUnit | null;
  heightUnit: HeightUnit | null;
  onboarding: Onboarding;
  navOrder: NavId[];
  submenuOrder: SubmenuOrder;
};

export type ProfileInput = Partial<Omit<Profile, "onboarding" | "navOrder" | "submenuOrder">>;

export const EMPTY_PROFILE: Profile = {
  name: null,
  birthday: null,
  heightFeet: null,
  heightInches: null,
  sex: null,
  timezone: null,
  weightUnit: null,
  volumeUnit: null,
  heightUnit: null,
  onboarding: EMPTY_ONBOARDING,
  navOrder: [...NAV_IDS],
  submenuOrder: readSubmenuOrder(undefined),
};

export function hasUnits(profile: Profile): boolean {
  return (
    profile.weightUnit != null &&
    profile.volumeUnit != null &&
    profile.heightUnit != null
  );
}

function profileDoc(uid: string) {
  return doc(getFirebaseDb(), "users", uid, "profile", "current");
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function readSex(value: unknown): Sex | null {
  return value === "male" || value === "female" || value === "unspecified"
    ? value
    : null;
}

export function watchProfile(
  uid: string,
  onChange: (profile: Profile) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    profileDoc(uid),
    (snapshot) => {
      const data = snapshot.data() ?? {};
      onChange({
        name: readString(data.name),
        birthday: readString(data.birthday),
        heightFeet: readNumber(data.heightFeet),
        heightInches: readNumber(data.heightInches),
        sex: readSex(data.sex),
        timezone: readString(data.timezone),
        weightUnit: isWeightUnit(data.weightUnit) ? data.weightUnit : null,
        volumeUnit: isVolumeUnit(data.volumeUnit) ? data.volumeUnit : null,
        heightUnit: isHeightUnit(data.heightUnit) ? data.heightUnit : null,
        onboarding: readOnboarding(data.onboarding),
        navOrder: readNavOrder(data.navOrder),
        submenuOrder: readSubmenuOrder(data.submenuOrder),
      });
    },
    onError,
  );
}

export async function saveProfile(uid: string, input: ProfileInput) {
  await setDoc(
    profileDoc(uid),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function saveOnboarding(
  uid: string,
  patch: Partial<Omit<Onboarding, "introsDismissed">> & { introsDismissed?: Partial<Record<OnboardingSection, boolean>> },
) {
  return setDoc(
    profileDoc(uid),
    { onboarding: patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function saveNavOrder(uid: string, order: NavId[]) {
  return setDoc(
    profileDoc(uid),
    { navOrder: readNavOrder(order), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function saveSubmenuOrder(uid: string, section: SubmenuSection, order: string[]) {
  return setDoc(
    profileDoc(uid),
    { submenuOrder: { [section]: readOrder(order, SUBMENU_IDS[section]) }, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
