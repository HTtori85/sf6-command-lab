/**
 * SNS等でリンクを共有した際のプレビュー画像（OGP画像）
 *
 * next/og の ImageResponse でビルド時に自動生成する。手動で画像アセットを用意する必要がなく、
 * サイトの説明文を変えればプレビューにも自動反映される。
 */
import { ImageResponse } from "next/og";

export const alt = "スト6コマンド練習ラボ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 16, fontSize: 64, fontWeight: 700 }}>
          <span style={{ color: "#34d399" }}>スト6</span>
          <span>コマンド練習ラボ</span>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#a3a3a3" }}>
          実機準拠のフレーム判定で無料練習・全29キャラ対応
        </div>
        <div style={{ display: "flex", marginTop: 40, gap: 20, fontSize: 28 }}>
          {["↓", "↘", "→", "+P"].map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 12,
                background: "#171717",
                border: "1px solid #404040",
                color: "#34d399",
              }}
            >
              {c}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
