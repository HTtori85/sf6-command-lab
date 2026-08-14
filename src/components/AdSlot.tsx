/**
 * Google AdSense 広告ユニット（手動配置用・現状未使用）
 *
 * 依存関係:
 * - src/lib/adsense.ts の ADSENSE_CLIENT_ID を使う
 * - src/app/layout.tsx がAdSenseの読み込みスクリプトを設置する（自動広告用。このコンポーネントとは独立）
 *
 * 今は自動広告（layout.tsxのスクリプトのみ）でGoogleが最適な位置に自動配置しているため、
 * このコンポーネントはどこからも呼ばれていない。特定の位置に手動で広告ユニットを置きたく
 * なった場合、AdSenseダッシュボードで広告ユニットを作成して発行されるslot番号を渡せば使える。
 */
"use client";

import { useEffect, useId } from "react";
import { ADSENSE_CLIENT_ID } from "@/lib/adsense";

interface AdSlotProps {
  /** AdSenseの広告ユニット作成時に発行されるslot番号 */
  slot: string;
  className?: string;
}

export function AdSlot({ slot, className }: AdSlotProps) {
  const id = useId();

  useEffect(() => {
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ?? [];
      adsbygoogle.push({});
      (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle = adsbygoogle;
    } catch {
      // AdSenseスクリプト未読み込み時などは何もしない（広告が出ないだけで致命的ではない）
    }
  }, [id]);

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
