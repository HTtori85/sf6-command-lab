/**
 * 練習モード・技選択UI
 *
 * 依存関係:
 * - src/data/commands.json のコマンドマスターデータを技選択肢として使う
 * - src/lib/analyzer.ts の createCommandMatcher() で入力ストリームを判定する
 * - src/store/useInputStore.ts のhistory（入力ログ）を読み、attempts（試行結果）に書き込む
 *
 * historyへの新規フレームをcreateCommandMatcher()へ1件ずつ流し込み、
 * 技が成立/タイムアウトした瞬間の結果だけをストアのattemptsへ積み上げる。
 * 成功時はフレーム数からEXCELLENT/PERFECT/GREAT/GOOD/OKのランクを付け、原作の練習モードに近い
 * 「速さの評価」を表示する（単純な成功/失敗の二択だと厳しすぎるというフィードバックへの対応）。
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import commandsData from "@/data/commands.json";
import { createCommandMatcher, type CommandMatcher } from "@/lib/analyzer";
import { formatFrameCount } from "@/lib/formatFrames";
import { stepsToArrowNotation } from "@/lib/notation";
import { playFailSound, playTierSound } from "@/lib/sound";
import { useInputStore } from "@/store/useInputStore";
import type { CommandDefinition, SuccessTier } from "@/types";

export const COMMANDS = commandsData as CommandDefinition[];
export const CHARACTER_LABELS: Record<string, string> = {
  ryu: "リュウ",
  ken: "ケン",
  luke: "ルーク",
  jamie: "ジェイミー",
  chunli: "春麗",
  guile: "ガイル",
  kimberly: "キンバリー",
  juri: "ジュリ",
  blanka: "ブランカ",
  dhalsim: "ダルシム",
  ehonda: "エドモンド本田",
  deejay: "ディージェイ",
  manon: "マノン",
  marisa: "マリーザ",
  jp: "JP",
  zangief: "ザンギエフ",
  lily: "リリー",
  cammy: "キャミィ",
  rashid: "ラシード",
  aki: "A.K.I.",
  ed: "エド",
  terry: "テリー",
  mai: "舞",
  elena: "エレナ",
  sagat: "サガット",
  cviper: "C.ヴァイパー",
  alex: "アレックス",
  ingrid: "イングリッド",
  yasmine: "ヤスミン",
};
export const CHARACTER_IDS = Array.from(new Set(COMMANDS.map((c) => c.characterId)));

const TIER_LABELS: Record<SuccessTier, string> = {
  excellent: "EXCELLENT",
  perfect: "PERFECT",
  great: "GREAT",
  good: "GOOD",
  ok: "OK",
};
const TIER_STYLES: Record<SuccessTier, string> = {
  excellent: "bg-fuchsia-900 text-fuchsia-300",
  perfect: "bg-amber-900 text-amber-300",
  great: "bg-emerald-900 text-emerald-400",
  good: "bg-sky-900 text-sky-300",
  ok: "bg-neutral-700 text-neutral-300",
};

interface TierExplanation {
  short: string;
  detail: string;
}

/** ランクの意味（簡単な説明＋詳細）。凡例パネルとバッジのtitle属性の両方に使う */
const TIER_EXPLANATIONS: Record<SuccessTier, TierExplanation> = {
  excellent: {
    short: "人間離れした最速入力",
    detail: "所要フレームが技のステップ数×1フレーム以内という、理論値に近い最速の入力です。ほぼ毎フレーム正しい入力を置けています。",
  },
  perfect: {
    short: "最速クラスの入力",
    detail: "コマンド成立までの所要フレームが短いランク（技のステップ数×3フレーム以内）。無駄のない最短ルートで入力できています。",
  },
  great: {
    short: "速い入力",
    detail: "PERFECTには僅かに届かないものの十分速い入力（ステップ数×4〜7フレーム）。実戦でも問題なく通用する速さです。",
  },
  good: {
    short: "標準的な速さ",
    detail: "技は成立しているが、もう少し速く入力できる余地があるランク（ステップ数×7〜11フレーム）。",
  },
  ok: {
    short: "成立はしたが遅め",
    detail: "コマンド自体は正しく成立していますが、時間がかかっています（ステップ数×11フレーム超）。焦らず正確な入力を意識してから、徐々に速さを上げましょう。",
  },
};

