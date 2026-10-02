import { TodoWorkspace } from "@/components/todo-workspace";
import { Suspense } from "react";
import { JournalSkeleton } from "@/components/journal-skeleton";

export default function TodoPage() {
  return <Suspense fallback={<JournalSkeleton />}><TodoWorkspace /></Suspense>;
}
