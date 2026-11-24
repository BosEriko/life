"use client";

import { useState } from "react";
import { App, Button, Card, ColorPicker, Flex, Form, Input, Select, Typography, theme } from "antd";
import { DeleteOutlined, EditOutlined, HolderOutlined, LockOutlined, PlusOutlined, ReloadOutlined, TagsOutlined } from "@ant-design/icons";
import { AppModal } from "@/components/app-modal";
import { useAuth } from "@/components/auth-provider";
import { useHealthData } from "@/components/health-data-provider";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Tip } from "@/components/tip";
import { SortableList } from "@/components/sortable-list";
import { CategoryBadge } from "@/components/finance-category-icon";
import { FinanceIconPicker } from "@/components/finance-icon-picker";
import { categoryDeleteBlocker, categoryTree, categoryValidation, DEFAULT_CATEGORIES, isLockedCategory, nextCategoryOrder, type FinanceCategory } from "@/lib/finance-categories";
import { deleteFinanceCategory, reorderFinanceCategories, resetFinanceCategories, saveFinanceCategory } from "@/models/users/finance";

const PRESET_COLORS = [...new Set(DEFAULT_CATEGORIES.filter((category) => category.parentId === null).map((category) => category.color))];

function CategoryModal({ initial, onClose }: { initial: FinanceCategory; onClose: () => void }) {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { financeCategories: categories, financeCategoriesSeeded: seeded } = useHealthData();
  const existing = categories.some((category) => category.id === initial.id);
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [icon, setIcon] = useState(initial.icon);
  const [parentId, setParentId] = useState(initial.parentId);
  const hasChildren = categories.some((category) => category.parentId === initial.id);
  const mains = categoryTree(categories).filter(({ category, depth }) => depth === 0 && category.id !== initial.id).map(({ category }) => category);
  function save() {
    if (!user) return;
    const category: FinanceCategory = { ...initial, name, color, icon, parentId, order: parentId === initial.parentId && existing ? initial.order : nextCategoryOrder(categories, parentId) };
    const error = categoryValidation(category, categories);
    if (error) { message.error(error); return; }
    void saveFinanceCategory(user.uid, category, categories, seeded).catch((reason: unknown) => message.error(reason instanceof Error ? reason.message : "Could not save the category."));
    message.success(navigator.onLine ? (existing ? "Category updated." : "Category added.") : "Category saved offline. It will sync when you reconnect.");
    onClose();
  }
  return <AppModal open title={existing ? "Edit category" : parentId ? "Add subcategory" : "Add category"} onCancel={onClose} footer={<Flex justify="flex-end"><Button type="primary" onClick={save}>{existing ? "Save changes" : "Add category"}</Button></Flex>}>
    <Form layout="vertical" onFinish={save}>
      <Form.Item label="Preview">
        <Flex align="center" gap={10}><CategoryBadge category={{ color, icon }} size={32} /><Typography.Text strong>{name.trim() || "Category name"}</Typography.Text></Flex>
      </Form.Item>
      <Form.Item label="Name" required><Input aria-label="Category name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} autoFocus /></Form.Item>
      <Form.Item label="Parent" extra={hasChildren ? "A category with subcategories stays a main category." : undefined}>
        <Select aria-label="Parent category" value={parentId ?? ""} disabled={hasChildren} onChange={(value) => setParentId(value || null)} options={[{ value: "", label: "None, it's a main category" }, ...mains.map((category) => ({ value: category.id, label: <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><CategoryBadge category={category} />{category.name}</span> }))]} />
      </Form.Item>
      <Form.Item label="Color" required>
        <ColorPicker aria-label="Category color" value={color} disabledAlpha showText onChangeComplete={(value) => setColor(value.toHexString().toUpperCase())} presets={[{ label: "Default colors", colors: PRESET_COLORS }]} />
      </Form.Item>
      <Form.Item label="Icon" required style={{ marginBottom: 0 }}>
        <FinanceIconPicker value={icon} color={color} onChange={setIcon} />
      </Form.Item>
    </Form>
  </AppModal>;
}

