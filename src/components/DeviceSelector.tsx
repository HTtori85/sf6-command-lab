/**
 * 入力機器切替UI（レバーレス / レバー / パッド / キーボード）＋ ボタンマッピング設定UI
 *
 * 依存関係:
 * - src/types/index.ts の DeviceType / ButtonName を使用する
 * - src/store/useInputStore.ts の keyboardButtonMap / gamepadButtonMap / gamepadDirectionMap を読み書きする
 *   （useInputWatcher()がこのマップを使って実際の入力検知に反映する）
 *
 * ボタン割り当ては「番号やKeyCodeを手入力する」のが分かりにくい・面倒という声を受け、
 * 「押して設定」ボタンで実際にキー/コントローラーのボタンを押すだけで割り当てられる
 * キャプチャ方式にした（手入力欄は廃止）。
 *
 * ゲームパッドの十字キー（方向）は従来 index 12〜15 固定だったが、標準マッピングとして
 * 認識されないアケコン/レバーレスでは番号が一致せず「反応しない」原因になっていたため、
 * 6ボタンと同じキャプチャ方式で方向も割り当て直せるようにしてある。
 */
"use client";

import { Fragment, useEffect, useState } from "react";
import { Crosshair } from "lucide-react";
import type { GamepadDirectionKey } from "@/lib/gamepad";
import { GAMEPAD_LABEL_SCHEME_NAMES, gamepadButtonLabel } from "@/lib/gamepadLabels";
import { friendlyKeyLabel } from "@/lib/keyLabel";
import { useInputStore } from "@/store/useInputStore";
import type { ButtonName, DeviceType, GamepadLabelScheme } from "@/types";

export const DEVICE_LABELS: Record<DeviceType, string> = {
  leverless: "レバーレス",
  "arcade-stick": "レバー（アケコン）",
  pad: "パッド",
  keyboard: "キーボード",
};

interface DeviceSelectorProps {
  value: DeviceType;
  onChange: (device: DeviceType) => void;
}

export function DeviceSelector({ value, onChange }: DeviceSelectorProps) {
  return (
    <select
      className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
      value={value}
      onChange={(e) => onChange(e.target.value as DeviceType)}
    >
      {(Object.keys(DEVICE_LABELS) as DeviceType[]).map((device) => (
        <option key={device} value={device}>
          {DEVICE_LABELS[device]}
        </option>
      ))}
    </select>
  );
}

const BUTTONS: ButtonName[] = ["LP", "MP", "HP", "LK", "MK", "HK"];
const DIRECTIONS: { key: GamepadDirectionKey; label: string }[] = [
  { key: "up", label: "↑（上）" },
  { key: "down", label: "↓（下）" },
  { key: "left", label: "←（左）" },
  { key: "right", label: "→（右）" },
];

type Listening =
  | { kind: "keyboard-button"; button: ButtonName }
  | { kind: "gamepad-button"; button: ButtonName }
  | { kind: "gamepad-direction"; direction: GamepadDirectionKey };

const captureButtonClass = (active: boolean) =>
  `flex items-center justify-between gap-1 rounded border px-1.5 py-0.5 text-left ${
    active
      ? "animate-pulse border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
  }`;

