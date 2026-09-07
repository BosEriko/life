"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import { DeleteFilled, DeleteOutlined } from "@ant-design/icons";
import { useBottomToast } from "@/components/use-bottom-toast";

export function ConfirmDeleteButton({
  onConfirm,
  ariaLabel = "Delete",
  hint = "Tap again to delete",
}: {
  onConfirm: () => void;
  ariaLabel?: string;
  hint?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { show, hide, node } = useBottomToast();

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleClick() {
    if (armed) {
      clearTimeout(timer.current);
      setArmed(false);
      hide();
      onConfirm();
      return;
    }
    setArmed(true);
    show(hint, 0);
    timer.current = setTimeout(() => {
      setArmed(false);
      hide();
    }, 3000);
  }

  return (
    <>
      <Button
        type="text"
        size="small"
        danger
        aria-label={armed ? "Confirm delete" : ariaLabel}
        icon={armed ? <DeleteFilled /> : <DeleteOutlined />}
        onClick={handleClick}
      />
      {node}
    </>
  );
}
