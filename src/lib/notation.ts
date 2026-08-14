/**
 * コマンドのステップ列を矢印表記の文字列に変換する
 *
 * 依存関係:
 * - src/components/PracticeMode.tsx から、テンキー表記（236P等）が分からないユーザー向けに
 *   矢印表記を併記するために呼ばれる
 */
import type { CommandStep, DirectionValue } from "@/types";

const ARROW_GLYPH: Partial<Record<DirectionValue, string>> = {
  1: "↙",
  2: "↓",
  3: "↘",
  4: "←",
  6: "→",
  7: "↖",
  8: "↑",
  9: "↗",
};

/** ボタン要素を表示用の短い文字列にする（anyButtonsは弱中強どれでも良いので強度を落として"P"/"K"にまとめる） */
function buttonLabel(step: CommandStep): string {
  if (step.anyButtons && step.anyButtons.length > 0) {
    return step.anyButtons[0].slice(1); // "LP" -> "P" / "LK" -> "K"
  }
  if (step.buttons) return step.buttons.join("+");
  return "";
}

/** [{direction:2},{direction:3},{direction:6,anyButtons:["LP","MP","HP"]}] -> "↓↘→+P" */
export function stepsToArrowNotation(steps: CommandStep[]): string {
  return steps
    .map((step) => {
      const arrow = step.direction !== undefined ? (ARROW_GLYPH[step.direction] ?? "") : "";
      const buttons = buttonLabel(step);
      if (arrow && buttons) return `${arrow}+${buttons}`;
      return arrow || buttons;
    })
    .join("");
}