/** キーボードキー／ゲームパッドのボタン番号・十字キー番号を割り当て直すための設定UI */
export function ButtonMappingEditor() {
  const keyboardButtonMap = useInputStore((state) => state.keyboardButtonMap);
  const gamepadButtonMap = useInputStore((state) => state.gamepadButtonMap);
  const gamepadDirectionMap = useInputStore((state) => state.gamepadDirectionMap);
  const gamepadLabelScheme = useInputStore((state) => state.gamepadLabelScheme);
  const setKeyboardKeyForButton = useInputStore((state) => state.setKeyboardKeyForButton);
  const setGamepadIndexForButton = useInputStore((state) => state.setGamepadIndexForButton);
  const setGamepadIndexForDirection = useInputStore((state) => state.setGamepadIndexForDirection);
  const setGamepadLabelScheme = useInputStore((state) => state.setGamepadLabelScheme);

  const [listening, setListening] = useState<Listening | null>(null);

  const keyCodeFor = (button: ButtonName) =>
    Object.entries(keyboardButtonMap).find(([, b]) => b === button)?.[0] ?? "";
  const gamepadIndexForButton = (button: ButtonName) =>
    Object.entries(gamepadButtonMap).find(([, b]) => b === button)?.[0] ?? "";
  const gamepadIndexForDirection = (direction: GamepadDirectionKey) =>
    Object.entries(gamepadDirectionMap).find(([, d]) => d === direction)?.[0] ?? "";

  // キーボード用キャプチャ：次に押されたキーのcodeをそのまま割り当てる（Escでキャンセル）
  useEffect(() => {
    if (listening?.kind !== "keyboard-button") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === "Escape") {
        setListening(null);
        return;
      }
      setKeyboardKeyForButton(listening.button, e.code);
      setListening(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [listening, setKeyboardKeyForButton]);

  // ゲームパッド用キャプチャ（ボタン・方向共通）：キャプチャ開始時点で押されていなかった番号が
  // 新たに押された瞬間の番号を割り当てる（標準マッピング外のアケコン/レバーレスでも、番号を
  // 推測させず実際の入力で確定できるようにするため）
  useEffect(() => {
    if (listening?.kind !== "gamepad-button" && listening?.kind !== "gamepad-direction") return;
    let rafId: number;
    let initial: Set<number> | null = null;

    const tick = () => {
      const gamepad = Array.from(navigator.getGamepads()).find((p) => p !== null);
      if (gamepad) {
        const pressedNow = new Set<number>();
        gamepad.buttons.forEach((b, i) => {
          if (b.pressed) pressedNow.add(i);
        });
        if (initial === null) {
          initial = pressedNow;
        } else {
          const newlyPressed = [...pressedNow].find((i) => !initial!.has(i));
          if (newlyPressed !== undefined) {
            if (listening.kind === "gamepad-button") {
              setGamepadIndexForButton(listening.button, newlyPressed);
            } else {
              setGamepadIndexForDirection(listening.direction, newlyPressed);
            }
            setListening(null);
            return;
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [listening, setGamepadIndexForButton, setGamepadIndexForDirection]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="text-neutral-500">ゲームパッドの表記</span>
        <select
          className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          value={gamepadLabelScheme}
          onChange={(e) => setGamepadLabelScheme(e.target.value as GamepadLabelScheme)}
        >
          {(Object.keys(GAMEPAD_LABEL_SCHEME_NAMES) as GamepadLabelScheme[]).map((scheme) => (
            <option key={scheme} value={scheme}>
              {GAMEPAD_LABEL_SCHEME_NAMES[scheme]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-[3rem_1fr_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
        <span className="text-neutral-500">方向</span>
        <span className="text-neutral-500">キーボード</span>
        <span className="text-neutral-500">ゲームパッド</span>
        {DIRECTIONS.map(({ key, label }) => {
          const gamepadIndex = gamepadIndexForDirection(key);
          const isListeningGamepad = listening?.kind === "gamepad-direction" && listening.direction === key;
          return (
            <Fragment key={key}>
              <span className="font-mono text-neutral-700 dark:text-neutral-300">{label}</span>
              <span className="text-neutral-400 dark:text-neutral-600">WASD固定</span>
              <button
                type="button"
                onClick={() => setListening(isListeningGamepad ? null : { kind: "gamepad-direction", direction: key })}
                className={captureButtonClass(isListeningGamepad)}
                title="クリックしてコントローラーの十字キー/レバーを押すと割り当てます"
              >
                <span>
                  {isListeningGamepad
                    ? "入力してください…"
                    : gamepadIndex !== ""
                      ? `#${gamepadIndex}`
                      : "未設定"}
                </span>
                <Crosshair className="h-3 w-3 shrink-0 opacity-60" />
              </button>
            </Fragment>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-[3rem_1fr_1fr] items-center gap-x-2 gap-y-1.5 text-xs">
        <span className="text-neutral-500">ボタン</span>
        <span className="text-neutral-500">キーボード</span>
        <span className="text-neutral-500">ゲームパッド</span>
        {BUTTONS.map((button) => {
          const gamepadIndex = gamepadIndexForButton(button);
          const isListeningKeyboard = listening?.kind === "keyboard-button" && listening.button === button;
          const isListeningGamepad = listening?.kind === "gamepad-button" && listening.button === button;
          return (
            <Fragment key={button}>
              <span className="font-mono text-neutral-700 dark:text-neutral-300">{button}</span>

              <button
                type="button"
                onClick={() => setListening(isListeningKeyboard ? null : { kind: "keyboard-button", button })}
                className={captureButtonClass(isListeningKeyboard)}
                title="クリックしてキーを押すと割り当てます（Escでキャンセル）"
              >
                <span>{isListeningKeyboard ? "キーを押してください…" : friendlyKeyLabel(keyCodeFor(button))}</span>
                <Crosshair className="h-3 w-3 shrink-0 opacity-60" />
              </button>

              <button
                type="button"
                onClick={() => setListening(isListeningGamepad ? null : { kind: "gamepad-button", button })}
                className={captureButtonClass(isListeningGamepad)}
                title="クリックしてコントローラーのボタンを押すと割り当てます"
              >
                <span>
                  {isListeningGamepad
                    ? "ボタンを押してください…"
                    : gamepadIndex !== ""
                      ? `${gamepadButtonLabel(Number(gamepadIndex), gamepadLabelScheme)}（#${gamepadIndex}）`
                      : "未設定"}
                </span>
                <Crosshair className="h-3 w-3 shrink-0 opacity-60" />
              </button>
            </Fragment>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">
        欄をクリックしてから実際にキー/ボタン/十字キーを押すと割り当てられます。ゲームパッドが反応しない場合、コントローラーの種類によっては標準的なボタン番号と対応しないことがあります（アケコン/レバーレスに多い）。この方式なら番号を推測せずに実際の入力で確定できます。
      </p>
    </div>
  );
}
