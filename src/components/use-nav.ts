"use client";

import { NAV, PROFILE_SUBMENU, SUBMENUS, type SubmenuTab } from "@/components/nav-items";
import { useUnitsContext } from "@/components/units-provider";
import { isSubmenuSection, orderBy, type SubmenuSection } from "@/lib/nav-order";

export type OrderedSubmenu = { section: string; label: string; tabs: (SubmenuTab & { id: string })[] };

export function useNav() {
  const { profile } = useUnitsContext();
  const ordered = (section: SubmenuSection): OrderedSubmenu => ({
    section,
    label: SUBMENUS[section].label,
    tabs: orderBy(SUBMENUS[section].tabs.map((tab) => ({ ...tab, id: tab.href.split("/")[2] })), profile.submenuOrder[section]),
  });
  const submenus: Record<SubmenuSection, OrderedSubmenu> = { journal: ordered("journal"), finance: ordered("finance"), records: ordered("records") };
  const items = orderBy(NAV, profile.navOrder).map((item) => (isSubmenuSection(item.id) ? { ...item, key: submenus[item.id].tabs[0].href } : item));
  const submenuFor = (pathname: string) => {
    const section = pathname.split("/")[1];
    if (isSubmenuSection(section)) return submenus[section];
    if (section === "personal") return { section, label: PROFILE_SUBMENU.label, tabs: PROFILE_SUBMENU.tabs.map((tab) => ({ ...tab, id: tab.href })) };
    return undefined;
  };
  return { items, home: items[0].key, submenus, submenuFor };
}
