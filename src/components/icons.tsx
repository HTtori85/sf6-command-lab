/**
 * 方向・ボタンの共通アイコン表示
 *
 * 依存関係:
 * - src/components/KeyDisplay.tsx / InputPanel.tsx から使われる
 *
 * ストリートファイター6のように、方向は矢印（テンキー表記が分からないユーザーへの配慮。
 * ニュートラルだけ矢印がないので「N」の文字で表す）、パンチは拳、キックは足のアイコンで表示する。
 * 強度（Light/Medium/Heavy）はアイコンの色で区別する。
 */
"use client";

import type { ComponentType } from "react";
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Footprints,
  HandFist,
} from "lucide-react";
import type { ButtonName, DirectionValue } from "@/types";

const ARROW_ICONS: Partial<Record<DirectionValue, ComponentType<{ className?: string }>>> = {
  1: ArrowDownLeft,
  2: ArrowDown,
  3: ArrowDownRight,
  4: ArrowLeft,
  6: ArrowRight,
  7: ArrowUpLeft,
  8: ArrowUp,
  9: ArrowUpRight,
};

interface DirectionIconProps {
  direction: DirectionValue;
  className?: string;
}

/** 方向を矢印アイコンで表示する（5＝ニュートラルのみ「N」の文字表記） */
export function DirectionIcon({ direction, className }: DirectionIconProps) {
  if (direction === 5) {
    return <span className={`flex items-center justify-center font-bold leading-none ${className ?? ""}`}>N</span>;
  }
  const Icon = ARROW_ICONS[direction];
  if (!Icon) return null;
  return <Icon className={className} />;
}

/** 強度（先頭1文字）ごとの色分け。L=水色/M=黄色/H=赤、という原作寄りの強弱表現 */
const STRENGTH_COLOR: Record<string, string> = {
  L: "text-sky-500 dark:text-sky-400",
  M: "text-amber-500 dark:text-amber-400",
  H: "text-red-500 dark:text-red-400",
};

interface ButtonIconProps {
  button: ButtonName;
  className?: string;
}

/** ボタンをパンチ＝拳・キック＝足のアイコンで表示する（強度は色で区別） */
export function ButtonIcon({ button, className }: ButtonIconProps) {
  const isKick = button.endsWith("K");
  const Icon = isKick ? Footprints : HandFist;
  const strengthColor = STRENGTH_COLOR[button[0]] ?? "";
  return <Icon className={`${strengthColor} ${className ?? ""}`} />;
}
