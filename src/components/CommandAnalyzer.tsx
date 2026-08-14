/**
 * エラー分析・ダッシュボード表示
 *
 * 依存関係:
 * - src/lib/analyzer.ts の summarizeErrors() で src/store/useInputStore.ts の attempts を集計する
 * - src/components/DeviceSelector.tsx の DEVICE_LABELS を表示ラベルとして再利用する
 *
 * 各グラフは「1系列・1指標のランキング」なので、色は単一色（emerald、アプリ全体のアクセント色と統一）を
 * 使い、系列識別のための色分けはしない（1系列にレジェンドは不要というダッシュボード設計の原則に従う）。
 * 値は常にバー横に直接ラベル表示し、ホバーに依存せず読み取れるようにしている。
 */
"use client";

import { useMemo, useState } from "react";
import { DEVICE_LABELS } from "@/components/DeviceSelector";
import { COMMANDS } from "@/components/PracticeMode";
import { summarizeErrors } from "@/lib/analyzer";
import { useInputStore } from "@/store/useInputStore";
import type { DeviceType, DirectionValue, InputErrorType } from "@/types";

const ALL_TECHNIQUES = "all";

const ERROR_TYPE_LABELS: Record<InputErrorType, string> = {
  "excess-input": "余剰入力（ゴミ入力）",
  "dropped-element": "要素抜け（斜め抜け）",
  "socd-misalignment": "SOCD同時押しズレ",
  "slow-completion": "完成速度の遅延",
};

const DIRECTION_NOTATION: Record<DirectionValue, string> = {
  1: "1（↙）", 2: "2（↓）", 3: "3（↘）",
  4: "4（←）", 5: "5（N）", 6: "6（→）",
  7: "7（↖）", 8: "8（↑）", 9: "9（↗）",
};

interface RankingRow {
  key: string;
  label: string;
  value: number;
}

/** 単一指標のランキングバー。1系列のみなので色分けせず、値を常に直接ラベル表示する */
function RankingBars({ rows, emptyLabel }: { rows: RankingRow[]; emptyLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (rows.length === 0) {
    return <p className="text-xs text-neutral-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <span className="w-32 shrink-0 truncate text-xs text-neutral-600 dark:text-neutral-400">{row.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs tabular-nums text-neutral-700 dark:text-neutral-300">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CommandAnalyzer() {
  const attempts = useInputStore((state) => state.attempts);
  const [filterCommandId, setFilterCommandId] = useState<string>(ALL_TECHNIQUES);

  const filteredAttempts = useMemo(
    () => (filterCommandId === ALL_TECHNIQUES ? attempts : attempts.filter((a) => a.commandId === filterCommandId)),
    [attempts, filterCommandId],
  );
  const summary = useMemo(() => summarizeErrors(filteredAttempts), [filteredAttempts]);

  const errorTypeRows: RankingRow[] = (Object.keys(ERROR_TYPE_LABELS) as InputErrorType[])
    .map((type) => ({ key: type, label: ERROR_TYPE_LABELS[type], value: summary.countsByType[type] }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const directionRows: RankingRow[] = (Object.entries(summary.countsByDirection) as [string, number][])
    .map(([direction, value]) => ({
      key: direction,
      label: DIRECTION_NOTATION[Number(direction) as DirectionValue],
      value,
    }))
    .sort((a, b) => b.value - a.value);

  const deviceRows: RankingRow[] = (Object.entries(summary.attemptsByDevice) as [DeviceType, number][])
    .map(([device, value]) => ({ key: device, label: DEVICE_LABELS[device], value }))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">エラー分析ダッシュボード</h2>
        <select
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          value={filterCommandId}
          onChange={(e) => setFilterCommandId(e.target.value)}
        >
          <option value={ALL_TECHNIQUES}>全体（すべての技）</option>
          {COMMANDS.map((command) => (
            <option key={command.id} value={command.id}>
              {command.name}（{command.notation}）
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs text-neutral-600 dark:text-neutral-400">
        <div className="rounded bg-neutral-100 p-2 dark:bg-neutral-900">
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{summary.totalAttempts}</p>
          総試行数
        </div>
        <div className="rounded bg-neutral-100 p-2 dark:bg-neutral-900">
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {Math.round(summary.successRate * 100)}%
          </p>
          全体成功率
        </div>
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          ミス頻度ランキング（エラータイプ別）
        </h3>
        <RankingBars rows={errorTypeRows} emptyLabel="まだエラーは検出されていません" />
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          方向別ミス頻度（余剰入力・要素抜け）
        </h3>
        <RankingBars rows={directionRows} emptyLabel="まだ方向別のエラーは検出されていません" />
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          デバイス別プロファイル（試行回数）
        </h3>
        <RankingBars rows={deviceRows} emptyLabel="まだ試行記録がありません" />
      </div>
    </section>
  );
}
