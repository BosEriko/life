"use client";

import { useEffect, useState } from "react";
import { App, Checkbox, Flex, Tag, Typography, theme } from "antd";
import { FlagOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { RichText, plainText } from "@/components/rich-text";
import { allTaskSubtasksDone, formatTaskTime, overdueTasks, pendingTaskDate, taskSubtaskChecks, type Task } from "@/lib/task-schedule";
import { filterTodos, isTodoOverdue, type Todo } from "@/lib/todos";
import { setTaskChecked } from "@/models/users/tasks";
import { completeTodo } from "@/models/users/todos";
import { TaskSubtasks } from "@/components/task-subtasks";
import { TaskDescription } from "@/components/task-description";

export const TASK_REMINDER_HINT = "Today’s remaining tasks (including unfinished monthly or yearly ones) and to-dos due today or overdue. The number on the bell counts tasks whose time has arrived plus those to-dos.";

export function useTodayAgenda(): { date: string; now: Date | null; tasks: Task[]; dueNow: Set<string>; todos: Todo[]; attention: number } {
  const { tasks, taskChecks, tasksReady, taskChecksReady, todos, todoLists, todosReady } = useHealthData();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(document.visibilityState === "visible" ? new Date() : null);
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const date = now ? dayjs(now).format("YYYY-MM-DD") : "";
  const completed = taskChecks.find((row) => row.date === date)?.completed ?? {};
  const tasksLoaded = !!now && tasksReady && taskChecksReady;
  const today = tasksLoaded ? tasks.filter((task) => !completed[task.id] && pendingTaskDate(task, date, taskChecks)).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title)) : [];
  const dueNow = new Set(tasksLoaded && now ? overdueTasks(tasks, completed, now, taskChecks).map((task) => task.id) : []);
  const todayTodos = now && todosReady ? filterTodos(todos, todoLists, { view: "today", listId: "all", search: "", priority: "all", status: "all", sort: "due", now }) : [];
  return { date, now, tasks: today, dueNow, todos: todayTodos, attention: dueNow.size + todayTodos.length };
}

export function TaskReminderList({ date, overdue, dueNow }: { date: string; overdue: Task[]; dueNow?: Set<string> }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { taskChecks } = useHealthData();

  return (
    <Flex vertical>
      {overdue.map((task, index) => {
        const subtasks = taskSubtaskChecks(task, date, taskChecks);
        return (
          <Flex
            key={`${date}:${task.id}`}
            align="flex-start"
            gap={12}
            style={{ padding: "14px 0", borderTop: index > 0 ? `1px solid ${token.colorBorderSecondary}` : undefined }}
          >
            <Checkbox
              aria-label={`Mark ${plainText(task.title)} as done`}
              checked={false}
              disabled={!allTaskSubtasksDone(task, subtasks)}
              onChange={() => {
                if (user) setTaskChecked(user.uid, date, task.id, true, task, subtasks).catch(() => message.error("Could not update task."));
              }}
            />
            <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
              <Flex align="baseline" justify="space-between" gap={8} wrap>
                <Typography.Text strong style={{ flex: "1 1 140px", minWidth: 0 }}><RichText text={task.title} /></Typography.Text>
                <Typography.Text style={{ fontSize: 12, whiteSpace: "nowrap", color: dueNow?.has(task.id) ? token.colorPrimary : token.colorTextSecondary, fontWeight: dueNow?.has(task.id) ? 700 : 400 }}>
                  {dueNow?.has(task.id) ? "Now · " : ""}{formatTaskTime(task.time)}
                </Typography.Text>
              </Flex>
              {task.description && (
                <details className="task-reminders-details" style={{ color: token.colorTextSecondary }}>
                  <summary>Details</summary>
                  <div style={{ marginTop: 8 }}><TaskDescription task={task} /></div>
                </details>
              )}
              <TaskSubtasks task={task} date={date} completed={subtasks} compact />
            </div>
          </Flex>
        );
      })}
    </Flex>
  );
}

export function TodayTodoList({ todos, now }: { todos: Todo[]; now: Date | null }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  return (
    <Flex vertical>
      {todos.map((todo, index) => {
        const overdue = now ? isTodoOverdue(todo, now) && todo.dueDate !== dayjs(now).format("YYYY-MM-DD") : false;
        return (
          <Flex key={todo.id} align="flex-start" gap={12} style={{ padding: "14px 0", borderTop: index > 0 ? `1px solid ${token.colorBorderSecondary}` : undefined }}>
            <Checkbox
              aria-label={`Complete ${todo.title}`}
              checked={false}
              onChange={() => {
                if (user) completeTodo(user.uid, todo).catch(() => message.error("Could not complete to-do."));
              }}
            />
            <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
              <Flex align="baseline" justify="space-between" gap={8} wrap>
                <Typography.Text strong style={{ flex: "1 1 140px", minWidth: 0 }}>{todo.title}</Typography.Text>
                <Typography.Text style={{ fontSize: 12, whiteSpace: "nowrap", color: overdue ? token.colorError : token.colorTextSecondary, fontWeight: overdue ? 700 : 400 }}>
                  {overdue ? `Overdue · ${dayjs(todo.dueDate).format("MMM D")}` : todo.dueTime ? `Today · ${todo.dueTime}` : "Today"}
                </Typography.Text>
              </Flex>
              {todo.priority !== "none" && (
                <Tag color={todo.priority === "high" ? "red" : todo.priority === "medium" ? "gold" : "blue"} style={{ marginTop: 6 }}>
                  <FlagOutlined /> {todo.priority}
                </Tag>
              )}
            </div>
          </Flex>
        );
      })}
    </Flex>
  );
}
