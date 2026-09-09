"use client";

import type { ReactElement, ReactNode } from "react";
import { Tip } from "@/components/tip";
import { rangeText, type IdealRange, type IdealStatus } from "@/models/ideals";

/**
 * Wraps a value with an "above/below your ideal" hover tooltip.
 * - one of isAbove / isBelow → tooltip shown, placed below when below-ideal.
 * - neither, or both, → no tooltip.
 *
 * The `<Tip>` wrapper is always rendered (with an empty title when there's
 * nothing to show) so that toggling the tooltip on/off never swaps the element
 * type around `children` — swapping it would remount the child and, for an
 * input, drop focus mid-typing.
 */
export function IdealTip({
  isAbove = false,
  isBelow = false,
  message,
  children,
}: {
  isAbove?: boolean;
  isBelow?: boolean;
  message?: ReactNode;
  children: ReactElement;
}): ReactElement {
  const show = isAbove !== isBelow && message != null && message !== "";
  return (
    <Tip
      title={show ? message : undefined}
      placement={isBelow ? "bottom" : "top"}
    >
      {children}
    </Tip>
  );
}

export function idealTipProps(
  label: string,
  status: IdealStatus,
  range: IdealRange,
  unit: string,
): { isAbove: boolean; isBelow: boolean; off: boolean; message?: string } {
  const isAbove = status === "high";
  const isBelow = status === "low";
  return {
    isAbove,
    isBelow,
    off: isAbove || isBelow,
    message:
      isAbove || isBelow
        ? `${label} ${isAbove ? "above" : "below"} your ideal (${rangeText(
            range,
          )} ${unit})`
        : undefined,
  };
}
