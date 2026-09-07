import type { HookAPI } from "antd/es/modal/useModal";

export function confirmDestroy(
  modal: HookAPI,
  options: {
    title: string;
    content?: string;
    okText?: string;
    onOk: () => void | Promise<void>;
  },
) {
  modal.confirm({
    title: options.title,
    content: options.content,
    centered: true,
    okText: options.okText ?? "Delete",
    okButtonProps: { danger: true },
    cancelText: "Cancel",
    onOk: options.onOk,
  });
}
