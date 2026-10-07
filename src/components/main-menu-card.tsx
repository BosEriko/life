"use client";

import { App, Card, Flex, Tag, Typography, theme } from "antd";
import { HolderOutlined, HomeOutlined, MenuOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/auth-provider";
import type { NavItem } from "@/components/nav-items";
import { SortableList } from "@/components/sortable-list";
import { useIsDark } from "@/components/theme-provider";
import { useNav, type OrderedSubmenu } from "@/components/use-nav";
import { accentColor } from "@/lib/accents";
import { isSubmenuSection, readNavOrder, type SubmenuSection } from "@/lib/nav-order";
import { saveNavOrder, saveSubmenuOrder } from "@/models/users/profile";

export function MainMenuCard() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const isDark = useIsDark();
  const { items, submenus } = useNav();
  const byId = new Map(items.map((item) => [item.id, item]));

  function saveMenu(order: string[]) {
    if (!user) return;
    saveNavOrder(user.uid, readNavOrder(order)).catch(() => message.error("Could not save your menu order."));
  }

  function savePages(section: SubmenuSection, order: string[]) {
    if (!user) return;
    saveSubmenuOrder(user.uid, section, order).catch(() => message.error("Could not save your page order."));
  }

  const iconBox = (item: NavItem) => {
    const color = accentColor(item.accent, isDark);
    return (
      <span aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 9, color, background: `color-mix(in srgb, ${color} ${isDark ? 20 : 14}%, ${token.colorBgContainer})` }}>
        <item.Icon />
      </span>
    );
  };

  const header = (item: NavItem, home: boolean) => (
    <Flex align="center" gap={12}>
      <HolderOutlined aria-hidden style={{ color: token.colorTextTertiary }} />
      {iconBox(item)}
      <Typography.Text strong style={{ flex: 1 }}>{item.label}</Typography.Text>
      {home && <Tag color="green" icon={<HomeOutlined />} style={{ marginInlineEnd: 0 }}>Home</Tag>}
    </Flex>
  );

  const pageRow = (item: NavItem, tab: OrderedSubmenu["tabs"][number], first: boolean) => (
    <Flex align="center" gap={10}>
      <HolderOutlined aria-hidden style={{ color: token.colorTextTertiary }} />
      <tab.Icon style={{ color: accentColor(item.accent, isDark) }} />
      <Typography.Text style={{ flex: 1 }}>{tab.label}</Typography.Text>
      {first && <Tag style={{ marginInlineEnd: 0 }}>Opens first</Tag>}
    </Flex>
  );

  const pages = (item: NavItem, interactive: boolean) => {
    if (!isSubmenuSection(item.id)) return null;
    const section = item.id;
    const tabs = submenus[section].tabs;
    const tabById = new Map(tabs.map((tab) => [tab.id, tab]));
    const rowStyle = { padding: "7px 12px", borderRadius: token.borderRadius, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` };
    return (
      <Flex vertical gap={6} style={{ marginTop: 8, marginLeft: 22, paddingLeft: 14, borderLeft: `2px solid ${token.colorBorderSecondary}` }}>
        {interactive ? (
          <SortableList
            ids={tabs.map((tab) => tab.id)}
            layout="list"
            onReorder={(order) => savePages(section, order)}
            renderOverlay={(id) => {
              const tab = tabById.get(id);
              return tab ? <div style={{ ...rowStyle, background: token.colorBgElevated }}>{pageRow(item, tab, false)}</div> : null;
            }}
            renderItem={(id, { ref, style, handlers, index }) => {
              const tab = tabById.get(id);
              if (!tab) return null;
              return (
                <div key={id} ref={ref} {...handlers} className="reorder-item" aria-label={`${item.label} page: ${tab.label}${index === 0 ? ", opens first" : ""}. Press Space to pick up and reorder.`} style={{ ...style, ...rowStyle, cursor: "grab" }}>
                  {pageRow(item, tab, index === 0)}
                </div>
              );
            }}
          />
        ) : (
          tabs.map((tab, index) => <div key={tab.id} style={rowStyle}>{pageRow(item, tab, index === 0)}</div>)
        )}
      </Flex>
    );
  };

  const block = (item: NavItem, home: boolean, interactive: boolean, handleProps: Record<string, unknown> = {}) => (
    <div style={{ padding: 10, borderRadius: token.borderRadiusLG, background: token.colorFillSecondary }}>
      <div {...handleProps} style={{ padding: "2px 2px", borderRadius: token.borderRadius, cursor: interactive ? "grab" : undefined }}>
        {header(item, home)}
      </div>
      {pages(item, interactive)}
    </div>
  );

  return (
    <Card
      size="small"
      title={
        <>
          <MenuOutlined style={{ marginRight: 8 }} />
          Main menu
        </>
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Drag a section to reorder the menu, or drag its pages to reorder them within that section. The first section is your home page, and the first page opens when you tap that section.
      </Typography.Paragraph>
      <Flex vertical gap={10}>
        <SortableList
          ids={items.map((item) => item.id)}
          layout="list"
          onReorder={saveMenu}
          renderOverlay={(id) => {
            const item = byId.get(id as NavItem["id"]);
            return item ? block(item, false, false) : null;
          }}
          renderItem={(id, { ref, style, handlers, index }) => {
            const item = byId.get(id as NavItem["id"]);
            if (!item) return null;
            return (
              <div key={id} ref={ref} style={style}>
                {block(item, index === 0, true, {
                  ...handlers,
                  className: "reorder-item",
                  "aria-label": `${item.label} section${index === 0 ? ", home page" : ""}. Press Space to pick up and reorder.`,
                })}
              </div>
            );
          }}
        />
      </Flex>
    </Card>
  );
}
