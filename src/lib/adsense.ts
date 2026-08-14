/**
 * Google AdSense パブリッシャーID
 *
 * 依存関係:
 * - src/app/layout.tsx がこのIDでAdSenseの読み込みスクリプトをheadに設置する
 * - src/components/AdSlot.tsx が個別の広告ユニットを手動配置する際に使う（現状は未使用。
 *   自動広告のスクリプトだけで最適な位置に自動配置されるため、個別ユニットは今のところ不要）
 *
 * パブリッシャーIDは非公開情報ではなく、AdSenseの仕様上どのみちページのHTMLソースに
 * そのまま埋め込む値のため、環境変数ではなく直接コードに持たせている。
 */
export const ADSENSE_CLIENT_ID = "ca-pub-2385986934476349";
