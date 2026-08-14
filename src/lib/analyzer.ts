/**
 * コマンド判定エンジン / ゴミ入力・要素抜け分析エンジン
 *
 * 依存関係:
 * - src/types/index.ts の各種型を使用する
 * - src/components/PracticeMode.tsx から createCommandMatcher() が呼び出される
 * - src/components/CommandAnalyzer.tsx から summarizeErrors() が呼び出される
 *
 * ストリーミング判定（createCommandMatcher）で成功/失敗・所要フレーム数・完成度ランクを計測し、
 * 試技中に記録された全フレームから余剰入力・要素抜け・SOCDズレ・完成遅延を検出する。
 */
import type {
  CommandAttemptResult,
  CommandDefinition,
  CommandStep,
  DeviceType,
  DirectionValue,
  ErrorAnalysisSummary,
  InputError,
  InputErrorType,
  InputFrame,
  SuccessTier,
} from "@/types";

/** 60fps換算の1フレームあたりのミリ秒（原作準拠のフレーム数表示に使う） */
const FRAME_MS = 1000 / 60;
/** この時間内にコマンドが完成しないと試技を失敗として打ち切る（ミリ秒） */
const ATTEMPT_TIMEOUT_MS = 2000;
/** ステップ間の遷移がこの時間を超えたら「完成速度の遅延」として警告する（ミリ秒） */
const SLOW_STEP_MS = 400;
/**
 * 方向が正しく入力された後、ボタンが少し遅れて押されても成立とみなす猶予（ミリ秒）。
 * 実機の格闘ゲームも数フレームの入力バッファを持つため、方向とボタンが完全に同フレーム
 * でないと不成立になる仕様は実際のプレイ感覚より厳しすぎる（ユーザーフィードバックにより追加）。
 */
const BUTTON_BUFFER_MS = 166; // 約10フレーム

function directionMatches(step: CommandStep, frame: InputFrame): boolean {
  return step.direction === undefined || frame.direction === step.direction;
}

function buttonsMatch(step: CommandStep, frame: InputFrame): boolean {
  const allRequiredPressed = !step.buttons || step.buttons.every((b) => frame.buttons.includes(b));
  const anyRequiredPressed = !step.anyButtons || step.anyButtons.some((b) => frame.buttons.includes(b));
  return allRequiredPressed && anyRequiredPressed;
}

function stepMatches(step: CommandStep, frame: InputFrame): boolean {
  return directionMatches(step, frame) && buttonsMatch(step, frame);
}

/**
 * 現在待っているステップがoptional（斜め通過点など）で、かつ今回のframeには一致しないが
 * その次のステップには直接一致するなら、optionalなステップを読み飛ばした後のindexを返す。
 * 実機のスト6でも236236のような複合コマンドは斜めが1回抜けても成立するため、
 * 判定器（feed）とエラー分析（detectErrors）の両方から同じ基準で参照する。
 */
function skipOptionalSteps(steps: CommandStep[], stepIndex: number, frame: InputFrame): number {
  let index = stepIndex;
  while (
    index < steps.length - 1 &&
    steps[index].optional &&
    !stepMatches(steps[index], frame) &&
    stepMatches(steps[index + 1], frame)
  ) {
    index += 1;
  }
  return index;
}

/** 所要フレーム数からランクを算出する。ステップ数が多いコマンド（超必殺技等）ほど閾値を緩める */
function tierFor(frameCount: number, stepCount: number): SuccessTier {
  if (frameCount <= stepCount * 1) return "excellent";
  if (frameCount <= stepCount * 3) return "perfect";
  if (frameCount <= stepCount * 7) return "great";
  if (frameCount <= stepCount * 11) return "good";
  return "ok";
}

export interface CommandMatcher {
  /** 1フレーム分の入力を投入する。技が成立/失敗した瞬間だけ結果を返す */
  feed: (frame: InputFrame) => CommandAttemptResult | null;
  reset: () => void;
}