export function FinanceCategoriesCard() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { financeCategories: categories, financeCategoriesSeeded: seeded, financeReady, financeError } = useHealthData();
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const rows = categoryTree(categories);
  const mains = rows.filter(({ depth }) => depth === 0).map(({ category }) => category);
  const subsOf = (id: string) => rows.filter(({ category, depth }) => depth === 1 && category.parentId === id).map(({ category }) => category);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const disabled = !financeReady || financeError;
  const blank = (parent: FinanceCategory | null): FinanceCategory => ({ id: crypto.randomUUID(), name: "", color: parent?.color ?? "#536DFE", icon: parent ? "tag" : "tags", parentId: parent?.id ?? null, order: nextCategoryOrder(categories, parent?.id ?? null) });
  function remove(category: FinanceCategory) {
    if (!user) return;
    void deleteFinanceCategory(user.uid, category.id, categories, seeded).catch((reason: unknown) => message.error(reason instanceof Error ? reason.message : "Could not delete the category."));
    message.success(navigator.onLine ? "Category deleted. Its records moved to Deleted category." : "Deleted offline. It will sync when you reconnect.");
  }
  function reset() {
    if (!user) return;
    void resetFinanceCategories(user.uid, categories).catch(() => message.error("Could not reset the categories."));
    message.success(navigator.onLine ? "Categories reset to the defaults." : "Reset offline. It will sync when you reconnect.");
  }
  function reorder(order: string[]) {
    if (!user) return;
    void reorderFinanceCategories(user.uid, order, categories, seeded).catch(() => message.error("Could not save the category order."));
  }

  const actions = (category: FinanceCategory, depth: 0 | 1) => {
    if (isLockedCategory(category.id)) return <Tip title="Locked. Records from deleted categories land here."><LockOutlined aria-label="Locked category" style={{ color: token.colorTextTertiary, padding: "0 8px" }} /></Tip>;
    const blocker = categoryDeleteBlocker(category.id, categories);
    return (
      <Flex gap={2}>
        {!depth && <Tip title="Add subcategory"><Button type="text" size="small" aria-label={`Add subcategory to ${category.name}`} icon={<PlusOutlined />} disabled={disabled} onClick={() => setEditing(blank(category))} /></Tip>}
        <Tip title="Edit"><Button type="text" size="small" aria-label={`Edit ${category.name}`} icon={<EditOutlined />} disabled={disabled} onClick={() => setEditing(category)} /></Tip>
        {blocker ? (
          <Tip title={blocker}><span><Button type="text" size="small" aria-label={`Delete ${category.name}`} icon={<DeleteOutlined />} disabled /></span></Tip>
        ) : (
          <ConfirmDeleteButton ariaLabel={`Delete ${category.name}`} tooltip="Delete" hint="Tap again to delete. Its records move to Deleted category." onConfirm={() => remove(category)} />
        )}
      </Flex>
    );
  };

  const label = (category: FinanceCategory, depth: 0 | 1) => (
    <Flex align="center" gap={depth ? 10 : 12} style={{ flex: 1, minWidth: 0 }}>
      <HolderOutlined aria-hidden style={{ color: token.colorTextTertiary }} />
      <CategoryBadge category={category} size={depth ? 22 : 30} />
      <Typography.Text strong={!depth} style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{category.name}</Typography.Text>
    </Flex>
  );

  const rowStyle = { padding: "5px 6px 5px 12px", borderRadius: token.borderRadius, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` };
  const subRow = (category: FinanceCategory, handleProps: Record<string, unknown> = {}) => (
    <Flex align="center" gap={8}>
      <div {...handleProps} style={{ display: "flex", flex: 1, minWidth: 0, cursor: disabled ? undefined : "grab" }}>{label(category, 1)}</div>
      {actions(category, 1)}
    </Flex>
  );

  const subs = (main: FinanceCategory, interactive: boolean) => {
    const list = subsOf(main.id);
    if (list.length === 0) return null;
    return (
      <Flex vertical gap={6} style={{ marginTop: 8, marginLeft: 22, paddingLeft: 14, borderLeft: `2px solid ${token.colorBorderSecondary}` }}>
        {interactive ? (
          <SortableList
            ids={list.map((category) => category.id)}
            layout="list"
            disabled={disabled}
            onReorder={reorder}
            renderOverlay={(id) => {
              const category = byId.get(id);
              return category ? <div style={{ ...rowStyle, background: token.colorBgElevated }}>{subRow(category)}</div> : null;
            }}
            renderItem={(id, { ref, style, handlers }) => {
              const category = byId.get(id);
              if (!category) return null;
              return (
                <div key={id} ref={ref} style={{ ...style, ...rowStyle }}>
                  {subRow(category, { ...handlers, className: "reorder-item", "aria-label": `${main.name} subcategory: ${category.name}. Press Space to pick up and reorder.` })}
                </div>
              );
            }}
          />
        ) : (
          list.map((category) => <div key={category.id} style={rowStyle}>{subRow(category)}</div>)
        )}
      </Flex>
    );
  };

  const block = (main: FinanceCategory, interactive: boolean, handleProps: Record<string, unknown> = {}) => (
    <div style={{ padding: 10, borderRadius: token.borderRadiusLG, background: token.colorFillSecondary }}>
      <Flex align="center" gap={8}>
        <div {...handleProps} style={{ display: "flex", flex: 1, minWidth: 0, padding: "2px 2px", borderRadius: token.borderRadius, cursor: interactive && !disabled ? "grab" : undefined }}>{label(main, 0)}</div>
        {actions(main, 0)}
      </Flex>
      {subs(main, interactive)}
    </div>
  );

  return (
    <Card size="small" title={<><TagsOutlined style={{ marginRight: 8 }} />Categories</>} extra={<Button size="small" type="primary" icon={<PlusOutlined />} disabled={disabled} onClick={() => setEditing(blank(null))}>Add category</Button>}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Drag a category to reorder it, or drag its subcategories to reorder them within it. Records from a deleted category move to Others › Deleted category.
      </Typography.Paragraph>
      <Flex vertical gap={10}>
        <SortableList
          ids={mains.map((category) => category.id)}
          layout="list"
          disabled={disabled}
          onReorder={reorder}
          renderOverlay={(id) => {
            const main = byId.get(id);
            return main ? block(main, false) : null;
          }}
          renderItem={(id, { ref, style, handlers }) => {
            const main = byId.get(id);
            if (!main) return null;
            return (
              <div key={id} ref={ref} style={style}>
                {block(main, true, { ...handlers, className: "reorder-item", "aria-label": `${main.name} category. Press Space to pick up and reorder.` })}
              </div>
            );
          }}
        />
      </Flex>
      <Flex justify="flex-end" style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
        <ConfirmActionButton icon={<ReloadOutlined />} idleLabel="Reset to defaults" armedLabel="Confirm reset" ariaLabel="Reset categories to defaults" hint="Tap again to restore the default categories. Records in categories that aren't in the defaults move to Deleted category." disabled={disabled} onConfirm={reset} />
      </Flex>
      {editing && <CategoryModal key={editing.id} initial={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
