import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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
  addedBy: string | null;
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
    addedBy: (data.addedBy as string | undefined) ?? null,
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

export async function addFood(
  uid: string,
  input: FoodInput,
): Promise<string> {
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
  const ref = await addDoc(foodsCollection(), payload);
  return ref.id;
}

export async function updateFood(id: string, input: FoodInput) {
  await updateDoc(doc(foodsCollection(), id), {
    name: input.name,
    kind: input.kind,
    category: input.category,
    junk: input.junk,
    calories: input.calories ?? null,
    sodium: input.sodium ?? null,
    amount: input.amount ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFood(id: string) {
  await deleteDoc(doc(foodsCollection(), id));
}
