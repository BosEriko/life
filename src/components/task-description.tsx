"use client";

import { RichText } from "@/components/rich-text";
import { RichTextView } from "@/components/rich-text-view";
import type { Task } from "@/lib/task-schedule";

export function TaskDescription({ task }: { task: Task }) {
  if (task.descriptionHtml) return <RichTextView html={task.descriptionHtml} text={task.description} />;
  return <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><RichText text={task.description} /></div>;
}
