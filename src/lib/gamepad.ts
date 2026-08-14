/**
 * Gamepad API 監視・マッピング処理
 *
 * 依存関係:
 * - src/types/index.ts の ButtonName / DeviceType / DirectionValue を使用する
 * - src/components/KeyDisplay.tsx から呼び出される
 *
 * ブラウザはボタン押下の変化をイベントで通知しないため（Gamepad APIの仕様）、
 * requestAnimationFrameで毎フレームポーリングするのが標準的な検知方法。ただし実際に
 * 状態を読み取り・通知するのはFRAME_INTERVAL_MS（60fps固定）ごとに間引いている。
 * rAFのコールバック頻度はモニターのリフレッシュレートに同期するため、144Hz/240Hzの
 * ような高リフレッシュ環境ではコールバックが60fps相当より高頻度で発火し、実フレーム換算で
 * 1F未満の間隔で状態が変化したように見えてしまう（コントローラーで高速入力すると0Fが
 * 出るという報告の原因）。実機のスト6は入力を60fps固定で処理するため、モニターのHzに
 * 関わらずサンプリング頻度を常に60fps相当に揃える必要がある。
 *
 * 十字キー（方向）は index 12〜15（Standard Gamepad Mappingの一般的な配置）固定。
 * 十字キーの割り当て変更UIは複雑さの割に需要が薄いとの判断で見送り、6ボタン側の
 * 「押して設定」とゲームパッドテスターだけでコントローラーの疎通確認ができるようにしている。
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

const DPAD_BUTTON_INDEX = { up: 12, down: 13, left: 14, right: 15 } as const;

/** アナログスティックのデッドゾーン（この値未満の傾きは入力なしとみなす） */
const STICK_DEADZONE = 0.5;

/** 実機準拠の60fps固定間隔（ミリ秒）。モニターのリフレッシュレートに関わらずこの間隔でのみサンプリングする */
const FRAME_INTERVAL_MS = 1000 / 60;

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
): GamepadFrameSnapshot {
  const dpadUp = gamepad.buttons[DPAD_BUTTON_INDEX.up]?.pressed ?? false;
  const dpadDown = gamepad.buttons[DPAD_BUTTON_INDEX.down]?.pressed ?? false;
  const dpadLeft = gamepad.buttons[DPAD_BUTTON_INDEX.left]?.pressed ?? false;
  const dpadRight = gamepad.buttons[DPAD_BUTTON_INDEX.right]?.pressed ?? false;

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
    if (gamepad.buttons[Number(indexStr)]?.pressed) buttons.push(name);
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
): () => void {
  let rafId: number;
  let stopped = false;
  let lastEmitted: GamepadFrameSnapshot | null = null;
  let lastSampleTime = 0;

  const tick = (now: number) => {
    if (stopped) return;
    if (now - lastSampleTime >= FRAME_INTERVAL_MS) {
      lastSampleTime = now;
      const pads = navigator.getGamepads();
      const gamepad = pads.find((p) => p !== null);
      if (gamepad) {
        const snapshot = readGamepadSnapshot(gamepad, buttonMap);
        if (!lastEmitted || !snapshotsEqual(lastEmitted, snapshot)) {
          lastEmitted = snapshot;
          onFrame(snapshot, device);
        }
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
