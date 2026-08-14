/**
 * 簡易入力表（省略入力のコツ一覧）
 *
 * 依存関係: なし（静的な参考情報パネル）
 *
 * 「離して押す」動作は指の構造上どうしても遅くなるため、格闘ゲームでは実機の判定が
 * 斜め通過点を必須にしていない性質を利用し、指を保持したまま次の指を弾く入力が
 * 昔から使われている（レバーレス勢の間で特に浸透している考え方）。本アプリの判定エンジンも
 * 「簡易入力あり」設定でこの性質（斜め省略）を再現しているので、ここで紹介する入力は
 * 実際にこのアプリ上でも成立する。
 */
"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

interface GuideRow {
  category: string;
  notation: string;
  tip: string;
}

const ROWS: GuideRow[] = [
  {
    category: "波動拳系（236+P）",
    notation: "↓↘→+P",
    tip: "下を押したまま指をそのまま右へ滑らせ、最後だけ弾くように離す。慣れたら斜めを経由せず「↓→+P」でも成立する（本アプリの簡易入力ありでも認識）。",
  },
  {
    category: "竜巻旋風脚系（214+K）",
    notation: "↓↙←+K",
    tip: "波動拳と同じ要領で、下→後ろへ滑らせる。斜めを飛ばして「↓←+K」でも成立する。",
  },
  {
    category: "昇竜拳系（623+P）",
    notation: "→↓↘+P",
    tip: "前を保持したまま下へ落とし、最後の斜め前下でボタンを弾く。前と下を一度に踏んで最後だけ指を動かす感覚。",
  },
  {
    category: "半回転系（63214等）",
    notation: "→↘↓↙←+P/K",
    tip: "前から後ろへ一直線に指を滑らせるだけ。途中の斜め（2箇所）は経由しなくても成立する。",
  },
  {
    category: "二重回転系（236236等のSA）",
    notation: "↓↘→↓↘→+P/K",
    tip: "1回目の斜めは省略しても成立する（例: 236236 → 26236でも可）。後ろを保持したまま前後を素早く2回弾くイメージ。",
  },
];

/** 簡易入力（省略入力）のコツをまとめた参考表。開閉トグル */
export function SimplifiedInputGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-neutral-800 dark:text-neutral-200"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <BookOpen className="h-3.5 w-3.5" />
          簡易入力表（省略入力のコツ）
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3 text-xs">
          <p className="text-neutral-500">
            格闘ゲームのコマンド判定は、実は斜め方向を必ず経由しなくても成立するようにできている（本アプリの「簡易入力あり」設定も同様）。この性質を利用し、一度押した指を離さずに次の指を弾くだけで技を出すのが「簡易入力（省略入力）」。指を「離してもう一度押す」動作は物理的に遅くなりやすいため、押しっぱなしで済む入力ほど速く安定しやすい。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-300 text-neutral-500 dark:border-neutral-700">
                  <th className="py-1.5 pr-2 font-semibold">技の系統</th>
                  <th className="py-1.5 pr-2 font-semibold">基本表記</th>
                  <th className="py-1.5 font-semibold">簡易入力のコツ</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.category} className="border-b border-neutral-200 align-top dark:border-neutral-800">
                    <td className="py-2 pr-2 font-semibold text-neutral-800 dark:text-neutral-200">
                      {row.category}
                    </td>
                    <td className="py-2 pr-2 font-mono whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {row.notation}
                    </td>
                    <td className="py-2 text-neutral-600 dark:text-neutral-400">{row.tip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
