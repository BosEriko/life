import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type QueryConstraint,
  type Timestamp,
} from "firebase/firestore";
import dayjs from "dayjs";
import { getFirebaseDb } from "@/lib/firebase";

export type Note = {
  id: string;
  text: string;
  date: string;
  time: string;
  createdAt: Timestamp | null;
};

export type NoteInput = {
  text: string;
  date: string;
  time: string;
};

function notesCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "notes");
}

export function formatNoteTime(dateKey: string, time: string): string {
  return dayjs(`${dateKey}T${time}`).format("h:mm A");
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) =>
    `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
  );
}

export function watchNotes(
  uid: string,
  onChange: (notes: Note[]) => void,
  onError: (error: Error) => void,
  max: number | null = 500,
) {
  const constraints: QueryConstraint[] = [orderBy("date", "desc")];
  if (max != null) constraints.push(limit(max));
  const recent = query(notesCollection(uid), ...constraints);
  return onSnapshot(
    recent,
    (snapshot) => {
      onChange(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            text: (data.text as string | undefined) ?? "",
            date: (data.date as string | undefined) ?? "",
            time: (data.time as string | undefined) ?? "",
            createdAt: (data.createdAt as Timestamp | undefined) ?? null,
          };
        }),
      );
    },
    onError,
  );
}

export async function addNote(uid: string, input: NoteInput) {
  await addDoc(notesCollection(uid), {
    ...input,
    createdAt: serverTimestamp(),
  });
}

export async function deleteNote(uid: string, id: string) {
  await deleteDoc(doc(notesCollection(uid), id));
}

export async function moveNoteToDate(uid: string, id: string, date: string) {
  await updateDoc(doc(notesCollection(uid), id), { date });
}
