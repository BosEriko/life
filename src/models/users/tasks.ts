import { doc, collection, setDoc, writeBatch, FieldPath, deleteField, onSnapshot, query, where, orderBy, type WriteBatch, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { allTaskSubtasksDone, type SubtaskChecks, type Task } from "@/lib/task-schedule";

export type TaskChecks = { date: string; completed: Record<string, boolean>; subtasks?: Record<string, SubtaskChecks> };
const settingsRef = (uid: string) => doc(getFirebaseDb(), "users", uid, "taskSettings", "current");

export function saveTask(uid: string, task: Task) {
  const definition = { ...task };
  delete definition.subtaskProgress;
  return setDoc(settingsRef(uid), { tasks: { [task.id]: definition } }, { merge: true });
}

export function removeTask(uid: string, id: string) {
  return setDoc(settingsRef(uid), { tasks: { [id]: deleteField() } }, { merge: true });
}

export function watchTaskSettings(uid: string, next: (tasks: Task[]) => void, fail: (error: Error) => void) {
  return onSnapshot(settingsRef(uid), (snapshot) => next(Object.values(snapshot.data()?.tasks ?? {})), fail);
}

function writeTaskChecked(batch: WriteBatch, uid: string, date: string, id: string, checked: boolean, task?: Task) {
  batch.set(doc(getFirebaseDb(), "users", uid, "taskChecks", date), { date, completed: { [id]: checked } }, { merge: true });
  if (task && (task.repeat === "monthly" || task.repeat === "yearly")) {
    if (checked && (!task.completedThrough || date > task.completedThrough)) {
      batch.set(settingsRef(uid), { tasks: { [id]: { completedThrough: date, previousCompletedThrough: task.completedThrough ?? "" } } }, { merge: true });
    } else if (!checked && task.completedThrough === date) {
      batch.set(settingsRef(uid), { tasks: { [id]: { completedThrough: task.previousCompletedThrough ?? "", previousCompletedThrough: "" } } }, { merge: true });
    }
  }
}

export function setTaskChecked(uid: string, date: string, id: string, checked: boolean, task?: Task, subtasks: SubtaskChecks = {}) {
  if (checked && task && !allTaskSubtasksDone(task, subtasks)) return Promise.reject(new Error("Complete all subtasks first."));
  const batch = writeBatch(getFirebaseDb());
  writeTaskChecked(batch, uid, date, id, checked, task);
  if (checked && task?.subtasks?.length) batch.set(doc(getFirebaseDb(), "users", uid, "taskChecks", date), { date, subtasks: { [id]: subtasks } }, { merge: true });
  return batch.commit();
}

export function setTaskSubtaskChecked(uid: string, date: string, task: Task, id: string, checked: boolean, completed: SubtaskChecks) {
  if (!task.subtasks?.some((subtask) => subtask.id === id)) return Promise.reject(new Error("Subtask does not exist."));
  const next = Object.fromEntries(task.subtasks.map((subtask) => [subtask.id, subtask.id === id ? checked : !!completed[subtask.id]]));
  const batch = writeBatch(getFirebaseDb());
  batch.set(doc(getFirebaseDb(), "users", uid, "taskChecks", date), { date, subtasks: { [task.id]: next } }, { merge: true });
  if (!checked) writeTaskChecked(batch, uid, date, task.id, false, task);
  if ((task.repeat === "monthly" || task.repeat === "yearly") && (!task.completedThrough || date >= task.completedThrough) && (!task.subtaskProgress || date >= task.subtaskProgress.date)) {
    const since = !checked && task.completedThrough === date ? task.previousCompletedThrough ?? "" : task.completedThrough ?? "";
    batch.update(settingsRef(uid), new FieldPath("tasks", task.id, "subtaskProgress"), { date, since, completed: next });
  }
  return batch.commit();
}

export function mapTaskChecks(snapshot: QueryDocumentSnapshot<DocumentData>): TaskChecks {
  return { date: snapshot.id, completed: snapshot.data().completed ?? {}, subtasks: snapshot.data().subtasks ?? {} };
}

export function watchTaskChecks(uid: string, cutoff: string, next: (rows: TaskChecks[]) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(getFirebaseDb(), "users", uid, "taskChecks"), where("date", ">=", cutoff), orderBy("date", "desc")), (snapshot) => next(snapshot.docs.map(mapTaskChecks)), fail);
}

export function watchTaskDay(uid: string, date: string, next: (row: TaskChecks) => void, fail: (error: Error) => void) {
  return onSnapshot(doc(getFirebaseDb(), "users", uid, "taskChecks", date), (snapshot) => next({ date, completed: snapshot.data()?.completed ?? {}, subtasks: snapshot.data()?.subtasks ?? {} }), fail);
}
