"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "antd";
import { Tip } from "@/components/tip";
import { useBottomToast } from "@/components/use-bottom-toast";

export function ConfirmActionButton({
  onConfirm,
  hint,
  idleLabel,
  armedLabel,
  icon,
  armedIcon,
  ariaLabel,
  ...buttonProps
}: {
  onConfirm: () => void;
  hint: string;
  idleLabel?: ReactNode;
  armedLabel?: ReactNode;
  icon?: ReactNode;
  armedIcon?: ReactNode;
  ariaLabel?: string;
} & Omit<
  ButtonProps,
  "onClick" | "icon" | "danger" | "children" | "aria-label"
>) {
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
          {...buttonProps}
          aria-label={ariaLabel}
          icon={armed ? (armedIcon ?? icon) : icon}
          danger={armed}
          onClick={handleClick}
        >
          {armed ? armedLabel : idleLabel}
        </Button>
      </Tip>
      {node}
    </>
  );
}
