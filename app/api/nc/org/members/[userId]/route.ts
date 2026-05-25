// Member management is handled by Quality Hub.
// This endpoint is no longer active.
import { NextResponse } from "next/server";

export async function DELETE() {
  return NextResponse.json(
    { error: "멤버 관리는 Quality Hub에서 하세요." },
    { status: 410 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "멤버 관리는 Quality Hub에서 하세요." },
    { status: 410 }
  );
}
