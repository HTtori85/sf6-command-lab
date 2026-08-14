/**
 * ゲームパッドテスター（生の入力状態を可視化する診断用パネル）
 *
 * 依存関係:
 * - なし（Gamepad APIを直接ポーリングするだけの独立コンポーネント）
 *
 * 「コントローラーが反応しない」という報告に対し、SF6ボタン名へのマッピングを一切介さずに
 * ブラウザが実際に受け取っている生のボタン番号・スティック値をそのまま表示する。
 * ユーザー自身がどのボタンがどの番号なのかを目視確認でき、ボタン設定（押して設定）で
 * 迷ったときの切り分けにも使える。
 *
 * ブラウザの仕様上、コントローラーは接続しただけでは検出されず、いずれかのボタンを
 * 一度押すまでnavigator.getGamepads()に現れないため、その旨を未検出時に案内する。
 */
"use client";

import { useEffect, useRef, useState } from "react";

interface RawGamepadState {
  id: string;
  buttons: { pressed: boolean; value: number }[];
  axes: number[];
}

export function GamepadTester() {
  const [state, setState] = useState<RawGamepadState | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const gamepad = Array.from(navigator.getGamepads()).find((p) => p !== null);
      setState(
        gamepad
          ? {
              id: gamepad.id,
              buttons: gamepad.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
              axes: [...gamepad.axes],
            }
          : null,
      );
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
            <p className="mb-1 text-[11px] text-neutral-500">ボタン（番号がそのまま「押して設定」で使える値です）</p>
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
                  <span>#{i}</span>
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
