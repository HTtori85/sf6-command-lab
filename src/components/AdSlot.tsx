/**
 * Google AdSense 広告枠
 *
 * 依存関係:
 * - NEXT_PUBLIC_ADSENSE_CLIENT_ID 環境変数（Vercelのプロジェクト設定で追加する）
 * - src/app/layout.tsx でAdSenseの読み込みスクリプトを読み込む（同じ環境変数で判定）
 *
 * AdSenseの審査が通ってパブリッシャーID（ca-pub-で始まる番号）が発行されるまでは
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID が未設定のため、このコンポーネントは常に何も描画しない
 * （安全に本番へ置いておける）。IDを設定し、AdSenseダッシュボードで広告ユニットを作成して
 * 発行されるslot番号をここに渡せば、コード変更なしで広告が有効になる。
 */
"use client";

import { useEffect, useId } from "react";

export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

interface AdSlotProps {
  /** AdSenseの広告ユニット作成時に発行されるslot番号 */
  slot: string;
  className?: string;
}

export function AdSlot({ slot, className }: AdSlotProps) {
  const id = useId();

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID) return;
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ?? [];
      adsbygoogle.push({});
      (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle = adsbygoogle;
    } catch {
      // AdSenseスクリプト未読み込み時などは何もしない（広告が出ないだけで致命的ではない）
    }
  }, [id]);

  if (!ADSENSE_CLIENT_ID) return null;

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
