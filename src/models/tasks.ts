import { doc, collection, setDoc, writeBatch, deleteField, onSnapshot, query, where, orderBy, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { Task } from "@/lib/task-schedule";

export type TaskChecks = { date: string; completed: Record<string, boolean> };
const settingsRef = (uid: string) => doc(getFirebaseDb(), "users", uid, "taskSettings", "current");

export function saveTask(uid: string, task: Task) {
  return setDoc(settingsRef(uid), { tasks: { [task.id]: task } }, { merge: true });
}

export function removeTask(uid: string, id: string) {
  return setDoc(settingsRef(uid), { tasks: { [id]: deleteField() } }, { merge: true });
}

export function watchTaskSettings(uid: string, next: (tasks: Task[]) => void, fail: (error: Error) => void) {
  return onSnapshot(settingsRef(uid), (snapshot) => next(Object.values(snapshot.data()?.tasks ?? {})), fail);
}

export function setTaskChecked(uid: string, date: string, id: string, checked: boolean, task?: Task) {
  const batch = writeBatch(getFirebaseDb());
  batch.set(doc(getFirebaseDb(), "users", uid, "taskChecks", date), { date, completed: { [id]: checked } }, { merge: true });
  if (task && (task.repeat === "monthly" || task.repeat === "yearly")) {
    if (checked && (!task.completedThrough || date > task.completedThrough)) {
      batch.set(settingsRef(uid), { tasks: { [id]: { completedThrough: date, previousCompletedThrough: task.completedThrough ?? "" } } }, { merge: true });
    } else if (!checked && task.completedThrough === date) {
      batch.set(settingsRef(uid), { tasks: { [id]: { completedThrough: task.previousCompletedThrough ?? "", previousCompletedThrough: "" } } }, { merge: true });
    }
  }
  return batch.commit();
}

export function mapTaskChecks(snapshot: QueryDocumentSnapshot<DocumentData>): TaskChecks {
  return { date: snapshot.id, completed: snapshot.data().completed ?? {} };
}

export function watchTaskChecks(uid: string, cutoff: string, next: (rows: TaskChecks[]) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(getFirebaseDb(), "users", uid, "taskChecks"), where("date", ">=", cutoff), orderBy("date", "desc")), (snapshot) => next(snapshot.docs.map(mapTaskChecks)), fail);
}

export function watchTaskDay(uid: string, date: string, next: (row: TaskChecks) => void, fail: (error: Error) => void) {
  return onSnapshot(doc(getFirebaseDb(), "users", uid, "taskChecks", date), (snapshot) => next({ date, completed: snapshot.data()?.completed ?? {} }), fail);
}
