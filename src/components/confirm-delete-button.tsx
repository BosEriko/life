"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import { DeleteFilled, DeleteOutlined } from "@ant-design/icons";
import { Tip } from "@/components/tip";
import { useBottomToast } from "@/components/use-bottom-toast";

export function ConfirmDeleteButton({
  onConfirm,
  ariaLabel = "Delete",
  hint = "Tap again to delete",
  loading = false,
}: {
  onConfirm: () => void;
  ariaLabel?: string;
  hint?: string;
  loading?: boolean;
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
      <Tip title={ariaLabel}>
        <Button
          type="text"
          size="small"
          danger
          loading={loading}
          aria-label={armed ? "Confirm delete" : ariaLabel}
          icon={armed ? <DeleteFilled /> : <DeleteOutlined />}
          onClick={handleClick}
        />
      </Tip>
      {node}
    </>
  );
}
