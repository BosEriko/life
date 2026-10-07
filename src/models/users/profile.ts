import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { EMPTY_ONBOARDING, readOnboarding, type Onboarding, type OnboardingSection } from "@/lib/onboarding";
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
};

export type ProfileInput = Partial<Omit<Profile, "onboarding">>;

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
