"use client";

import { Grid, Tooltip, type TooltipProps } from "antd";

export function Tip(props: TooltipProps) {
  const screens = Grid.useBreakpoint();
  const touch = screens.md === false;

  return (
    <Tooltip {...props} trigger={touch ? "click" : (props.trigger ?? "hover")} />
  );
}
