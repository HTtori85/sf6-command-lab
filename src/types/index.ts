/**
 * スト6コマンド練習・分析ツール - 共通型定義
 *
 * このファイルが依存されるファイル:
 * - src/lib/gamepad.ts  (入力検知結果をこの型に整形する)
 * - src/lib/keyboard.ts (同上)
 * - src/lib/analyzer.ts (入力ログをこの型で受け取り、エラー分析結果を生成する)
 * - src/store/useInputStore.ts (状態として保持する入力ログ・練習結果の型)
 * - src/components/*.tsx (表示用の型として参照する)
 */

// ─────────────────────────────────────────
// 入力機器（デバイス）
// ─────────────────────────────────────────

/** 対応する入力デバイスの種類 */
export type DeviceType = "leverless" | "arcade-stick" | "pad" | "keyboard";

/** ゲームパッドのボタン番号をどの機種の見た目で表示するか */
export type GamepadLabelScheme = "ps5" | "xbox" | "switch";

/** 配色テーマ。systemはOS/ブラウザの設定に追従する */
export type ThemeMode = "light" | "dark" | "system";

// ─────────────────────────────────────────
// 方向・ボタン入力
// ─────────────────────────────────────────

/**
 * 方向をテンキー表記（1〜9）で表す。
 * 5 はニュートラル（方向入力なし）を表す。
 *
 * 7 8 9
 * 4 5 6
 * 1 2 3
 */
export type DirectionValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** スト6の基本ボタン種別（EX/OD発動やPPP/KKK等の同時押しは上位のコマンド判定側で扱う） */
export type ButtonName = "LP" | "MP" | "HP" | "LK" | "MK" | "HK";

/** 1フレーム分の入力状態のスナップショット */
export interface InputFrame {
  /** 何フレーム目か（練習開始からの通し番号） */
  frame: number;
  /** 発生時刻（performance.now()基準のミリ秒） */
  timestamp: number;
  /** そのフレームでの方向（テンキー表記） */
  direction: DirectionValue;
  /** そのフレームで押されているボタン一覧 */
  buttons: ButtonName[];
  /** 入力元デバイス */
  device: DeviceType;
}

// ─────────────────────────────────────────
// コマンドデータ（技表）
// ─────────────────────────────────────────

/** コマンドを構成する1ステップ（方向入力 or ボタン入力） */
export interface CommandStep {
  /** 方向要素（テンキー表記）。ボタンのみのステップではundefined */
  direction?: DirectionValue;
  /** ボタン要素（すべて同時押しが必要）。方向のみのステップではundefined */
  buttons?: ButtonName[];
  /**
   * ボタン要素（いずれか1つが押されていればOK）。
   * 必殺技は本来「弱中強どのパンチ/キックでも成立する」ため、多くのコマンドは
   * buttonsではなくこちらを使う（例: 波動拳なら ["LP","MP","HP"]）。
   */
  anyButtons?: ButtonName[];
  /**
   * このステップ（通常は斜め方向の通過点）を実際には経由せず、次のステップへ直接
   * 遷移しても成立とみなしてよいか。実機のスト6でも236236の斜めが1回抜けても
   * 成立する等、斜め通過点は必須ではないため、四角い動きの中間にある斜めステップに設定する。
   */
  optional?: boolean;
  /** 溜めコマンドの最低フレーム数（溜め入力を要するステップにのみ設定） */
  chargeFrames?: number;
}

/** 技の分類（練習モードの技リストで通常技/超必殺技をグループ分けするために使う） */
export type CommandCategory = "special" | "super";

/** 技コマンドの定義（公式技表ベースのマスターデータの1レコード） */
export interface CommandDefinition {
  /** コマンドの一意ID（例: "yashin_hadoken"） */
  id: string;
  /** キャラクターID（例: "yashin"） */
  characterId: string;
  /** 技名（例: "波動拳"） */
  name: string;
  /** 表示用コマンド表記（例: "236P"） */
  notation: string;
  /** 判定に使うコマンドのステップ列 */
  steps: CommandStep[];
  /** 技の分類。省略時は必殺技（special）として扱う */
  category?: CommandCategory;
}

// ─────────────────────────────────────────
// 入力判定・エラー分析
// ─────────────────────────────────────────

/** 入力エラーの種類（要件4-Cのエラータイプに対応） */
export type InputErrorType =
  | "excess-input" // 余剰入力（ゴミ入力）
  | "dropped-element" // 要素抜け（斜め抜け）
  | "socd-misalignment" // SOCD同時押しズレ
  | "slow-completion"; // 完成速度の遅延

/** 検出された1件の入力エラー */
export interface InputError {
  type: InputErrorType;
  /** エラーが発生したコマンドステップのインデックス */
  stepIndex: number;
  /** 余剰入力・要素抜けの対象方向（該当する場合のみ。ダッシュボードの方向別ランキング集計に使う） */
  direction?: DirectionValue;
  /** 詳細説明（UI表示用） */
  detail: string;
}

/**
 * 完成速度の評価ランク（原作の「PERFECT/GREAT/GOOD」のような表示用）。
 * 失敗時はtierを付けない。
 */
export type SuccessTier = "excellent" | "perfect" | "great" | "good" | "ok";

/** 1回のコマンド入力試行の判定結果 */
export interface CommandAttemptResult {
  commandId: string;
  /** 判定成功したか */
  success: boolean;
  /** 入力開始から完成までの所要時間（ミリ秒） */
  durationMs: number;
  /** 入力開始から完成までのフレーム数（60fps換算） */
  frameCount: number;
  /** 完成速度の評価ランク（成功時のみ） */
  tier?: SuccessTier;
  /** 試行中に記録された入力フレーム列 */
  frames: InputFrame[];
  /** 検出されたエラー一覧 */
  errors: InputError[];
}

/** エラー分析ダッシュボード用の集計データ */
export interface ErrorAnalysisSummary {
  /** エラータイプごとの発生回数 */
  countsByType: Record<InputErrorType, number>;
  /** 方向ごとの余剰入力・抜け発生回数（テンキー1-9をキーとする） */
  countsByDirection: Partial<Record<DirectionValue, number>>;
  /** デバイスごとの試行回数（デバイス別プロファイル比較用） */
  attemptsByDevice: Partial<Record<DeviceType, number>>;
  /** 集計対象の試行数 */
  totalAttempts: number;
  /** 成功率（0〜1） */
  successRate: number;
}
