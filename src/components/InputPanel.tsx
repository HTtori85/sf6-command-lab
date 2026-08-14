/**
 * コントローラー入力パネル（現在の方向・ボタン状態をリアルタイム表示）
 *
 * 依存関係:
 * - src/store/useInputStore.ts のhistory（末尾＝現在の入力状態）を購読する
 * - src/types/index.ts の型を使用する
 *
 * KeyDisplayが「入力履歴」を横スクロールで見せるのに対し、こちらは原作の練習モードにある
 * ミニコントローラー表示のように「今まさに何を押しているか」を方向パッド＋6ボタンの
 * レイアウトで常時表示する。データはhistoryの最新エントリをそのまま使う（historyは
 * 状態が変化した瞬間だけ記録されるので、最新値＝現在値として扱える）。
 */
"use client";

import { ButtonIcon, DirectionIcon } from "@/components/icons";
import { gamepadButtonLabel } from "@/lib/gamepadLabels";
import { friendlyKeyLabel } from "@/lib/keyLabel";
import { useInputStore } from "@/store/useInputStore";
import type { ButtonName, DirectionValue } from "@/types";

const DIRECTION_GRID: DirectionValue[][] = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

const DIRECTION_KEY_HINT: Partial<Record<DirectionValue, string>> = {
  8: "W",
  4: "A",
  2: "S",
  6: "D",
};

const BUTTON_ROWS: ButtonName[][] = [
  ["LP", "MP", "HP"],
  ["LK", "MK", "HK"],
];

export function InputPanel() {
  const rawHistory = useInputStore((state) => state.history);
  const device = useInputStore((state) => state.device);
  const keyboardButtonMap = useInputStore((state) => state.keyboardButtonMap);
  const gamepadButtonMap = useInputStore((state) => state.gamepadButtonMap);
  const gamepadLabelScheme = useInputStore((state) => state.gamepadLabelScheme);
  const current = rawHistory[rawHistory.length - 1];
  const direction = current?.direction ?? 5;
  const buttons = current?.buttons ?? [];

  /** 現在選択中のデバイスに応じて、そのSF6ボタンに割り当てられている実キー/実ボタンの表示名を返す。
   * 練習モードを見ながら「LPって今どのキー？」が下の設定欄までスクロールしないと分からない、
   * という不便さに対応するため、常時表示のこのパネルに割り当て情報を出す。 */
  const boundLabelFor = (button: ButtonName): string => {
    if (device === "keyboard") {
      const code = Object.entries(keyboardButtonMap).find(([, b]) => b === button)?.[0] ?? "";
      return friendlyKeyLabel(code);
    }
    const index = Object.entries(gamepadButtonMap).find(([, b]) => b === button)?.[0];
    return index !== undefined ? gamepadButtonLabel(Number(index), gamepadLabelScheme) : "-";
  };

  return (
    <div className="flex shrink-0 items-center gap-3 rounded-lg border border-neutral-300 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="grid grid-cols-3 gap-1">
        {DIRECTION_GRID.flat().map((dir) => (
          <div
            key={dir}
            className={`flex h-8 w-7 flex-col items-center justify-center rounded leading-none ${
              dir === direction
                ? "bg-emerald-500 text-neutral-950"
                : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500"
            }`}
          >
            <DirectionIcon direction={dir} className="h-3.5 w-3.5" />
            {DIRECTION_KEY_HINT[dir] && (
              <span
                className={`text-[8px] ${dir === direction ? "text-neutral-800" : "text-neutral-500 dark:text-neutral-600"}`}
              >
                {DIRECTION_KEY_HINT[dir]}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {BUTTON_ROWS.flat().map((button) => (
          <div
            key={button}
            className={`flex h-8 w-9 flex-col items-center justify-center rounded leading-none ${
              buttons.includes(button)
                ? "bg-emerald-500 ring-2 ring-emerald-300"
                : "bg-neutral-200 dark:bg-neutral-800"
            }`}
          >
            <ButtonIcon button={button} className="h-4 w-4" />
            <span
              className={`text-[8px] font-semibold ${
                buttons.includes(button) ? "text-neutral-800" : "text-neutral-500 dark:text-neutral-600"
              }`}
            >
              {boundLabelFor(button)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
