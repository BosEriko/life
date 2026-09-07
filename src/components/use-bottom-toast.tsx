"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { theme } from "antd";

export function useBottomToast(): {
  show: (message: string, ms?: number) => void;
  hide: () => void;
  node: ReactNode;
} {
  const { token } = theme.useToken();
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setText(null);
  }, []);

  const show = useCallback((message: string, ms = 3000) => {
    clearTimeout(timer.current);
    setText(message);
    if (ms > 0) timer.current = setTimeout(() => setText(null), ms);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const node =
    text != null && typeof document !== "undefined"
      ? createPortal(
          <div
            className="bottom-toast"
            style={{
              background: token.colorBgSpotlight,
              color: token.colorTextLightSolid,
              boxShadow: token.boxShadowSecondary,
            }}
          >
            {text}
          </div>,
          document.body,
        )
      : null;

  return { show, hide, node };
}
