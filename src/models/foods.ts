import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
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
  note: string | null;
};

export type FoodInput = {
  name: string;
  kind: FoodKind;
  category: string;
  junk: boolean;
  calories?: number | null;
  sodium?: number | null;
  amount?: string | null;
  note?: string | null;
};

function foodsCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "foods");
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
    note: (data.note as string | undefined) ?? null,
  };
}

export function watchFoods(
  uid: string,
  onChange: (foods: FoodItem[]) => void,
  onError: (error: Error) => void,
) {
  const ordered = query(foodsCollection(uid), orderBy("name", "asc"));
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
    createdAt: serverTimestamp(),
  };
  if (input.calories != null) payload.calories = input.calories;
  if (input.sodium != null) payload.sodium = input.sodium;
  if (input.amount != null) payload.amount = input.amount;
  if (input.note != null) payload.note = input.note;
  await addDoc(foodsCollection(uid), payload);
}

export async function deleteFood(uid: string, id: string) {
  await deleteDoc(doc(foodsCollection(uid), id));
}
