/**
 * 効果音・メトロノーム
 *
 * 依存関係:
 * - src/store/useInputStore.ts の pushFrame から playInputTick() が呼ばれる（入力音）
 * - src/components/PracticeMode.tsx から playTierSound()/playFailSound() が呼ばれる（判定音）
 * - src/components/SoundControls.tsx から startMetronome()/stopMetronome() が呼ばれる
 *
 * 音源ファイルを一切使わず、Web Audio APIのOscillatorで都度音を合成する。
 * サーバー費用永久0円という運用方針上、音声アセットのホスティングを増やしたくないため。
 * AudioContextはブラウザの自動再生ポリシー上ユーザー操作前は生成できないことがあるため、
 * 呼び出し時に遅延生成し、suspended状態ならresumeを試みる（効果音なので失敗は握りつぶしてよい）。
 */
import type { SuccessTier } from "@/types";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function playTone(freq: number, durationMs: number, startAt = 0, gainValue = 0.15, type: OscillatorType = "sine") {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = audio.currentTime + startAt;
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

/** 入力状態が変化するたびに鳴らす、ごく短いクリック音 */
export function playInputTick() {
  playTone(1400, 12, 0, 0.05, "square");
}

/** ランクごとの和音（値が多いほど華やかなアルペジオになる） */
const TIER_FREQS: Record<SuccessTier, number[]> = {
  excellent: [1318.5, 1568.0, 1864.7, 2093.0], // E6-G6-A#6-C7 一番華やかな上昇アルペジオ
  perfect: [1046.5, 1318.5, 1568.0], // C6-E6-G6
  great: [880, 1108.7], // A5-C#6
  good: [659.3, 830.6], // E5-G#5
  ok: [523.3], // C5 単音
};

/** 技成立時、ランクに応じて異なる音を鳴らす */
export function playTierSound(tier: SuccessTier) {
  TIER_FREQS[tier].forEach((freq, i) => playTone(freq, 140, i * 0.06, 0.12, "triangle"));
}

/** 技が不成立（タイムアウト）だった時の音 */
export function playFailSound() {
  playTone(180, 220, 0, 0.12, "sawtooth");
}

let metronomeTimer: ReturnType<typeof setInterval> | null = null;
let metronomeBeat = 0;

/** 指定BPMでメトロノームを開始する（4拍子、1拍目だけアクセント音） */
export function startMetronome(bpm: number) {
  stopMetronome();
  metronomeBeat = 0;
  const intervalMs = 60000 / bpm;
  const tick = () => {
    const accent = metronomeBeat % 4 === 0;
    playTone(accent ? 1500 : 1000, 40, 0, accent ? 0.18 : 0.1, "square");
    metronomeBeat += 1;
  };
  tick();
  metronomeTimer = setInterval(tick, intervalMs);
}

/** メトロノームを止める */
export function stopMetronome() {
  if (metronomeTimer !== null) {
    clearInterval(metronomeTimer);
    metronomeTimer = null;
  }
}
