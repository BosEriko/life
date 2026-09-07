"use client";

import type { CSSProperties } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeftLong,
  faArrowRightLong,
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
  faFireFlameCurved,
  faFlask,
  faHeartPulse,
  faPenToSquare,
  faSeedling,
  faSliders,
  faSoap,
  faTooth,
  faTriangleExclamation,
  faUser,
  faUtensils,
  faWeightScale,
} from "@fortawesome/free-solid-svg-icons";

const ICONS = {
  menuLeft: faArrowLeftLong,
  menuRight: faArrowRightLong,
  logEntry: faPenToSquare,
  averages: faChartColumn,
  habits: faCalendarCheck,
  trends: faChartLine,
  recent: faClockRotateLeft,
  date: faCalendarDay,
  weight: faWeightScale,
  bp: faHeartPulse,
  water: faDroplet,
  calories: faFireFlameCurved,
  sodium: faFlask,
  junkFood: faBurger,
  junkDrink: faBottleWater,
  intake: faUtensils,
  hygiene: faSoap,
  bath: faBath,
  brush: faTooth,
  target: faBullseye,
  alert: faTriangleExclamation,
  presets: faSliders,
  person: faUser,
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
