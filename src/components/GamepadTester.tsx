/**
 * ゲームパッドテスター（生の入力状態を可視化する診断用パネル）
 *
 * 依存関係:
 * - src/store/useInputStore.ts の gamepadLabelScheme（PS5/Xbox/Switch表記の選択）を読む
 * - src/lib/gamepadLabels.ts の gamepadButtonLabel() でボタン番号を実ボタン表記に変換する
 *
 * 「コントローラーが反応しない」という報告に対し、SF6ボタン名へのマッピングを一切介さずに
 * ブラウザが実際に受け取っている生のボタン状態・スティック値をそのまま表示する。
 * 数字（#0等）は分かりにくいという声を受け、ボタン設定と同じPS5/Xbox/Switch表記のみを表示する。
 *
 * 60fpsで無条件にsetStateすると、コントローラーを繋いでいるだけで（何も押していなくても）
 * 常時再レンダリングが走り続ける。ページのスクロール位置が勝手にずれる不具合の一因になり得るため、
 * 実際に値が変化したフレームだけsetStateするようにしてある（gamepad.tsの重複抑制と同じ考え方）。
 *
 * ブラウザの仕様上、コントローラーは接続しただけでは検出されず、いずれかのボタンを
 * 一度押すまでnavigator.getGamepads()に現れないため、その旨を未検出時に案内する。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { gamepadButtonLabel } from "@/lib/gamepadLabels";
import { useInputStore } from "@/store/useInputStore";

interface RawGamepadState {
  id: string;
  buttons: { pressed: boolean; value: number }[];
  axes: number[];
}

function statesEqual(a: RawGamepadState | null, b: RawGamepadState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.id !== b.id) return false;
  if (a.buttons.length !== b.buttons.length || a.axes.length !== b.axes.length) return false;
  for (let i = 0; i < a.buttons.length; i++) {
    if (a.buttons[i].pressed !== b.buttons[i].pressed || a.buttons[i].value !== b.buttons[i].value) return false;
  }
  for (let i = 0; i < a.axes.length; i++) {
    if (a.axes[i] !== b.axes[i]) return false;
  }
  return true;
}

export function GamepadTester() {
  const gamepadLabelScheme = useInputStore((state) => state.gamepadLabelScheme);
  const [state, setState] = useState<RawGamepadState | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<RawGamepadState | null>(null);

  useEffect(() => {
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const gamepad = Array.from(navigator.getGamepads()).find((p) => p !== null);
      // アナログ値はセンサーのわずかなノイズで常に微変動するため、丸めてから比較・表示する
      // （丸めないと「握りっぱなし」でも毎フレーム再レンダリングが走り続け、体感でページが
      // 落ち着かない一因になる）
      const round = (v: number) => Math.round(v * 100) / 100;
      const next: RawGamepadState | null = gamepad
        ? {
            id: gamepad.id,
            buttons: gamepad.buttons.map((b) => ({ pressed: b.pressed, value: round(b.value) })),
            axes: gamepad.axes.map(round),
          }
        : null;
      if (!statesEqual(lastRef.current, next)) {
        lastRef.current = next;
        setState(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">ゲームパッドテスター</h2>

      {!state && (
        <p className="mt-2 text-xs text-neutral-500">
          コントローラーが検出されていません。ブラウザの仕様上、接続しただけでは検出されず、いずれかのボタンを一度押すまで反応しません。ボタンを押してみてください。
        </p>
      )}

      {state && (
        <div className="mt-2 flex flex-col gap-3">
          <p className="truncate text-[11px] text-neutral-500" title={state.id}>
            {state.id}
          </p>

          <div>
            <p className="mb-1 text-[11px] text-neutral-500">ボタン</p>
            <div className="flex flex-wrap gap-1.5">
              {state.buttons.map((b, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 flex-col items-center justify-center rounded border text-[10px] font-semibold leading-none ${
                    b.pressed
                      ? "border-emerald-500 bg-emerald-500 text-neutral-950"
                      : "border-neutral-300 bg-neutral-100 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500"
                  }`}
                >
                  <span>{gamepadButtonLabel(i, gamepadLabelScheme)}</span>
                  {b.value > 0 && b.value < 1 && <span className="text-[8px]">{Math.round(b.value * 100)}%</span>}
                </div>
              ))}
            </div>
          </div>

          {state.axes.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] text-neutral-500">スティック / 軸</p>
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: Math.ceil(state.axes.length / 2) }).map((_, stickIndex) => {
                  const x = state.axes[stickIndex * 2] ?? 0;
                  const y = state.axes[stickIndex * 2 + 1] ?? 0;
                  return (
                    <div key={stickIndex} className="flex flex-col items-center gap-1">
                      <div className="relative h-16 w-16 rounded-full border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900">
                        <div
                          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500"
                          style={{ left: `${50 + x * 40}%`, top: `${50 + y * 40}%` }}
                        />
                      </div>
                      <span className="text-[9px] tabular-nums text-neutral-500">
                        軸{stickIndex * 2}/{stickIndex * 2 + 1}（{x.toFixed(2)}, {y.toFixed(2)}）
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
