import { NextResponse } from "next/server";

// Registration is now handled by Supabase Auth via Quality Hub.
// This endpoint is no longer active.
export async function POST() {
  return NextResponse.json(
    { error: "회원가입은 Quality Hub에서 이루어집니다." },
    { status: 410 }
  );
}
