"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, theme } from "antd";
import { DeleteFilled, DeleteOutlined } from "@ant-design/icons";

export function ConfirmDeleteButton({
  onConfirm,
  ariaLabel = "Delete",
  hint = "Tap again to delete",
}: {
  onConfirm: () => void;
  ariaLabel?: string;
  hint?: string;
}) {
  const { token } = theme.useToken();
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleClick() {
    if (armed) {
      clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 3000);
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
      {armed && typeof document !== "undefined"
        ? createPortal(
            <div
              className="confirm-delete-toast"
              style={{
                background: token.colorBgSpotlight,
                color: token.colorTextLightSolid,
                boxShadow: token.boxShadowSecondary,
              }}
            >
              {hint}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
