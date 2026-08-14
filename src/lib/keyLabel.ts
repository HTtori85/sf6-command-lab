/**
 * キーボードのKeyboardEvent.codeを画面表示向けの短い文字に変換する
 *
 * 依存関係:
 * - src/components/InputPanel.tsx / DeviceSelector.tsx から使われる
 */

/** "KeyU" -> "U" / "Digit1" -> "1" のように短縮する。想定外のcode（空文字や規則に合わないもの）はそのまま返す */
export function friendlyKeyLabel(code: string): string {
  if (!code) return "未設定";
  if (code.startsWith("Key") && code.length > 3) return code.slice(3);
  if (code.startsWith("Digit") && code.length > 5) return code.slice(5);
  return code;
}
