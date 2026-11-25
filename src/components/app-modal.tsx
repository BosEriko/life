"use client";

import { Modal, type ModalProps } from "antd";

export function AppModal({ rootClassName, destroyOnHidden = true, ...props }: ModalProps) {
  return <Modal centered destroyOnHidden={destroyOnHidden} {...props} rootClassName={["app-modal", rootClassName].filter(Boolean).join(" ")} />;
}
