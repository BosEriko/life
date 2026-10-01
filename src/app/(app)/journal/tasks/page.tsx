"use client";

import { useState } from "react";
import { Button, Card, theme } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { PageHeading } from "@/components/page-heading";
import { AddTaskModal, TasksList } from "@/components/tasks-card";

export default function TasksPage() {
  const { token } = theme.useToken();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div>
      <PageHeading
        title="Tasks"
        subtitle="Build your routine, then check it off each day."
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Add task
          </Button>
        }
      />
      <Card styles={{ body: { padding: 20 } }} style={{ boxShadow: token.boxShadowTertiary }}>
        <TasksList />
      </Card>
      <AddTaskModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
