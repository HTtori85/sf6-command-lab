/**
 * KeyboardEvent 監視ロジック
 *
 * 依存関係:
 * - src/types/index.ts の DirectionValue / ButtonName を使用する
 * - src/components/KeyDisplay.tsx から呼び出される
 *
 * 押下中キーの集合はkeydown/keyupで即座に更新するが、判定器へ通知するのは
 * 60fps相当に量子化したタイミングのみ（gamepad.tsと同じ方式）。
 * 生イベントのたびに通知すると、1実フレーム未満の間だけ存在した方向（0F）が
 * コマンド成立の1ステップとして扱われてしまい、実機では出ない技がPERFECT判定される
 * バグになっていた（ユーザー報告：波動拳が0F入力の組み合わせでPERFECT扱いになるが
 * 実際には他の技が暴発してハドウケンが出ない）。
 *
 * サンプリングの基準はrequestAnimationFrameのコールバック回数ではなく、実経過時間
 * （FRAME_INTERVAL_MSごと）にしている。rAFはモニターのリフレッシュレートに同期するため、
 * 144Hz/240Hzのような高リフレッシュ環境ではコールバックが60fps相当より高頻度で発火し、
 * 実フレーム換算で1F未満の間隔で状態が変化したように見えてしまう（ゲームパッドの高速入力で
 * 0Fが出るという報告の原因）。実機のスト6は入力を60fps固定で処理するため、こちらの
 * サンプリング頻度もモニターのHzに関わらず常に60fps相当に揃える必要がある。
 */
import type { ButtonName, DirectionValue } from "@/types";

type DirectionKey = "up" | "down" | "left" | "right";

/** レバーレス配置（WASD）を基準としたデフォルトの方向キーマッピング */
export const DEFAULT_KEYBOARD_DIRECTION_MAP: Record<string, DirectionKey> = {
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

/** デフォルトのボタンキーマッピング（6ボタン格闘ゲーム配置） */
export const DEFAULT_KEYBOARD_BUTTON_MAP: Record<string, ButtonName> = {
  KeyU: "LP",
  KeyI: "MP",
  KeyO: "HP",
  KeyJ: "LK",
  KeyK: "MK",
  KeyL: "HK",
};

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

export interface KeyboardFrameSnapshot {
  direction: DirectionValue;
  buttons: ButtonName[];
}

/** 実機準拠の60fps固定間隔（ミリ秒）。モニターのリフレッシュレートに関わらずこの間隔でのみサンプリングする */
const FRAME_INTERVAL_MS = 1000 / 60;

/**
 * keydown/keyupを監視し、押下中キー集合が変化するたびに現在の方向・ボタン状態を
 * onFrame に通知するリスナーを登録する。
 * @returns 監視を解除する関数
 */
function snapshotsEqual(a: KeyboardFrameSnapshot, b: KeyboardFrameSnapshot): boolean {
  return (
    a.direction === b.direction &&
    a.buttons.length === b.buttons.length &&
    a.buttons.every((btn) => b.buttons.includes(btn))
  );
}

export function startKeyboardWatch(
  onFrame: (snapshot: KeyboardFrameSnapshot) => void,
  directionMap: Record<string, DirectionKey> = DEFAULT_KEYBOARD_DIRECTION_MAP,
  buttonMap: Record<string, ButtonName> = DEFAULT_KEYBOARD_BUTTON_MAP,
): () => void {
  const pressedKeys = new Set<string>();
  let lastEmitted: KeyboardFrameSnapshot | null = null;
  let rafId: number;
  let stopped = false;
  let lastSampleTime = 0;

  const sample = (): KeyboardFrameSnapshot => {
    const isDown = (code: string) => pressedKeys.has(code);
    const dirEntries = Object.entries(directionMap);
    const up = dirEntries.some(([code, dir]) => dir === "up" && isDown(code));
    const down = dirEntries.some(([code, dir]) => dir === "down" && isDown(code));
    const left = dirEntries.some(([code, dir]) => dir === "left" && isDown(code));
    const right = dirEntries.some(([code, dir]) => dir === "right" && isDown(code));

    const buttons: ButtonName[] = [];
    for (const [code, name] of Object.entries(buttonMap)) {
      if (isDown(code) && !buttons.includes(name)) buttons.push(name);
    }

    return { direction: dpadToDirection(up, down, left, right), buttons };
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    pressedKeys.add(e.code);
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    pressedKeys.delete(e.code);
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  const tick = (now: number) => {
    if (stopped) return;
    if (now - lastSampleTime >= FRAME_INTERVAL_MS) {
      lastSampleTime = now;
      const snapshot = sample();
      if (!lastEmitted || !snapshotsEqual(lastEmitted, snapshot)) {
        lastEmitted = snapshot;
        onFrame(snapshot);
      }
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  };
}
