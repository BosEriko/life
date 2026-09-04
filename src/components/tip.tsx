"use client";

import { Grid, Tooltip, type TooltipProps } from "antd";

export function Tip(props: TooltipProps) {
  const screens = Grid.useBreakpoint();

  if (screens.md === false) {
    return <>{props.children}</>;
  }

  return <Tooltip {...props} />;
}
