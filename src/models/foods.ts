import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase";

export type FoodKind = "food" | "drink";

export const FOOD_CATEGORIES = [
  "Meal",
  "Snack",
  "Dessert / sweets",
  "Fast food",
  "Fried",
  "Fruit / veg",
  "Other",
];

export const DRINK_CATEGORIES = [
  "Coffee",
  "Tea",
  "Soda",
  "Juice",
  "Alcohol",
  "Energy drink",
  "Milk",
  "Other",
];

export type FoodItem = {
  id: string;
  name: string;
  kind: FoodKind;
  category: string;
  junk: boolean;
  calories: number | null;
  sodium: number | null;
  amount: string | null;
};

export type FoodInput = {
  name: string;
  kind: FoodKind;
  category: string;
  junk: boolean;
  calories?: number | null;
  sodium?: number | null;
  amount?: string | null;
};

function foodsCollection() {
  return collection(getFirebaseDb(), "foods");
}

export function mapFoodDoc(snap: QueryDocumentSnapshot<DocumentData>): FoodItem {
  const data = snap.data();
  return {
    id: snap.id,
    name: (data.name as string | undefined) ?? "",
    kind: (data.kind as FoodKind | undefined) ?? "food",
    category: (data.category as string | undefined) ?? "",
    junk: (data.junk as boolean | undefined) ?? false,
    calories: (data.calories as number | undefined) ?? null,
    sodium: (data.sodium as number | undefined) ?? null,
    amount: (data.amount as string | undefined) ?? null,
  };
}

export function watchFoods(
  onChange: (foods: FoodItem[]) => void,
  onError: (error: Error) => void,
) {
  const ordered = query(foodsCollection(), orderBy("name", "asc"));
  return onSnapshot(
    ordered,
    (snapshot) => onChange(snapshot.docs.map(mapFoodDoc)),
    onError,
  );
}

export async function addFood(uid: string, input: FoodInput) {
  const payload: Record<string, unknown> = {
    name: input.name,
    kind: input.kind,
    category: input.category,
    junk: input.junk,
    addedBy: uid,
    createdAt: serverTimestamp(),
  };
  if (input.calories != null) payload.calories = input.calories;
  if (input.sodium != null) payload.sodium = input.sodium;
  if (input.amount != null) payload.amount = input.amount;
  await addDoc(foodsCollection(), payload);
}

export async function deleteFood(user: User, id: string) {
  const token = await user.getIdToken();
  const res = await fetch(`/api/foods/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status}).`);
  }
}
