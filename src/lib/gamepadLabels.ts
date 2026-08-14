/**
 * ゲームパッドのボタン番号 → 機種別の見た目ラベル変換
 *
 * 依存関係:
 * - src/types/index.ts の GamepadLabelScheme を使用する
 * - src/components/DeviceSelector.tsx（ボタンマッピング設定の番号入力の横に表示）
 * - src/components/InputPanel.tsx（現在押しているボタンの実ボタン名表示）
 *
 * Standard Gamepad Mapping（W3C Gamepad API）のボタンインデックスは機種が変わっても
 * 同じ並び（0=下面, 1=右面, 2=左面, 3=上面, 4=L1/LB/L, 5=R1/RB/R, ...）になるため、
 * 番号→ラベルの対応表を機種ごとに1つ持てば変換できる。
 */
import type { GamepadLabelScheme } from "@/types";

export const GAMEPAD_LABEL_SCHEME_NAMES: Record<GamepadLabelScheme, string> = {
  ps5: "PS5",
  xbox: "Xbox",
  switch: "Switch",
};

const GAMEPAD_INDEX_LABELS: Record<GamepadLabelScheme, Record<number, string>> = {
  ps5: {
    0: "×", 1: "○", 2: "□", 3: "△",
    4: "L1", 5: "R1", 6: "L2", 7: "R2",
    8: "SHARE", 9: "OPTIONS",
  },
  xbox: {
    0: "A", 1: "B", 2: "X", 3: "Y",
    4: "LB", 5: "RB", 6: "LT", 7: "RT",
    8: "ビュー", 9: "メニュー",
  },
  switch: {
    0: "B", 1: "A", 2: "Y", 3: "X",
    4: "L", 5: "R", 6: "ZL", 7: "ZR",
    8: "－", 9: "＋",
  },
};

/** ボタン番号を指定機種の表記に変換する（対応表にない番号はそのまま # 付きで返す） */
export function gamepadButtonLabel(index: number, scheme: GamepadLabelScheme): string {
  return GAMEPAD_INDEX_LABELS[scheme]?.[index] ?? `#${index}`;
}