export interface CommandMatcherOptions {
  /**
   * 実機同様、斜め通過点（optionalなステップ）の省略入力を許可するか。
   * falseにすると「簡易入力なしモード」として、全ステップを厳密に要求する（基礎練習向け）。
   * 省略時はtrue（実機準拠のデフォルト挙動）。
   */
  leniencyEnabled?: boolean;
}

/**
 * 指定したコマンドに対するストリーミング判定器を作る。
 * 入力フレームを feed() に流し込むと、コマンドの各ステップを順番に満たしているかを追跡し、
 * 成立（成功）またはタイムアウト（失敗）の瞬間にだけ CommandAttemptResult を返す。
 */
export function createCommandMatcher(command: CommandDefinition, options?: CommandMatcherOptions): CommandMatcher {
  const leniencyEnabled = options?.leniencyEnabled ?? true;
  let stepIndex = 0;
  let framesInAttempt: InputFrame[] = [];
  let startTimestamp = 0;
  /** 現在のステップの方向要素が最後に満たされた時刻（ボタン猶予判定に使う） */
  let lastDirectionMatchAt: number | null = null;

  const reset = () => {
    stepIndex = 0;
    framesInAttempt = [];
    startTimestamp = 0;
    lastDirectionMatchAt = null;
  };

  /** 方向は直近BUTTON_BUFFER_MS以内に満たされていればOK、ボタンは同フレームで必須 */
  const stepMatchesWithBuffer = (step: CommandStep, frame: InputFrame): boolean => {
    const directionOkNow = directionMatches(step, frame);
    if (directionOkNow) lastDirectionMatchAt = frame.timestamp;
    const withinBuffer = lastDirectionMatchAt !== null && frame.timestamp - lastDirectionMatchAt <= BUTTON_BUFFER_MS;
    return (directionOkNow || withinBuffer) && buttonsMatch(step, frame);
  };

  const buildResult = (success: boolean): CommandAttemptResult => {
    const last = framesInAttempt[framesInAttempt.length - 1];
    const durationMs = last ? last.timestamp - startTimestamp : 0;
    const frameCount = Math.round(durationMs / FRAME_MS);
    const errors = success ? detectErrors(command, framesInAttempt, leniencyEnabled) : [];
    const tier = success ? tierFor(frameCount, command.steps.length) : undefined;
    return { commandId: command.id, success, durationMs, frameCount, tier, frames: framesInAttempt, errors };
  };

  const feed = (frame: InputFrame): CommandAttemptResult | null => {
    if (stepIndex === 0) {
      if (!stepMatchesWithBuffer(command.steps[0], frame)) return null;
      startTimestamp = frame.timestamp;
      framesInAttempt = [frame];
      stepIndex = 1;
      lastDirectionMatchAt = null;
      return stepIndex === command.steps.length ? finish(true) : null;
    }

    if (frame.timestamp - startTimestamp > ATTEMPT_TIMEOUT_MS) {
      return finish(false);
    }

    framesInAttempt.push(frame);
    if (leniencyEnabled) stepIndex = skipOptionalSteps(command.steps, stepIndex, frame);
    if (stepMatchesWithBuffer(command.steps[stepIndex], frame)) {
      stepIndex += 1;
      lastDirectionMatchAt = null;
      if (stepIndex === command.steps.length) return finish(true);
    }
    return null;
  };

  function finish(success: boolean): CommandAttemptResult {
    const result = buildResult(success);
    reset();
    return result;
  }

  return { feed, reset };
}

// ─────────────────────────────────────────
// エラー検知
// ─────────────────────────────────────────

const DIRECTION_ADJACENCY: Record<DirectionValue, DirectionValue[]> = {
  1: [2, 4], 2: [1, 2, 3], 3: [2, 6],
  4: [1, 4, 7], 5: [5], 6: [3, 6, 9],
  7: [4, 8], 8: [7, 8, 9], 9: [6, 8],
};

/** frameの方向が、targetへ向かう途中の自然な経由方向（またはtarget自身）であればtrue */
function isExpectedTowards(frame: DirectionValue, target: DirectionValue): boolean {
  return frame === 5 || DIRECTION_ADJACENCY[target].includes(frame);
}

