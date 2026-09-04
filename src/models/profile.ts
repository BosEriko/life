import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export type Sex = "male" | "female" | "unspecified";

export type Profile = {
  name: string | null;
  birthday: string | null;
  heightFeet: number | null;
  heightInches: number | null;
  sex: Sex | null;
  timezone: string | null;
};

export type ProfileInput = Partial<Profile>;

export const EMPTY_PROFILE: Profile = {
  name: null,
  birthday: null,
  heightFeet: null,
  heightInches: null,
  sex: null,
  timezone: null,
};

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
