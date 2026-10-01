import { TodoWorkspace } from "@/components/todo-workspace";
import { Suspense } from "react";

export default function TodoPage() {
  return <Suspense fallback={<p>Loading to-dos…</p>}><TodoWorkspace /></Suspense>;
}
