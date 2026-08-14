/**
 * リアルタイム・キーディスプレイ
 *
 * 依存関係:
 * - src/store/useInputStore.ts のhistoryを購読する（監視処理そのものはuseInputWatcher()側にある）
 * - src/components/icons.tsx の DirectionIcon/ButtonIcon（矢印+N表記、拳/足アイコン）を使う
 * - src/types/index.ts の型を使用する
 *
 * historyには状態が変化するたびに1件記録される（ニュートラル/無ボタンの「なにも押していない」
 * 状態も含む）。原作のコマンド履歴表示に寄せるため、このコンポーネントでは
 * ①意味を持たないニュートラル区間は表示せず実入力だけを並べる
 * ②各入力を何フレーム保持していたかを実タイムスタンプの差分から算出してバッジ表示する
 * という2点で見た目を整理している（生のhistory自体は判定・分析用にそのまま保持する）。
 *
 * 横表示・縦表示のどちらも「新しい入力を押すたびにスクロールしないと見えない」という
 * 不便さがあったため、コンテナは常にscrollTopベースで最新へ自動スクロールする
 * （横表示はflex-wrapで複数行に折り返すことで、1行スクロールに頼らず一度に20件前後を
 * 表示できるようにしている）。
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Columns3, Rows3 } from "lucide-react";
import { ButtonIcon, DirectionIcon } from "@/components/icons";
import { useInputStore } from "@/store/useInputStore";
import type { InputFrame } from "@/types";

type Layout = "horizontal" | "vertical";

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
  // 原作（SF6実機の練習モード）の入力履歴は縦一列・最新が最上段なので、それに寄せて縦表示を既定にする
  const [layout, setLayout] = useState<Layout>("vertical");
  const [showNeutral, setShowNeutral] = useState(false);
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

  const isVertical = layout === "vertical";

  // 原作は最新入力を最上段に積み、古い入力は下へ流れて画面外へ消えていく。
  // 縦表示ではその見た目に合わせて配列を新しい順に並べ替える（横表示は従来どおり古い→新しい）。
  const orderedEntries = isVertical ? [...displayEntries].reverse() : displayEntries;

  // 新しい入力が追加されるたびに最新へ自動スクロールする。
  // 縦表示は最新が先頭（上）に来るのでスクロール位置を一番上へ、横表示は末尾（右下）が最新なので一番下へ戻す。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = isVertical ? 0 : el.scrollHeight;
  }, [displayEntries, isVertical]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
        <button
          type="button"
          onClick={() => setLayout(isVertical ? "horizontal" : "vertical")}
          className="flex items-center gap-1 rounded border border-neutral-300 bg-white px-2 py-1 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
          title="表示方向を切り替え"
        >
          {isVertical ? <Rows3 className="h-3 w-3" /> : <Columns3 className="h-3 w-3" />}
          {isVertical ? "縦表示" : "横表示"}
        </button>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showNeutral} onChange={(e) => setShowNeutral(e.target.checked)} />
          ニュートラルも表示
        </label>
      </div>
      <div
        ref={scrollRef}
        className={
          isVertical
            ? "flex h-[30rem] w-full flex-col items-stretch overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950 p-2 font-mono"
            : "flex h-32 w-full flex-row flex-wrap content-start items-start gap-1 overflow-y-auto rounded-lg border border-neutral-300 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
        }
      >
        {orderedEntries.length === 0 && (
          <p className="px-2 text-sm text-neutral-500">
            キーボード（WASD+UIOJKL）またはゲームパッドを入力してください
          </p>
        )}
        {isVertical
          ? orderedEntries.map(({ frame, holdFrames }) => (
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
            ))
          : orderedEntries.map(({ frame, holdFrames }) => (
              <div
                key={frame.frame}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded border border-neutral-300 bg-neutral-100 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <DirectionIcon direction={frame.direction} className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="flex min-h-[14px] items-center gap-0.5">
                  {frame.buttons.map((button) => (
                    <ButtonIcon key={button} button={button} className="h-3.5 w-3.5" />
                  ))}
                </span>
                <span className="text-[9px] leading-none text-neutral-500">
                  {holdFrames !== null ? `${holdFrames}F` : ""}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
}
