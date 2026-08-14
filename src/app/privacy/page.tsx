/**
 * プライバシーポリシー
 *
 * AdSense等の広告掲載には公開済みのプライバシーポリシーが前提条件になるため用意している。
 * 個人情報を収集するサーバー機能は存在しないが、広告配信事業者（Google等）が発行する
 * Cookie等について説明する義務があるため、その内容を含めている。
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | スト6コマンド練習ラボ",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-neutral-50 px-4 py-10 dark:bg-neutral-950">
      <main className="flex w-full max-w-2xl flex-col gap-6 text-sm text-neutral-700 dark:text-neutral-300">
        <div>
          <Link href="/" className="text-emerald-600 hover:underline dark:text-emerald-400">
            ← トップに戻る
          </Link>
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">プライバシーポリシー</h1>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">個人情報の収集について</h2>
          <p>
            当サイト（スト6コマンド練習ラボ）は、会員登録やお問い合わせフォームなどを設けておらず、氏名・メールアドレスといった個人情報をサーバーに送信・保存する機能はありません。
          </p>
          <p>
            入力機器の設定（キー割り当て・サウンド設定・テーマ等）は、お使いのブラウザのLocalStorage（端末内）にのみ保存されます。これらの情報が外部のサーバーへ送信されることはありません。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">広告について</h2>
          <p>
            当サイトでは、第三者配信の広告サービス（Google
            AdSense等）を利用する場合があります。これらの広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookie（クッキー）を使用することがあります。
          </p>
          <p>
            Cookieを使用することで、当サイトはユーザーのブラウザを識別できますが、ユーザー個人を特定する情報は含まれません。Cookieを無効にする方法や、Googleが使用するCookieの詳細については、
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Googleの広告に関するポリシー
            </a>
            をご覧ください。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">アクセス解析について</h2>
          <p>
            サイトの利用状況を把握するため、アクセス解析ツール（Google
            Analytics等）を導入する場合があります。これらのツールはCookieを使用してデータを収集しますが、個人を特定する情報は含まれません。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">免責事項</h2>
          <p>
            当サイトのコンテンツ・情報について、可能な限り正確な情報を提供するよう努めていますが、正確性や安全性を保証するものではありません。当サイトの利用によって生じた損害について、運営者は一切の責任を負いません。
          </p>
          <p>
            当サイトは「ストリートファイター6」の非公式なファンメイド練習ツールであり、株式会社カプコンをはじめとする権利者とは一切関係ありません。
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">プライバシーポリシーの変更</h2>
          <p>本ポリシーの内容は、事前の予告なく変更されることがあります。</p>
        </section>

        <p className="text-xs text-neutral-500">最終更新日: 2026年8月</p>
      </main>
    </div>
  );
}
