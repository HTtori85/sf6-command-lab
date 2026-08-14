/**
 * サウンド設定（入力音・判定音のON/OFF、メトロノーム）
 *
 * 依存関係:
 * - src/store/useInputStore.ts の inputSoundEnabled/resultSoundEnabled/metronomeBpm/metronomeOn を読み書きする
 * - src/lib/sound.ts の startMetronome()/stopMetronome() を、metronomeOn/metronomeBpmの変化に合わせて呼ぶ
 *
 * 判定音自体（PERFECT等ランク別の音・失敗音）はPracticeMode側で結果が出た瞬間に鳴らす。
 * ここではON/OFFの設定とメトロノームの再生制御のみを担当する。
 */
"use client";

import { useEffect } from "react";
import { Music, Volume2 } from "lucide-react";
import { startMetronome, stopMetronome } from "@/lib/sound";
import { useInputStore } from "@/store/useInputStore";

export function SoundControls() {
  const inputSoundEnabled = useInputStore((state) => state.inputSoundEnabled);
  const resultSoundEnabled = useInputStore((state) => state.resultSoundEnabled);
  const metronomeBpm = useInputStore((state) => state.metronomeBpm);
  const metronomeOn = useInputStore((state) => state.metronomeOn);
  const setInputSoundEnabled = useInputStore((state) => state.setInputSoundEnabled);
  const setResultSoundEnabled = useInputStore((state) => state.setResultSoundEnabled);
  const setMetronomeBpm = useInputStore((state) => state.setMetronomeBpm);
  const setMetronomeOn = useInputStore((state) => state.setMetronomeOn);

  useEffect(() => {
    if (!metronomeOn) return;
    startMetronome(metronomeBpm);
    return () => stopMetronome();
  }, [metronomeOn, metronomeBpm]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
      <span className="flex items-center gap-1 text-neutral-500">
        <Volume2 className="h-3.5 w-3.5" /> サウンド
      </span>
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={inputSoundEnabled}
          onChange={(e) => setInputSoundEnabled(e.target.checked)}
        />
        入力音
      </label>
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={resultSoundEnabled}
          onChange={(e) => setResultSoundEnabled(e.target.checked)}
        />
        判定音
      </label>
      <span className="mx-1 h-4 w-px bg-neutral-300 dark:bg-neutral-700" />
      <span className="flex items-center gap-1 text-neutral-500">
        <Music className="h-3.5 w-3.5" /> メトロノーム
      </span>
      <input
        type="number"
        min={40}
        max={300}
        value={metronomeBpm}
        onChange={(e) => e.target.value !== "" && setMetronomeBpm(Number(e.target.value))}
        className="w-16 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
      />
      <span className="text-neutral-500">BPM</span>
      <button
        type="button"
        onClick={() => setMetronomeOn(!metronomeOn)}
        className={`rounded px-2 py-1 font-semibold ${
          metronomeOn
            ? "bg-emerald-700 text-neutral-50"
            : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
        }`}
      >
        {metronomeOn ? "停止" : "再生"}
      </button>
    </div>
  );
}
