# スト6コマンド練習ラボ

ストリートファイター6のコマンド入力を練習するための、キーボード/ゲームパッド対応の練習ツールです。
公開URL: https://sf6-command-lab-xwh5-ctcb2cjxo-httori85s-projects.vercel.app

## 主な機能

- **実機準拠のコマンド判定**：60fps固定でサンプリングし、実際のスト6と同じ精度で判定（モニターのリフレッシュレートに依存しない）
- **全29キャラクター**対応（必殺技・SA1〜3）
- **簡易入力（省略入力）**：実機同様、236236などの斜めを1回省略しても成立するモード（ON/OFF切替可）
- 弱中強どのボタンでも必殺技が成立（`anyButtons`による判定）
- キーボード / ゲームパッド（パッド・アケコン・レバーレス）対応、ボタンは「押して設定」で割り当て可能
- ゲームパッドテスター（コントローラーの生入力を可視化する診断パネル）
- エラー分析ダッシュボード（余剰入力・要素抜けの傾向を技ごと/全体で分析）
- ライト/ダークテーマ、入力音・判定音・メトロノーム

## 技術スタック

- [Next.js](https://nextjs.org)（App Router）/ TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [Zustand](https://zustand-demo.pmnd.rs/)（状態管理・LocalStorage永続化）
- [lucide-react](https://lucide.dev)（アイコン）

サーバー・DBは使用していません（すべてクライアントサイドで完結、設定はLocalStorageに保存）。

## 開発

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。

```bash
npm run lint        # ESLint
npx tsc --noEmit     # 型チェック
npm run build        # 本番ビルド
```

## デプロイ

`master` ブランチへのpushでVercelに自動デプロイされます。

## ディレクトリ構成

```
src/
  app/          # Next.js App Router（ページ本体）
  components/   # UIコンポーネント
  lib/          # 入力検知・判定エンジン・各種ユーティリティ
  store/        # Zustandストア（入力ログ・設定）
  types/        # 共通型定義
  data/         # コマンドマスターデータ（commands.json）
docs/           # 参考資料
REQUIREMENTS.md # 要件定義
```
