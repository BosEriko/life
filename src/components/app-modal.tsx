"use client";

import { Modal, type ModalProps } from "antd";

export function AppModal({ rootClassName, ...props }: ModalProps) {
  return <Modal centered {...props} rootClassName={["app-modal", rootClassName].filter(Boolean).join(" ")} />;
}
