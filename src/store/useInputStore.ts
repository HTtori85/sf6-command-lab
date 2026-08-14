/**
 * 入力ログ・練習結果・設定状態を保持するZustandストア
 *
 * 依存関係:
 * - src/types/index.ts の InputFrame / DeviceType / ButtonName / DirectionValue / CommandAttemptResult を使用する
 * - src/lib/keyboard.ts / src/lib/gamepad.ts の監視処理・デフォルトボタンマップを使う
 * - src/lib/sound.ts の入力音を、状態変化のあったフレームでのみ鳴らす
 * - src/app/page.tsx がuseInputWatcher()を1回だけマウントし、入力ログをストアへ流し込む
 * - src/components/KeyDisplay.tsx / PracticeMode.tsx / CommandAnalyzer.tsx / DeviceSelector.tsx が
 *   history/attempts/設定値を読み書きする
 *
 * キーボード・ゲームパッドの監視をここに集約するのは、KeyDisplay（表示）とPracticeMode（判定）が
 * 同じ入力ストリームを必要とするため。監視処理をコンポーネントごとに持たせると二重に
 * イベントリスナーが張られてしまう。
 *
 * 設定（device・ボタンマッピング・サウンド設定等）のみ zustand/persist で LocalStorage に保存する。
 * history/attempts は毎セッションの一時ログなので永続化対象に含めない（肥大化を防ぐため）。
 * Next.jsの静的プリレンダリング時にlocalStorageへアクセスするとビルドが失敗するため、
 * skipHydration:true にして復元処理をuseInputWatcher()内のuseEffect（クライアント専用）に委譲している。
 */
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_GAMEPAD_BUTTON_MAP, startGamepadPolling } from "@/lib/gamepad";
import { DEFAULT_KEYBOARD_BUTTON_MAP, DEFAULT_KEYBOARD_DIRECTION_MAP, startKeyboardWatch } from "@/lib/keyboard";
import { playInputTick } from "@/lib/sound";
import type {
  ButtonName,
  CommandAttemptResult,
  DeviceType,
  DirectionValue,
  GamepadLabelScheme,
  InputFrame,
  ThemeMode,
} from "@/types";

/**
 * キーディスプレイに表示する入力履歴の最大保持件数。
 * keyboard.ts/gamepad.tsが状態変化時のみ通知するようになった（同一状態の重複フレームを送らない）ため、
 * 60件では「もっと表示したい」という要望に対して短すぎた。1件=実際に踏んだ状態遷移1回分なので、
 * 増やしても表示が重くなりにくい。
 */
const MAX_HISTORY = 300;
/** ダッシュボード集計対象として保持する試行結果の最大件数 */
const MAX_ATTEMPTS = 200;

let frameCounter = 0;

