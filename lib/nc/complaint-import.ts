import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { ncCustomers, ncParts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type ReceivedChannel = "portal" | "email" | "phone" | "meeting" | "informal";
export type DiscoveryStage = "inline_0km" | "field" | "warranty" | "other";
export type Severity = "critical" | "major" | "minor";
export type RecurrenceType = "new" | "repeat";
export type IncidentLocationType = "dealer" | "customer_factory" | "field" | "other";

export interface ParsedComplaintRow {
  title: string;
  customerId: string;
  customerSiteName: string | null;
  customerReference: string | null;
  receivedAt: Date;
  occurredAt: Date | null;
  receivedChannel: ReceivedChannel;
  isFormal: boolean;
  discoveryStage: DiscoveryStage;
  recurrenceType: RecurrenceType | null;
  partId: string | null;
  partNumberDetail: string | null;
  lotNumber: string | null;
  quantityClaimed: string | null;
  severity: Severity;
  safetyRelated: boolean;
  recallRisk: boolean;
  customerDescription: string | null;
  fieldClaim: {
    vehicleModel: string | null;
    vehicleVin: string | null;
    manufacturedAt: Date | null;
    region: string | null;
    dealerName: string | null;
    mileageKm: string | null;
    usageMonths: number | null;
    dtcCodes: string[] | null;
    symptomDescription: string | null;
    extraData: { soldAt: string | null; repairedAt: string | null; incidentLocationType: IncidentLocationType | null } | null;
  } | null;
}

export interface ComplaintImportRowResult {
  rowNumber: number; // 엑셀 상의 실제 행 번호 (헤더=1행)
  ok: boolean;
  errors: string[];
  preview: { title: string; customerName: string; receivedAt: string };
  data: ParsedComplaintRow | null;
}

const CHANNEL_MAP: Record<string, ReceivedChannel> = {
  "포털": "portal", "이메일": "email", "전화": "phone", "미팅": "meeting", "회의": "meeting", "비공식": "informal",
};
const STAGE_MAP: Record<string, DiscoveryStage> = {
  "인라인": "inline_0km", "인라인(0km)": "inline_0km", "0km": "inline_0km",
  "필드": "field", "보증": "warranty", "기타": "other",
};
const SEVERITY_MAP: Record<string, Severity> = { "치명": "critical", "긴급": "critical", "주요": "major", "경미": "minor" };
const RECURRENCE_MAP: Record<string, RecurrenceType> = { "신규": "new", "재발": "repeat" };
const LOCATION_TYPE_MAP: Record<string, IncidentLocationType> = {
  "사업소": "dealer", "대리점": "dealer", "고객공장": "customer_factory", "현장": "field", "현장/시장": "field", "기타": "other",
};
const TRUE_TOKENS = new Set(["y", "yes", "true", "1", "예", "공식"]);
const FALSE_TOKENS = new Set(["n", "no", "false", "0", "아니오", "비공식"]);

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function parseDate(v: unknown): Date | "invalid" | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? "invalid" : v;
  const s = norm(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "invalid" : d;
}

function parseNum(v: unknown): number | "invalid" | null {
  const s = norm(v);
  if (!s) return null;
  const n = typeof v === "number" ? v : Number(s.replace(/,/g, ""));
  return isNaN(n) ? "invalid" : n;
}

// 빈 값이면 fallback, 값이 있는데 매핑에 없으면 에러 메시지를 errors에 추가하고 null 반환
function mapEnum<T extends string>(
  raw: string,
  map: Record<string, T>,
  fieldLabel: string,
  errors: string[],
  required: boolean
): T | null {
  if (!raw) {
    if (required) errors.push(`${fieldLabel}을(를) 입력하세요.`);
    return null;
  }
  const mapped = map[raw];
  if (!mapped) {
    errors.push(`${fieldLabel} 값이 올바르지 않습니다: "${raw}" (허용값: ${Object.keys(map).join("/")})`);
    return null;
  }
  return mapped;
}

function parseBool(raw: string, defaultValue: boolean, fieldLabel: string, errors: string[]): boolean {
  if (!raw) return defaultValue;
  const lower = raw.toLowerCase();
  if (TRUE_TOKENS.has(lower)) return true;
  if (FALSE_TOKENS.has(lower)) return false;
  errors.push(`${fieldLabel} 값이 올바르지 않습니다: "${raw}" (Y/N으로 입력)`);
  return defaultValue;
}

export interface CustomerSla {
  initialResponseSlaHours: number;
  containmentSlaHours: number;
  finalReportSlaDays: number;
}

export interface ComplaintImportContext {
  customersByName: Map<string, string>; // normalized name → id
  partsByNumber: Map<string, string>; // normalized part number → id
  customerSlaById: Map<string, CustomerSla>;
}

export async function loadComplaintImportContext(orgId: string): Promise<ComplaintImportContext> {
  const [customers, parts] = await Promise.all([
    db.select({
      id: ncCustomers.id,
      name: ncCustomers.name,
      initialResponseSlaHours: ncCustomers.initialResponseSlaHours,
      containmentSlaHours: ncCustomers.containmentSlaHours,
      finalReportSlaDays: ncCustomers.finalReportSlaDays,
    })
      .from(ncCustomers)
      .where(and(eq(ncCustomers.orgId, orgId), eq(ncCustomers.isActive, true))),
    db.select({ id: ncParts.id, number: ncParts.partNumber })
      .from(ncParts)
      .where(and(eq(ncParts.orgId, orgId), eq(ncParts.isActive, true))),
  ]);

  return {
    customersByName: new Map(customers.map((c) => [c.name.trim().toLowerCase(), c.id])),
    partsByNumber: new Map(parts.map((p) => [p.number.trim().toLowerCase(), p.id])),
    customerSlaById: new Map(customers.map((c) => [c.id, {
      initialResponseSlaHours: c.initialResponseSlaHours ?? 24,
      containmentSlaHours: c.containmentSlaHours ?? 48,
      finalReportSlaDays: c.finalReportSlaDays ?? 15,
    }])),
  };
}

export function parseComplaintImportWorkbook(
  buffer: Buffer,
  ctx: ComplaintImportContext
): ComplaintImportRowResult[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return raw.map((row, idx) => {
    const rowNumber = idx + 2;
    const errors: string[] = [];
    const get = (key: string) => norm(row[key]);

    const title = get("제목");
    if (!title) errors.push("제목을 입력하세요.");

    const customerNameRaw = get("고객사");
    let customerId: string | null = null;
    if (!customerNameRaw) {
      errors.push("고객사를 입력하세요.");
    } else {
      customerId = ctx.customersByName.get(customerNameRaw.toLowerCase()) ?? null;
      if (!customerId) errors.push(`등록되지 않은 고객사입니다: "${customerNameRaw}"`);
    }

    const receivedAtParsed = parseDate(row["접수일"]);
    if (receivedAtParsed === null) errors.push("접수일을 입력하세요.");
    else if (receivedAtParsed === "invalid") errors.push(`접수일 형식이 올바르지 않습니다: "${norm(row["접수일"])}"`);

    const occurredAtParsed = parseDate(row["발생일"]);
    if (occurredAtParsed === "invalid") errors.push(`발생일 형식이 올바르지 않습니다: "${norm(row["발생일"])}"`);

    const receivedChannel = mapEnum(get("접수경로"), CHANNEL_MAP, "접수경로", errors, true);
    const discoveryStage = mapEnum(get("발견단계"), STAGE_MAP, "발견단계", errors, true);
    const severity = mapEnum(get("심각도"), SEVERITY_MAP, "심각도", errors, true);
    const recurrenceType = mapEnum(get("재발구분"), RECURRENCE_MAP, "재발구분", errors, false);
    const incidentLocationType = mapEnum(get("발생장소유형"), LOCATION_TYPE_MAP, "발생장소유형", errors, false);

    const isFormal = parseBool(get("공식여부"), true, "공식여부", errors);
    const safetyRelated = parseBool(get("안전관련"), false, "안전관련", errors);
    const recallRisk = parseBool(get("리콜위험"), false, "리콜위험", errors);

    const partNumberRaw = get("품번");
    const partId = partNumberRaw ? ctx.partsByNumber.get(partNumberRaw.toLowerCase()) ?? null : null;
    const partNumberDetailRaw = get("상세품번");
    const partNumberDetail = partNumberDetailRaw || (partNumberRaw && !partId ? partNumberRaw : null) || null;

    const quantityParsed = parseNum(row["클레임수량"]);
    if (quantityParsed === "invalid") errors.push(`클레임수량이 숫자가 아닙니다: "${norm(row["클레임수량"])}"`);

    const mileageParsed = parseNum(row["주행거리(km)"]);
    if (mileageParsed === "invalid") errors.push(`주행거리가 숫자가 아닙니다: "${norm(row["주행거리(km)"])}"`);

    const usageMonthsParsed = parseNum(row["사용개월수"]);
    if (usageMonthsParsed === "invalid") errors.push(`사용개월수가 숫자가 아닙니다: "${norm(row["사용개월수"])}"`);

    const manufacturedAtParsed = parseDate(row["제조일"]);
    if (manufacturedAtParsed === "invalid") errors.push(`제조일 형식이 올바르지 않습니다: "${norm(row["제조일"])}"`);

    const dtcRaw = get("DTC코드");
    const dtcCodes = dtcRaw
      ? dtcRaw.split(/[,\s]+/).map((c) => c.trim().toUpperCase()).filter(Boolean)
      : [];

    const isFieldClaim = discoveryStage === "field" || discoveryStage === "warranty";
    const soldAt = get("판매일") || null;
    const repairedAt = get("수리일") || null;
    const vehicleModel = get("차종") || null;
    const vehicleVin = get("VIN") || null;
    const region = get("지역") || null;
    const dealerName = get("딜러명") || null;
    const symptomDescription = get("증상") || null;

    const ok = errors.length === 0;

    return {
      rowNumber,
      ok,
      errors,
      preview: { title, customerName: customerNameRaw, receivedAt: norm(row["접수일"]) },
      data: ok
        ? {
            title,
            customerId: customerId!,
            customerSiteName: get("고객사업장명") || null,
            customerReference: get("고객참조번호") || null,
            receivedAt: receivedAtParsed as Date,
            occurredAt: (occurredAtParsed as Date | null) ?? null,
            receivedChannel: receivedChannel!,
            isFormal,
            discoveryStage: discoveryStage!,
            recurrenceType,
            partId,
            partNumberDetail,
            lotNumber: get("LOT번호") || null,
            quantityClaimed: quantityParsed === null ? null : String(quantityParsed),
            severity: severity!,
            safetyRelated,
            recallRisk,
            customerDescription: get("클레임내용") || null,
            fieldClaim: isFieldClaim
              ? {
                  vehicleModel,
                  vehicleVin,
                  manufacturedAt: (manufacturedAtParsed as Date | null) ?? null,
                  region,
                  dealerName,
                  mileageKm: mileageParsed === null ? null : String(mileageParsed),
                  usageMonths: (usageMonthsParsed as number | null) ?? null,
                  dtcCodes: dtcCodes.length ? dtcCodes : null,
                  symptomDescription,
                  extraData: soldAt || repairedAt || incidentLocationType
                    ? { soldAt, repairedAt, incidentLocationType }
                    : null,
                }
              : null,
          }
        : null,
    };
  });
}

const TEMPLATE_HEADERS = [
  "제목", "고객사", "접수일", "발생일", "접수경로", "발견단계", "심각도", "재발구분", "공식여부",
  "품번", "상세품번", "LOT번호", "클레임수량", "안전관련", "리콜위험",
  "고객사업장명", "고객참조번호", "클레임내용",
  "차종", "VIN", "제조일", "판매일", "수리일", "발생장소유형", "지역", "딜러명", "주행거리(km)", "사용개월수", "증상", "DTC코드",
];

const TEMPLATE_EXAMPLE_ROW: Record<string, string> = {
  "제목": "경고등 점등",
  "고객사": "현대모비스",
  "접수일": "2026-03-12",
  "발생일": "2026-03-10",
  "접수경로": "포털",
  "발견단계": "필드",
  "심각도": "경미",
  "재발구분": "신규",
  "공식여부": "공식",
  "품번": "99310-CU800",
  "상세품번": "",
  "LOT번호": "LOT250313",
  "클레임수량": "1",
  "안전관련": "N",
  "리콜위험": "N",
  "고객사업장명": "",
  "고객참조번호": "",
  "클레임내용": "주행 중 경고등 점등 발생",
  "차종": "G90",
  "VIN": "KMTFA41Q0TU060740",
  "제조일": "2026-01-15",
  "판매일": "",
  "수리일": "",
  "발생장소유형": "현장",
  "지역": "",
  "딜러명": "",
  "주행거리(km)": "18",
  "사용개월수": "2",
  "증상": "",
  "DTC코드": "",
};

export function buildComplaintImportTemplate() {
  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet([TEMPLATE_EXAMPLE_ROW], { header: TEMPLATE_HEADERS });
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(12, h.length * 1.6) }));
  XLSX.utils.book_append_sheet(wb, ws, "클레임 가져오기");

  const guideRows = [
    ["필수 항목", "제목, 고객사, 접수일, 접수경로, 발견단계, 심각도"],
    ["고객사", "마스터에 등록된 고객사 이름과 정확히 일치해야 합니다."],
    ["품번", "마스터에 없는 품번이면 상세품번에 텍스트로만 저장됩니다."],
    ["접수경로", Object.keys(CHANNEL_MAP).join(" / ")],
    ["발견단계", Object.keys(STAGE_MAP).join(" / ")],
    ["심각도", Object.keys(SEVERITY_MAP).join(" / ")],
    ["재발구분", Object.keys(RECURRENCE_MAP).join(" / ") + " (선택)"],
    ["공식여부", "공식 / 비공식 (선택, 기본값 공식)"],
    ["안전관련 / 리콜위험", "Y / N (선택, 기본값 N)"],
    ["발생장소유형", Object.keys(LOCATION_TYPE_MAP).join(" / ") + " (선택, 필드/보증 클레임에만 적용)"],
    ["DTC코드", "여러 개면 쉼표(,)로 구분"],
    ["날짜 형식", "YYYY-MM-DD"],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet([["항목", "설명"], ...guideRows]);
  wsGuide["!cols"] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, "작성 안내");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
