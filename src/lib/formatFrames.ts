/**
 * フレーム数の表示用フォーマット
 *
 * 依存関係:
 * - src/components/KeyDisplay.tsx（入力の保持フレーム数バッジ）
 * - src/components/PracticeMode.tsx（平均フレーム・各試行のフレーム数）
 *
 * KeyDisplayの保持フレーム数は「次の入力に切り替わるまでの実経過時間」から算出しているため、
 * コマンド判定のタイムアウト（2秒）と違って上限が無い。入力したまま長時間放置すると
 * 4桁の数字が出てバグのように見えてしまうため、表示上は99で頭打ちにする。
 */
const FRAME_DISPLAY_CAP = 99;

/** 99を超えたら "99+" と表示する（実際の値は変えず、見た目だけキャップする） */
export function formatFrameCount(frames: number): string {
  return frames > FRAME_DISPLAY_CAP ? `${FRAME_DISPLAY_CAP}+` : `${frames}`;
}