interface InputState {
  /** ユーザーが選択中の入力機器（ゲームパッド由来フレームのサブ分類に使う。キーボードは常にkeyboard） */
  device: DeviceType;
  history: InputFrame[];
  attempts: CommandAttemptResult[];
  keyboardButtonMap: Record<string, ButtonName>;
  gamepadButtonMap: Record<number, ButtonName>;
  /** ゲームパッドのボタン番号をPS5/Xbox/Switchどの表記でラベル表示するか */
  gamepadLabelScheme: GamepadLabelScheme;
  /** 入力のたびに操作音を鳴らすか */
  inputSoundEnabled: boolean;
  /** 技成立/失敗時に判定音を鳴らすか */
  resultSoundEnabled: boolean;
  /** メトロノームのテンポ（BPM） */
  metronomeBpm: number;
  /** メトロノーム再生中か */
  metronomeOn: boolean;
  /** 配色テーマ（light/dark/system） */
  theme: ThemeMode;
  /** 実機同様、斜め通過点の省略入力（簡易入力）を許可するか。falseなら厳密な全ステップ入力を要求する */
  leniencyEnabled: boolean;
  setDevice: (device: DeviceType) => void;
  pushFrame: (direction: DirectionValue, buttons: ButtonName[], device: DeviceType) => void;
  addAttempt: (result: CommandAttemptResult) => void;
  clearHistory: () => void;
  clearAttempts: () => void;
  resetAll: () => void;
  setKeyboardKeyForButton: (button: ButtonName, code: string) => void;
  setGamepadIndexForButton: (button: ButtonName, index: number) => void;
  setGamepadLabelScheme: (scheme: GamepadLabelScheme) => void;
  setInputSoundEnabled: (enabled: boolean) => void;
  setResultSoundEnabled: (enabled: boolean) => void;
  setMetronomeBpm: (bpm: number) => void;
  setMetronomeOn: (on: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setLeniencyEnabled: (enabled: boolean) => void;
}

export const useInputStore = create<InputState>()(
  persist(
    (set) => ({
      device: "keyboard",
      history: [],
      attempts: [],
      keyboardButtonMap: DEFAULT_KEYBOARD_BUTTON_MAP,
      gamepadButtonMap: DEFAULT_GAMEPAD_BUTTON_MAP,
      gamepadLabelScheme: "ps5",
      inputSoundEnabled: true,
      resultSoundEnabled: true,
      metronomeBpm: 120,
      metronomeOn: false,
      theme: "system",
      leniencyEnabled: true,
      setDevice: (device) => set({ device }),
      pushFrame: (direction, buttons, device) =>
        set((state) => {
          const frame: InputFrame = {
            frame: frameCounter++,
            timestamp: performance.now(),
            direction,
            buttons,
            device,
          };
          if (state.inputSoundEnabled) playInputTick();
          return { history: [...state.history, frame].slice(-MAX_HISTORY) };
        }),
      addAttempt: (result) =>
        set((state) => ({ attempts: [...state.attempts, result].slice(-MAX_ATTEMPTS) })),
      clearHistory: () => set({ history: [] }),
      clearAttempts: () => set({ attempts: [] }),
      resetAll: () => set({ history: [], attempts: [] }),
      setKeyboardKeyForButton: (button, code) =>
        set((state) => {
          const next: Record<string, ButtonName> = {};
          for (const [c, b] of Object.entries(state.keyboardButtonMap)) {
            if (b !== button) next[c] = b;
          }
          next[code] = button;
          return { keyboardButtonMap: next };
        }),
      setGamepadIndexForButton: (button, index) =>
        set((state) => {
          const next: Record<number, ButtonName> = {};
          for (const [i, b] of Object.entries(state.gamepadButtonMap)) {
            if (b !== button) next[Number(i)] = b;
          }
          next[index] = button;
          return { gamepadButtonMap: next };
        }),
      setGamepadLabelScheme: (scheme) => set({ gamepadLabelScheme: scheme }),
      setInputSoundEnabled: (enabled) => set({ inputSoundEnabled: enabled }),
      setResultSoundEnabled: (enabled) => set({ resultSoundEnabled: enabled }),
      setMetronomeBpm: (bpm) => set({ metronomeBpm: bpm }),
      setMetronomeOn: (on) => set({ metronomeOn: on }),
      setTheme: (theme) => set({ theme }),
      setLeniencyEnabled: (enabled) => set({ leniencyEnabled: enabled }),
    }),
    {
      name: "sf6-command-lab-settings",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        device: state.device,
        keyboardButtonMap: state.keyboardButtonMap,
        gamepadButtonMap: state.gamepadButtonMap,
        gamepadLabelScheme: state.gamepadLabelScheme,
        inputSoundEnabled: state.inputSoundEnabled,
        resultSoundEnabled: state.resultSoundEnabled,
        metronomeBpm: state.metronomeBpm,
        theme: state.theme,
        leniencyEnabled: state.leniencyEnabled,
      }),
    },
  ),
);

/**
 * キーボードとゲームパッドの監視を開始し、入力フレームをストアへpushし続けるフック。
 * アプリ全体で1箇所（app/page.tsx）だけでマウントすること。
 * マウント時にLocalStorageから設定（ボタンマッピング等）を復元する。
 */
export function useInputWatcher() {
  const pushFrame = useInputStore((state) => state.pushFrame);
  const keyboardButtonMap = useInputStore((state) => state.keyboardButtonMap);
  const gamepadButtonMap = useInputStore((state) => state.gamepadButtonMap);
  const deviceRef = useRef(useInputStore.getState().device);

  useEffect(() => {
    useInputStore.persist.rehydrate();
  }, []);

  useEffect(() => useInputStore.subscribe((state) => { deviceRef.current = state.device; }), []);

  useEffect(() => {
    const stopKeyboard = startKeyboardWatch(
      (snapshot) => pushFrame(snapshot.direction, snapshot.buttons, "keyboard"),
      DEFAULT_KEYBOARD_DIRECTION_MAP,
      keyboardButtonMap,
    );
    const stopGamepad = startGamepadPolling(
      "pad",
      (snapshot) => {
        const selected = deviceRef.current;
        const gamepadDevice: DeviceType = selected === "keyboard" ? "pad" : selected;
        pushFrame(snapshot.direction, snapshot.buttons, gamepadDevice);
      },
      gamepadButtonMap,
    );
    return () => {
      stopKeyboard();
      stopGamepad();
    };
  }, [pushFrame, keyboardButtonMap, gamepadButtonMap]);
}
