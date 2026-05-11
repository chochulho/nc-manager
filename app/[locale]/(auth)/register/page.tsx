"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    plantName: "",
  });
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/nc/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, inviteToken }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "회원가입에 실패했습니다.");
        return;
      }

      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-3">
          <span className="text-primary-foreground text-sm font-bold">NC</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">계정 만들기</h1>
        {inviteToken && (
          <p className="text-sm text-muted-foreground mt-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            초대 링크로 가입 중
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            placeholder="홍길동"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
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
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={8}
            placeholder="최소 8자"
            className="mt-1"
          />
        </div>
        {!inviteToken && (
          <>
            <div>
              <Label htmlFor="companyName">{t("companyName")}</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                required
                placeholder="(주)예시기업"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="plantName">{t("plantName")}</Label>
              <Input
                id="plantName"
                value={form.plantName}
                onChange={(e) => update("plantName", e.target.value)}
                placeholder="1공장 (선택)"
                className="mt-1"
              />
            </div>
          </>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "처리 중..." : t("registerButton")}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {t("loginButton")}
        </Link>
      </p>
    </div>
  );
}