/** ランクの意味を説明する凡例パネル（開閉トグル） */
function TierLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        <HelpCircle className="h-3 w-3" />
        EX/PE/GR/GO/OKって何？
      </button>
      {open && (
        <dl className="mt-1.5 flex flex-col gap-1.5 rounded border border-neutral-200 bg-neutral-100/80 p-2 dark:border-neutral-800 dark:bg-neutral-900/60">
          {(Object.keys(TIER_LABELS) as SuccessTier[]).map((tier) => (
            <div key={tier} className="flex flex-col gap-0.5 text-[11px]">
              <dt className="flex items-center gap-1.5">
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${TIER_STYLES[tier]}`}>
                  {TIER_LABELS[tier].slice(0, 2)}
                </span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {TIER_LABELS[tier]}（{TIER_EXPLANATIONS[tier].short}）
                </span>
              </dt>
              <dd className="pl-1 text-neutral-500">{TIER_EXPLANATIONS[tier].detail}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function PracticeMode() {
  const [characterId, setCharacterId] = useState(CHARACTER_IDS[0] ?? "");
  const commandsForCharacter = useMemo(
    () => COMMANDS.filter((c) => c.characterId === characterId),
    [characterId],
  );
  const specials = useMemo(() => commandsForCharacter.filter((c) => c.category !== "super"), [commandsForCharacter]);
  const supers = useMemo(() => commandsForCharacter.filter((c) => c.category === "super"), [commandsForCharacter]);

  const [selectedId, setSelectedId] = useState(commandsForCharacter[0]?.id ?? "");
  const selectedCommand = useMemo(
    () => commandsForCharacter.find((c) => c.id === selectedId) ?? commandsForCharacter[0],
    [commandsForCharacter, selectedId],
  );

  /** キャラクター切替時、新しいキャラの技リストの先頭を選択し直す（setStateをイベント内で直接呼ぶ） */
  const handleCharacterChange = (nextCharacterId: string) => {
    setCharacterId(nextCharacterId);
    const nextCommands = COMMANDS.filter((c) => c.characterId === nextCharacterId);
    setSelectedId(nextCommands[0]?.id ?? "");
  };

  const history = useInputStore((state) => state.history);
  const addAttempt = useInputStore((state) => state.addAttempt);
  const attempts = useInputStore((state) => state.attempts);
  const resultSoundEnabled = useInputStore((state) => state.resultSoundEnabled);
  const leniencyEnabled = useInputStore((state) => state.leniencyEnabled);
  const setLeniencyEnabled = useInputStore((state) => state.setLeniencyEnabled);

  const matcherRef = useRef<CommandMatcher | null>(null);
  const lastFrameRef = useRef(-1);

  useEffect(() => {
    matcherRef.current = createCommandMatcher(selectedCommand, { leniencyEnabled });
    lastFrameRef.current = history[history.length - 1]?.frame ?? -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommand, leniencyEnabled]);

  useEffect(() => {
    const matcher = matcherRef.current;
    if (!matcher) return;
    const newFrames = history.filter((f) => f.frame > lastFrameRef.current);
    if (newFrames.length === 0) return;
    lastFrameRef.current = newFrames[newFrames.length - 1].frame;
    for (const frame of newFrames) {
      const result = matcher.feed(frame);
      if (result) {
        addAttempt(result);
        if (resultSoundEnabled) {
          if (result.success) playTierSound(result.tier ?? "ok");
          else playFailSound();
        }
      }
    }
  }, [history, addAttempt, resultSoundEnabled]);

  const commandAttempts = useMemo(
    () => attempts.filter((a) => a.commandId === selectedCommand.id),
    [attempts, selectedCommand.id],
  );
  const successAttempts = commandAttempts.filter((a) => a.success);
  const successRate = commandAttempts.length > 0 ? successAttempts.length / commandAttempts.length : 0;
  const avgFrameCount =
    successAttempts.length > 0
      ? successAttempts.reduce((sum, a) => sum + a.frameCount, 0) / successAttempts.length
      : 0;

  return (
    <section className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
      <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">練習モード</h2>

      <div className="mt-3 flex gap-2">
        <select
          className="w-28 shrink-0 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          value={characterId}
          onChange={(e) => handleCharacterChange(e.target.value)}
        >
          {CHARACTER_IDS.map((id) => (
            <option key={id} value={id}>
              {CHARACTER_LABELS[id] ?? id}
            </option>
          ))}
        </select>
        <select
          className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          value={selectedCommand.id}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <optgroup label="必殺技">
            {specials.map((command) => (
              <option key={command.id} value={command.id}>
                {command.name}（{command.notation}）
              </option>
            ))}
          </optgroup>
          {supers.length > 0 && (
            <optgroup label="超必殺技">
              {supers.map((command) => (
                <option key={command.id} value={command.id}>
                  {command.name}（{command.notation}）
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <p className="mt-1.5 text-xs text-neutral-500">
        矢印表記: <span className="font-mono text-neutral-300">{stepsToArrowNotation(selectedCommand.steps)}</span>
      </p>

      <label className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
        <input
          type="checkbox"
          checked={leniencyEnabled}
          onChange={(e) => setLeniencyEnabled(e.target.checked)}
        />
        簡易入力あり（実機同様、236236などの斜めを1回省略しても成立）
      </label>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-neutral-600 dark:text-neutral-400">
        <div className="rounded bg-neutral-100 p-2 dark:bg-neutral-900">
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{commandAttempts.length}</p>
          試行回数
        </div>
        <div className="rounded bg-neutral-100 p-2 dark:bg-neutral-900">
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{Math.round(successRate * 100)}%</p>
          成功率
        </div>
        <div className="rounded bg-neutral-100 p-2 dark:bg-neutral-900">
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {formatFrameCount(Math.round(avgFrameCount))}F
          </p>
          平均フレーム
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {commandAttempts.slice(-15).map((attempt, i) => (
          <div
            key={i}
            className={`flex h-6 min-w-6 items-center justify-center rounded px-1 text-[9px] font-bold ${
              attempt.success ? TIER_STYLES[attempt.tier ?? "ok"] : "bg-red-950 text-red-400"
            }`}
            title={
              attempt.success
                ? `${TIER_LABELS[attempt.tier ?? "ok"]} / ${formatFrameCount(attempt.frameCount)}F / エラー${attempt.errors.length}件`
                : `失敗 / エラー${attempt.errors.length}件`
            }
          >
            {attempt.success ? TIER_LABELS[attempt.tier ?? "ok"].slice(0, 2) : <X className="h-3.5 w-3.5" />}
          </div>
        ))}
        {commandAttempts.length === 0 && (
          <p className="text-xs text-neutral-500">コマンドを入力すると試行結果がここに表示されます</p>
        )}
      </div>

      <TierLegend />
    </section>
  );
}
