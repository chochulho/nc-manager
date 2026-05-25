"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function RegisterPage() {
  const qualityHubUrl = process.env.NEXT_PUBLIC_QUALITY_HUB_URL ?? "https://quality-hub.vercel.app";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center">
      <div className="flex flex-col items-center mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-3">
          <span className="text-primary-foreground text-sm font-bold">NC</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">NC Manager</h1>
      </div>

      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          NC Manager 계정 등록 및 멤버 초대는{" "}
          <strong>Quality Hub</strong>에서 이루어집니다.
        </p>
        <Button
          className="w-full"
          onClick={() => window.open(qualityHubUrl, "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Quality Hub에서 가입하기
        </Button>
        <p className="text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
