/**
 * リアルタイム・キーディスプレイ
 *
 * 依存関係:
 * - src/store/useInputStore.ts のhistoryを購読する（監視処理そのものはuseInputWatcher()側にある）
 * - src/components/icons.tsx の DirectionIcon/ButtonIcon（矢印+N表記、拳/足アイコン）を使う
 * - src/types/index.ts の型を使用する
 *
 * historyには状態が変化するたびに1件記録される（ニュートラル/無ボタンの「なにも押していない」
 * 状態も含む）。原作（SF6実機の練習モード）の入力履歴表示に寄せ、縦一列・最新が最上段に
 * 積まれるレイアウトに統一している（横表示は廃止）。各入力を何フレーム保持していたかは
 * 実タイムスタンプの差分から算出してバッジ表示する（生のhistory自体は判定・分析用にそのまま保持する）。
 *
 * 「新しい入力を押すたびにスクロールしないと見えない」という不便さがあったため、
 * コンテナは常に最新入力（＝先頭）へ自動スクロールする。
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ButtonIcon, DirectionIcon } from "@/components/icons";
import { useInputStore } from "@/store/useInputStore";
import type { InputFrame } from "@/types";

const FRAME_MS = 1000 / 60;

interface DisplayEntry {
  frame: InputFrame;
  /** 次の入力に切り替わるまで何フレーム保持していたか（直後の入力がまだ無い最新分はnull） */
  holdFrames: number | null;
}

/** 「なにも押していない」ニュートラル状態かどうか */
function isIdle(frame: InputFrame): boolean {
  return frame.direction === 5 && frame.buttons.length === 0;
}

export function KeyDisplay() {
  const rawHistory = useInputStore((state) => state.history);
  const [showNeutral, setShowNeutral] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayEntries = useMemo<DisplayEntry[]>(() => {
    return rawHistory
      .map((frame, i) => {
        const next = rawHistory[i + 1];
        const holdFrames = next ? Math.round((next.timestamp - frame.timestamp) / FRAME_MS) : null;
        return { frame, holdFrames };
      })
      .filter((entry) => showNeutral || !isIdle(entry.frame));
  }, [rawHistory, showNeutral]);

  // 原作は最新入力を最上段に積み、古い入力は下へ流れて画面外へ消えていく。その見た目に合わせて
  // 配列を新しい順に並べ替える。
  const orderedEntries = [...displayEntries].reverse();

  // 新しい入力が追加されるたびに、最新（＝先頭）へ自動スクロールする。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [displayEntries]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showNeutral} onChange={(e) => setShowNeutral(e.target.checked)} />
          ニュートラルも表示
        </label>
      </div>
      <div
        ref={scrollRef}
        className="flex h-[30rem] w-full flex-col items-stretch overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950 p-2 font-mono"
      >
        {orderedEntries.length === 0 && (
          <p className="px-2 text-sm text-neutral-500">
            キーボード（WASD+UIOJKL）またはゲームパッドを入力してください
          </p>
        )}
        {orderedEntries.map(({ frame, holdFrames }) => (
          // 原作の入力履歴表示に合わせたレイアウト：
          // 左端に保持フレーム数（数字のみ）、続けて方向（水色）とボタン（強度で色分け）のアイコンを
          // 1行に並べる。行ごとの枠線・背景は付けず、暗いHUD風の背景の上に淡々と積み上げる。
          <div key={frame.frame} className="flex shrink-0 items-center gap-1.5 px-1 py-0.5 leading-none">
            <span className="w-7 shrink-0 text-right text-sm tabular-nums text-neutral-400">
              {holdFrames !== null ? holdFrames : ""}
            </span>
            <DirectionIcon direction={frame.direction} className="h-4 w-4 shrink-0 text-sky-400" />
            <span className="flex min-h-[16px] items-center gap-1">
              {frame.buttons.map((button) => (
                <ButtonIcon key={button} button={button} className="h-4 w-4" />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
