/**
 * Gamepad API 監視・マッピング処理
 *
 * 依存関係:
 * - src/types/index.ts の DirectionValue / ButtonName / DeviceType を使用する
 * - src/components/KeyDisplay.tsx から呼び出される
 *
 * ブラウザはボタン押下の変化をイベントで通知しないため（Gamepad APIの仕様）、
 * requestAnimationFrameで毎フレームポーリングするのが標準的な検知方法。
 */
import type { ButtonName, DeviceType, DirectionValue } from "@/types";

/**
 * Standard Gamepad Mapping を前提としたボタンインデックス → スト6ボタン名の初期対応表。
 * レバーレス/アケコン/パッドの多くがこの標準マッピングでボタン部分を認識できる。
 */
export const DEFAULT_GAMEPAD_BUTTON_MAP: Record<number, ButtonName> = {
  0: "LP",
  1: "MP",
  2: "HP",
  3: "LK",
  4: "MK",
  5: "HK",
};

export type GamepadDirectionKey = "up" | "down" | "left" | "right";

/**
 * Standard Gamepad Mapping における十字キーのボタンインデックス初期値（12〜15）。
 * アケコン/レバーレスの中には標準マッピングとして認識されない機種もあり、その場合はこの番号が
 * 実際の十字キーと一致しない（「コントローラーが反応しない」の主な原因）。DeviceSelectorの
 * 「押して設定」でユーザーが実際の入力から上書きできるようにするため、キーボードのボタン設定と
 * 同様にマップとして持たせている。
 */
export const DEFAULT_GAMEPAD_DIRECTION_MAP: Record<number, GamepadDirectionKey> = {
  12: "up",
  13: "down",
  14: "left",
  15: "right",
};

/** アナログスティックのデッドゾーン（この値未満の傾きは入力なしとみなす） */
const STICK_DEADZONE = 0.5;

/** 上下左右のON/OFFからテンキー表記（1〜9）の方向値を算出する */
function dpadToDirection(up: boolean, down: boolean, left: boolean, right: boolean): DirectionValue {
  const vertical = up === down ? 0 : up ? 1 : -1;
  const horizontal = left === right ? 0 : right ? 1 : -1;
  const table: Record<string, DirectionValue> = {
    "1,-1": 7, "1,0": 8, "1,1": 9,
    "0,-1": 4, "0,0": 5, "0,1": 6,
    "-1,-1": 1, "-1,0": 2, "-1,1": 3,
  };
  return table[`${vertical},${horizontal}`];
}

export interface GamepadFrameSnapshot {
  direction: DirectionValue;
  buttons: ButtonName[];
}

/** 指定したGamepadの現在の状態（方向・ボタン）を読み取る */
export function readGamepadSnapshot(
  gamepad: Gamepad,
  buttonMap: Record<number, ButtonName> = DEFAULT_GAMEPAD_BUTTON_MAP,
  directionMap: Record<number, GamepadDirectionKey> = DEFAULT_GAMEPAD_DIRECTION_MAP,
): GamepadFrameSnapshot {
  const isPressed = (index: number) => gamepad.buttons[index]?.pressed ?? false;
  const dirEntries = Object.entries(directionMap);
  const dpadUp = dirEntries.some(([index, dir]) => dir === "up" && isPressed(Number(index)));
  const dpadDown = dirEntries.some(([index, dir]) => dir === "down" && isPressed(Number(index)));
  const dpadLeft = dirEntries.some(([index, dir]) => dir === "left" && isPressed(Number(index)));
  const dpadRight = dirEntries.some(([index, dir]) => dir === "right" && isPressed(Number(index)));

  const [stickX, stickY] = gamepad.axes;
  const stickUp = stickY !== undefined && stickY < -STICK_DEADZONE;
  const stickDown = stickY !== undefined && stickY > STICK_DEADZONE;
  const stickLeft = stickX !== undefined && stickX < -STICK_DEADZONE;
  const stickRight = stickX !== undefined && stickX > STICK_DEADZONE;

  const direction = dpadToDirection(
    dpadUp || stickUp,
    dpadDown || stickDown,
    dpadLeft || stickLeft,
    dpadRight || stickRight,
  );

  const buttons: ButtonName[] = [];
  for (const [indexStr, name] of Object.entries(buttonMap)) {
    if (isPressed(Number(indexStr))) buttons.push(name);
  }

  return { direction, buttons };
}

export type GamepadPollCallback = (snapshot: GamepadFrameSnapshot, device: DeviceType) => void;

function snapshotsEqual(a: GamepadFrameSnapshot, b: GamepadFrameSnapshot): boolean {
  return (
    a.direction === b.direction &&
    a.buttons.length === b.buttons.length &&
    a.buttons.every((btn) => b.buttons.includes(btn))
  );
}

/**
 * requestAnimationFrameでGamepad APIをポーリングし、状態が変化したフレームだけ onFrame を呼び出す。
 * 毎フレーム無条件に通知すると、スティックを倒しっぱなしにしただけで同一状態のフレームが
 * 履歴に大量に積まれてしまう（KeyDisplayの表示件数を圧迫する・分析上意味がない）ため、
 * 直前に通知したスナップショットと同じ間は再通知しない。
 * @param device このGamepadをどのデバイス種別として扱うか（レバーレス/アケコン/パッド）
 * @returns 監視を停止する関数
 */
export function startGamepadPolling(
  device: DeviceType,
  onFrame: GamepadPollCallback,
  buttonMap: Record<number, ButtonName> = DEFAULT_GAMEPAD_BUTTON_MAP,
  directionMap: Record<number, GamepadDirectionKey> = DEFAULT_GAMEPAD_DIRECTION_MAP,
): () => void {
  let rafId: number;
  let stopped = false;
  let lastEmitted: GamepadFrameSnapshot | null = null;

  const tick = () => {
    if (stopped) return;
    const pads = navigator.getGamepads();
    const gamepad = pads.find((p) => p !== null);
    if (gamepad) {
      const snapshot = readGamepadSnapshot(gamepad, buttonMap, directionMap);
      if (!lastEmitted || !snapshotsEqual(lastEmitted, snapshot)) {
        lastEmitted = snapshot;
        onFrame(snapshot, device);
      }
    }
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
