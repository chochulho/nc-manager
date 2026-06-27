import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        maximumSizeInBytes: 20 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {
        // DB 등록은 클라이언트가 업로드 완료 후 직접 처리
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
