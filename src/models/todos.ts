import {
  collection, deleteDoc, deleteField, doc, FieldPath, onSnapshot, orderBy,
  query, setDoc, updateDoc, where, writeBatch, type DocumentData, type QueryDocumentSnapshot,
} from "firebase/firestore";
import dayjs from "dayjs";
import { getFirebaseDb } from "@/lib/firebase";
import { ACTIVE_TODO_DATE, todoMovePatch, todoValidation, type Todo, type TodoColumn, type TodoList } from "@/lib/todos";

const todoRef = (uid: string, id: string) => doc(getFirebaseDb(), "users", uid, "todos", id);
const settingsRef = (uid: string) => doc(getFirebaseDb(), "users", uid, "todoSettings", "current");

function todoData(todo: Todo) {
  return {
    ...todo,
    title: todo.title.trim(),
    description: todo.description.trim(),
    date: todo.status === "done" ? todo.date : ACTIVE_TODO_DATE,
    updatedAt: new Date().toISOString(),
  };
}

export function saveTodo(uid: string, todo: Todo) {
  const error = todoValidation(todo);
  if (error) return Promise.reject(new Error(error));
  return setDoc(todoRef(uid, todo.id), todoData(todo));
}

export function convertNoteToTodo(uid: string, noteId: string, todo: Todo) {
  const error = todoValidation(todo);
  if (error) return Promise.reject(new Error(error));
  const batch = writeBatch(getFirebaseDb());
  batch.set(todoRef(uid, todo.id), todoData(todo));
  batch.delete(doc(getFirebaseDb(), "users", uid, "notes", noteId));
  return batch.commit();
}

export function completeTodo(uid: string, todo: Todo) {
  const now = new Date();
  return updateDoc(todoRef(uid, todo.id), {
    status: "done", date: dayjs(now).format("YYYY-MM-DD"),
    completedAt: now.toISOString(), updatedAt: now.toISOString(),
  });
}

export function restoreTodo(uid: string, id: string) {
  return updateDoc(todoRef(uid, id), {
    status: "todo", date: ACTIVE_TODO_DATE, completedAt: null, updatedAt: new Date().toISOString(),
  });
}

export function moveTodo(uid: string, todo: Todo, column: TodoColumn) {
  return updateDoc(todoRef(uid, todo.id), todoMovePatch(todo, column, new Date()));
}

export function setTodoStatus(uid: string, id: string, status: "todo" | "doing") {
  return updateDoc(todoRef(uid, id), { status, updatedAt: new Date().toISOString() });
}

export function setTodoSubtask(uid: string, id: string, subtaskId: string, done: boolean) {
  return updateDoc(todoRef(uid, id), new FieldPath("subtasks", subtaskId, "done"), done, "updatedAt", new Date().toISOString());
}

export function deleteTodo(uid: string, id: string) {
  return deleteDoc(todoRef(uid, id));
}

export function saveTodoList(uid: string, list: TodoList) {
  if (!list.name.trim() || list.name.trim().length > 60) return Promise.reject(new Error("Enter a list name of up to 60 characters."));
  return setDoc(settingsRef(uid), { lists: { [list.id]: { ...list, name: list.name.trim() } } }, { mergeFields: [new FieldPath("lists", list.id)] });
}

export function deleteTodoList(uid: string, id: string) {
  return setDoc(settingsRef(uid), { lists: { [id]: deleteField() } }, { merge: true });
}

export function watchTodoSettings(uid: string, next: (lists: TodoList[]) => void, fail: (error: Error) => void) {
  return onSnapshot(settingsRef(uid), (snapshot) => next(Object.values(snapshot.data()?.lists ?? {})), fail);
}

export function mapTodoDoc(snapshot: QueryDocumentSnapshot<DocumentData>): Todo {
  return { ...snapshot.data(), id: snapshot.id } as Todo;
}

export function watchTodos(uid: string, cutoff: string, next: (todos: Todo[]) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(getFirebaseDb(), "users", uid, "todos"), where("date", ">=", cutoff), orderBy("date", "desc")), (snapshot) => next(snapshot.docs.map(mapTodoDoc)), fail);
}

export function watchTodosForDate(uid: string, date: string, next: (todos: Todo[]) => void, fail: (error: Error) => void) {
  return onSnapshot(query(collection(getFirebaseDb(), "users", uid, "todos"), where("date", "==", date)), (snapshot) => next(snapshot.docs.map(mapTodoDoc)), fail);
}
