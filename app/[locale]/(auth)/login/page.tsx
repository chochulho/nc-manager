"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-3">
          <span className="text-primary-foreground text-sm font-bold">NC</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">NC Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">부적합 및 클레임 관리</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="password">{t("password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "로그인 중..." : t("loginButton")}
        </Button>
      </form>

      {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
        <Button
          variant="outline"
          className="w-full mt-3"
          onClick={() => signIn("google", { callbackUrl })}
        >
          {t("loginWithGoogle")}
        </Button>
      )}

      <p className="text-center text-sm text-muted-foreground mt-6">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          {t("registerButton")}
        </Link>
      </p>
    </div>
  );
}
