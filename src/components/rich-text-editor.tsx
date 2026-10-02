"use client";

import { useEffect, useRef } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { Button, Flex, theme } from "antd";
import {
  BoldOutlined,
  CheckSquareOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { Tip } from "@/components/tip";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function plainTextToHtml(text: string): string {
  return text ? text.split("\n").map((line) => `<p>${escapeHtml(line)}</p>`).join("") : "";
}

export function editorText(editor: Editor): string {
  return editor.getText({ blockSeparator: "\n" }).trim();
}

function Toolbar({ editor }: { editor: Editor }) {
  const { token } = theme.useToken();
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      strike: current.isActive("strike"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      taskList: current.isActive("taskList"),
      link: current.isActive("link"),
    }),
  });

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "" || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  const tools = [
    { key: "bold", label: "Bold", icon: <BoldOutlined />, active: state.bold, run: () => editor.chain().focus().toggleBold().run() },
    { key: "italic", label: "Italic", icon: <ItalicOutlined />, active: state.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { key: "strike", label: "Strikethrough", icon: <StrikethroughOutlined />, active: state.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { key: "bulletList", label: "Bullet list", icon: <UnorderedListOutlined />, active: state.bulletList, run: () => editor.chain().focus().toggleBulletList().run() },
    { key: "orderedList", label: "Numbered list", icon: <OrderedListOutlined />, active: state.orderedList, run: () => editor.chain().focus().toggleOrderedList().run() },
    { key: "taskList", label: "Checklist", icon: <CheckSquareOutlined />, active: state.taskList, run: () => editor.chain().focus().toggleTaskList().run() },
    { key: "link", label: "Link", icon: <LinkOutlined />, active: state.link, run: setLink },
  ];

  return (
    <Flex gap={2} wrap style={{ padding: 4, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
      {tools.map((tool) => (
        <Tip key={tool.key} title={tool.label}>
          <Button
            type="text"
            size="small"
            aria-label={tool.label}
            aria-pressed={tool.active}
            icon={tool.icon}
            onMouseDown={(event) => event.preventDefault()}
            onClick={tool.run}
            style={{
              background: tool.active ? token.colorPrimaryBg : undefined,
              color: tool.active ? token.colorPrimary : undefined,
            }}
          />
        </Tip>
      ))}
    </Flex>
  );
}

export function RichTextEditor({
  initialHtml,
  placeholder,
  ariaLabel,
  autoFocus = false,
  minHeight = 88,
  onChange,
  onSubmit,
}: {
  initialHtml: string;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  minHeight?: number;
  onChange: (html: string, text: string) => void;
  onSubmit?: () => void;
}) {
  const { token } = theme.useToken();
  const handlers = useRef({ onChange, onSubmit });
  useEffect(() => {
    handlers.current = { onChange, onSubmit };
  });
  const editor = useEditor({
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    content: initialHtml,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: { "aria-label": ariaLabel, "aria-multiline": "true", role: "textbox", class: "rich-content rich-editor" },
      handleKeyDown: (_view, event) => {
        const submit = handlers.current.onSubmit;
        if (submit && event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          submit();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => {
      handlers.current.onChange(current.isEmpty ? "" : current.getHTML(), editorText(current));
    },
  });

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadius,
        background: token.colorBgContainer,
        overflow: "hidden",
      }}
    >
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} style={{ minHeight, padding: "8px 11px", cursor: "text" }} onClick={() => editor?.commands.focus()} />
    </div>
  );
}
