/**
 * ライト/ダークモード切替
 *
 * 依存関係:
 * - src/store/useInputStore.ts の theme を読み書きする
 * - src/app/layout.tsx のインラインスクリプトが初回描画前に同じロジックで.darkクラスを
 *   先に当てているので、ここでの反映はテーマ変更時（ボタン操作・OS設定変更）のみで良い
 *
 * Tailwind v4のdark:バリアントは`.dark`クラスの有無だけで切り替わる（@custom-variant、
 * globals.css参照）。「system」選択時はOSの配色設定（prefers-color-scheme）に追従する。
 */
"use client";

import { useEffect } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useInputStore } from "@/store/useInputStore";
import type { ThemeMode } from "@/types";

const OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "ライト" },
  { value: "dark", icon: Moon, label: "ダーク" },
  { value: "system", icon: Monitor, label: "端末設定" },
];

function applyTheme(theme: ThemeMode) {
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function ThemeToggle() {
  const theme = useInputStore((state) => state.theme);
  const setTheme = useInputStore((state) => state.setTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <div className="flex items-center rounded border border-neutral-300 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          title={label}
          className={`flex h-6 w-6 items-center justify-center rounded ${
            theme === value
              ? "bg-emerald-500 text-neutral-950"
              : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
