"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sprout, Mail, Chrome } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createClient();

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = "/";
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMessage("確認メールを送信しました。メールを確認してください。");
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm space-y-6">
        {/* ロゴ */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Sprout className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-green-700">みのり</h1>
          <p className="text-sm text-muted-foreground">農家の複数販路一元管理</p>
        </div>

        {/* フォーム */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-base font-semibold text-center">
            {mode === "login" ? "ログイン" : "アカウント作成"}
          </h2>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            <Chrome className="h-4 w-4 mr-2" />
            Google でログイン
          </Button>

          <div className="flex items-center gap-3">
            <hr className="flex-1" />
            <span className="text-xs text-muted-foreground">または</span>
            <hr className="flex-1" />
          </div>

          {/* メール認証 */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <Input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="パスワード（8文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
              <Mail className="h-4 w-4 mr-2" />
              {mode === "login" ? "ログイン" : "アカウントを作成"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "アカウントをお持ちでない方は" : "すでにアカウントをお持ちの方は"}
            <button
              type="button"
              className="ml-1 text-green-600 hover:underline font-medium"
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}
            >
              {mode === "login" ? "新規登録" : "ログイン"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
