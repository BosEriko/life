"use client";

import type { CSSProperties } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBath,
  faBottleWater,
  faBullseye,
  faBurger,
  faCalendarCheck,
  faCalendarDay,
  faChartColumn,
  faChartLine,
  faClockRotateLeft,
  faDroplet,
  faHeartPulse,
  faNoteSticky,
  faPenToSquare,
  faSeedling,
  faSliders,
  faSoap,
  faTooth,
  faTriangleExclamation,
  faWeightScale,
} from "@fortawesome/free-solid-svg-icons";

const ICONS = {
  logEntry: faPenToSquare,
  averages: faChartColumn,
  habits: faCalendarCheck,
  trends: faChartLine,
  recent: faClockRotateLeft,
  date: faCalendarDay,
  weight: faWeightScale,
  bp: faHeartPulse,
  water: faDroplet,
  junkFood: faBurger,
  junkDrink: faBottleWater,
  hygiene: faSoap,
  bath: faBath,
  brush: faTooth,
  notes: faNoteSticky,
  target: faBullseye,
  alert: faTriangleExclamation,
  presets: faSliders,
  brand: faSeedling,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  style,
}: {
  name: IconName;
  style?: CSSProperties;
}) {
  return (
    <FontAwesomeIcon
      icon={ICONS[name]}
      style={{ marginRight: 8, opacity: 0.7, ...style }}
    />
  );
}