/**
 * 成立済みの試技（framesInAttempt = 開始〜完成までの全フレーム）から
 * 余剰入力・要素抜け・SOCDズレ・完成遅延を検出する。
 */
function detectErrors(command: CommandDefinition, frames: InputFrame[], leniencyEnabled: boolean): InputError[] {
  const errors: InputError[] = [];
  if (frames.length === 0) return errors;

  let stepIndex = 0;
  let stepStartTimestamp = frames[0].timestamp;

  for (const frame of frames) {
    if (leniencyEnabled) stepIndex = skipOptionalSteps(command.steps, stepIndex, frame);
    const step = command.steps[stepIndex];

    if (stepMatches(step, frame)) {
      const elapsed = frame.timestamp - stepStartTimestamp;
      if (elapsed > SLOW_STEP_MS) {
        errors.push({
          type: "slow-completion",
          stepIndex,
          detail: `ステップ${stepIndex + 1}の完成に${Math.round(elapsed)}ms要しました`,
        });
      }
      stepIndex += 1;
      stepStartTimestamp = frame.timestamp;
      continue;
    }

    if (step.direction !== undefined && frame.direction !== 5) {
      if (isExpectedTowards(frame.direction, step.direction)) continue;
      errors.push({
        type: "excess-input",
        stepIndex,
        direction: frame.direction,
        detail: `方向${step.direction}を狙う途中で不要な方向${frame.direction}が入力されました`,
      });
    }
  }

  const finalStep = command.steps[command.steps.length - 1];
  // optional（斜め通過点）は簡易入力モードでは経由しなくても正規の成立ルートなので、
  // その場合のみ「要素抜け」エラーの対象外にする（簡易入力なしモードでは通常のステップ同様に扱う）
  const requiredDirections = command.steps
    .filter((s) => !(leniencyEnabled && s.optional))
    .map((s) => s.direction)
    .filter((d): d is DirectionValue => d !== undefined);
  const seenDirections = new Set(frames.map((f) => f.direction));
  requiredDirections.forEach((dir, i) => {
    if (i > 0 && !seenDirections.has(dir) && dir !== finalStep.direction) {
      errors.push({ type: "dropped-element", stepIndex: i, direction: dir, detail: `方向${dir}の要素が抜けています` });
    }
  });

  return errors;
}

// ─────────────────────────────────────────
// エラー分析ダッシュボード用の集計
// ─────────────────────────────────────────

const ERROR_TYPES: InputErrorType[] = ["excess-input", "dropped-element", "socd-misalignment", "slow-completion"];

/** 複数の試行結果を集計し、ダッシュボード表示用のサマリーを作る */
export function summarizeErrors(attempts: CommandAttemptResult[]): ErrorAnalysisSummary {
  const countsByType = ERROR_TYPES.reduce(
    (acc, type) => ({ ...acc, [type]: 0 }),
    {} as Record<InputErrorType, number>,
  );
  const countsByDirection: Partial<Record<DirectionValue, number>> = {};

  for (const attempt of attempts) {
    for (const error of attempt.errors) {
      countsByType[error.type] += 1;
    }
  }

  for (const attempt of attempts) {
    for (const error of attempt.errors) {
      if (error.direction === undefined) continue;
      countsByDirection[error.direction] = (countsByDirection[error.direction] ?? 0) + 1;
    }
  }

  const attemptsByDevice: Partial<Record<DeviceType, number>> = {};
  for (const attempt of attempts) {
    const device = attempt.frames[0]?.device;
    if (!device) continue;
    attemptsByDevice[device] = (attemptsByDevice[device] ?? 0) + 1;
  }

  const successCount = attempts.filter((a) => a.success).length;

  return {
    countsByType,
    countsByDirection,
    attemptsByDevice,
    totalAttempts: attempts.length,
    successRate: attempts.length > 0 ? successCount / attempts.length : 0,
  };
}
