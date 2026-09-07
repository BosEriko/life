import { ImageResponse } from "next/og";

export const alt =
  "Life Tracker — a private daily tracker for habits, hydration, nutrition, weight, blood pressure, and notes";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

const GREEN = "#316342";
const MINT = "#f2fcf5";
const INK = "#151d1a";
const MUTED = "#4a5a52";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: MINT,
          padding: 96,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <div
            style={{
              width: 128,
              height: 128,
              borderRadius: 30,
              background: GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="72" height="72" viewBox="0 0 512 512" fill="#ffffff">
              <path d="M512 32C512 140.1 435.4 230.3 333.6 251.4 325.7 193.3 299.6 141 261.1 100.5 301.2 40 369.9 0 448 0l32 0c17.7 0 32 14.3 32 32zM0 96C0 78.3 14.3 64 32 64l32 0c123.7 0 224 100.3 224 224l0 192c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160C100.3 320 0 219.7 0 96z" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 38,
              color: GREEN,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            LIFE TRACKER
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.05,
            }}
          >
            A calmer way to track your health
          </div>
          <div
            style={{
              fontSize: 33,
              color: MUTED,
              lineHeight: 1.35,
              maxWidth: 940,
            }}
          >
            Habits, hydration, nutrition, weight, blood pressure, and notes — in
            one daily view.
          </div>
        </div>

        <div style={{ fontSize: 27, color: GREEN, fontWeight: 600 }}>
          life.boseriko.com
        </div>
      </div>
    ),
    { ...size },
  );
}
