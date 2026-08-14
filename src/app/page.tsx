/**
 * メインダッシュボード / 練習画面
 *
 * 依存関係:
 * - src/store/useInputStore.ts の useInputWatcher() をここで1回だけマウントし、
 *   キーボード/ゲームパッドの監視を開始する（KeyDisplay・InputPanel・PracticeMode全てがこの入力ログを使う）
 * - src/components/KeyDisplay.tsx（入力履歴の横スクロール表示）
 * - src/components/InputPanel.tsx（現在の方向・ボタン状態のコントローラー風表示）
 * - src/components/PracticeMode.tsx（キャラ別技選択・判定）
 * - src/components/CommandAnalyzer.tsx（エラー分析ダッシュボード）
 * - src/components/DeviceSelector.tsx（入力機器切替・ボタンマッピング設定）
 * - src/components/SoundControls.tsx（入力音・判定音・メトロノーム設定）
 * - src/components/GamepadTester.tsx（ゲームパッドの生入力を可視化する診断パネル）
 * - src/components/SimplifiedInputGuide.tsx（省略入力＝簡易入力のコツ一覧）
 *
 * 広告はlayout.tsxのAdSense自動広告スクリプトがページ全体を見て最適な位置に自動配置するため、
 * ここで個別の広告枠を手動配置する必要はない（src/components/AdSlot.tsxは、将来的に
 * 特定の位置へ手動で広告ユニットを置きたくなった場合のための予備コンポーネント）。
 */
"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { CommandAnalyzer } from "@/components/CommandAnalyzer";
import { ButtonMappingEditor, DeviceSelector } from "@/components/DeviceSelector";
import { GamepadTester } from "@/components/GamepadTester";
import { InputPanel } from "@/components/InputPanel";
import { KeyDisplay } from "@/components/KeyDisplay";
import { PracticeMode } from "@/components/PracticeMode";
import { SimplifiedInputGuide } from "@/components/SimplifiedInputGuide";
import { SoundControls } from "@/components/SoundControls";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useInputStore, useInputWatcher } from "@/store/useInputStore";

/** ネイティブのwindow.confirm()はページ全体をブロックしてしまう（自動化操作も固まる）ため使わず、
 * 「もう一度押すと確定」の2段階クリックで誤操作を防ぐ */
function ResetButton() {
  const resetAll = useInputStore((state) => state.resetAll);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          resetAll();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
      className={`flex items-center gap-1 rounded border px-2 py-1 text-sm ${
        armed
          ? "border-red-700 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
      title="入力履歴・試行結果をリセット"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      {armed ? "もう一度押すと確定" : "リセット"}
    </button>
  );
}

export default function Home() {
  useInputWatcher();
  const device = useInputStore((state) => state.device);
  const setDevice = useInputStore((state) => state.setDevice);

  return (
    <div className="flex min-h-screen flex-col items-center bg-neutral-50 px-4 py-10 dark:bg-neutral-950">
      <main className="flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">スト6コマンド練習ラボ</h1>
          <div className="flex items-center gap-2">
            <ResetButton />
            <ThemeToggle />
            <DeviceSelector value={device} onChange={setDevice} />
          </div>
        </div>

        <SoundControls />

        <div className="flex flex-wrap gap-2">
          <div className="min-w-0 flex-1">
            <KeyDisplay />
          </div>
          <InputPanel />
        </div>

        <PracticeMode />
        <SimplifiedInputGuide />
        <CommandAnalyzer />
        <GamepadTester />

        <section className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">ボタン設定</h2>
          <p className="mt-1 text-xs text-neutral-500">
            キーボードのキー（KeyCode）とゲームパッドのボタン番号を割り当て直せます。設定は端末のLocalStorageに保存されます。
          </p>
          <div className="mt-3">
            <ButtonMappingEditor />
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-center gap-3 py-2 text-xs text-neutral-500">
          <Link href="/privacy" className="hover:underline">
            プライバシーポリシー
          </Link>
          <span aria-hidden>・</span>
          <a
            href="https://github.com/HTtori85/sf6-command-lab"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
        </footer>
      </main>
    </div>
  );
}
