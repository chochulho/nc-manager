import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const FIELD_CLAIM_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    vehicleModel: { type: ["string", "null"] },
    vehicleVin: { type: ["string", "null"] },
    manufacturedAt: { type: ["string", "null"], description: "YYYY-MM-DD" },
    usageMonths: { type: ["number", "null"] },
    soldAt: { type: ["string", "null"], description: "YYYY-MM-DD" },
    repairedAt: { type: ["string", "null"], description: "YYYY-MM-DD" },
    incidentLocationType: { type: ["string", "null"], enum: ["dealer", "customer_factory", "field", "other", null] },
    region: { type: ["string", "null"] },
    dealerName: { type: ["string", "null"] },
    mileageKm: { type: ["number", "null"] },
    dtcCodes: { type: "array" as const, items: { type: "string" as const } },
    symptomDescription: { type: ["string", "null"] },
  },
  required: [
    "vehicleModel", "vehicleVin", "manufacturedAt", "usageMonths", "soldAt", "repairedAt",
    "incidentLocationType", "region", "dealerName", "mileageKm", "dtcCodes", "symptomDescription",
  ],
};

const EXTRACT_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    title: { type: ["string", "null"] },
    customerDescription: { type: ["string", "null"] },
    receivedAt: { type: ["string", "null"], description: "YYYY-MM-DD" },
    occurredAt: { type: ["string", "null"], description: "YYYY-MM-DD" },
    receivedChannel: { type: ["string", "null"], enum: ["portal", "email", "phone", "meeting", "informal", null] },
    discoveryStage: { type: ["string", "null"], enum: ["inline_0km", "field", "warranty", "other", null] },
    severity: { type: ["string", "null"], enum: ["critical", "major", "minor", null] },
    recurrenceType: { type: ["string", "null"], enum: ["new", "repeat", null] },
    customerName: { type: ["string", "null"], description: "고객사명(원문 그대로)" },
    customerSiteName: { type: ["string", "null"] },
    customerReference: { type: ["string", "null"] },
    partNumberRaw: { type: ["string", "null"], description: "부품번호/품번(원문 그대로)" },
    lotNumber: { type: ["string", "null"] },
    quantityClaimed: { type: ["number", "null"] },
    safetyRelated: { type: ["boolean", "null"] },
    recallRisk: { type: ["boolean", "null"] },
    fieldClaim: { anyOf: [FIELD_CLAIM_SCHEMA, { type: "null" as const }] },
  },
  required: [
    "title", "customerDescription", "receivedAt", "occurredAt", "receivedChannel", "discoveryStage",
    "severity", "recurrenceType", "customerName", "customerSiteName", "customerReference",
    "partNumberRaw", "lotNumber", "quantityClaimed", "safetyRelated", "recallRisk", "fieldClaim",
  ],
};

const ALLOWED_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { imageBase64, mediaType } = body as { imageBase64?: string; mediaType?: string };

  if (!imageBase64 || !mediaType) {
    return NextResponse.json({ error: "imageBase64, mediaType는 필수입니다." }, { status: 400 });
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType as (typeof ALLOWED_MEDIA_TYPES)[number])) {
    return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
  }

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2048,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: EXTRACT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: imageBase64 } },
          {
            type: "text",
            text: "이 이미지는 고객 불량 클레임 관련 캡처(이메일, 고객 포털 화면, 엑셀표 등)입니다. 이미지에서 명확하게 확인되는 정보만 추출하세요. 확실하지 않거나 이미지에 없는 값은 null로 두세요. 날짜는 YYYY-MM-DD 형식으로 변환하세요. 절대로 추측하거나 지어내지 마세요.",
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    return NextResponse.json({ error: "이미지 분석 요청이 거부되었습니다." }, { status: 422 });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "분석 결과를 가져오지 못했습니다." }, { status: 502 });
  }

  try {
    const extracted = JSON.parse(textBlock.text);
    return NextResponse.json({ extracted });
  } catch {
    return NextResponse.json({ error: "분석 결과 파싱에 실패했습니다." }, { status: 502 });
  }
}
