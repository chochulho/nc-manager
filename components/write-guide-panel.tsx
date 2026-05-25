"use client";

import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type GuideType = "internal_nc" | "complaint" | "capa" | "lessons_learned";

interface Props {
  type: GuideType;
  className?: string;
}

interface GuideCard {
  color: "orange" | "navy" | "red" | "green" | "yellow";
  title: string;
  body: string;
}

interface Tab {
  key: string;
  label: string;
  cards: GuideCard[];
}

const COLOR_MAP: Record<string, string> = {
  orange: "border-l-4 bg-orange-50 rounded-r-lg p-3 mb-2",
  navy:   "border-l-4 bg-blue-50  rounded-r-lg p-3 mb-2",
  red:    "border-l-4 border-red-400 bg-red-50 rounded-r-lg p-3 mb-2",
  green:  "border-l-4 border-green-500 bg-green-50 rounded-r-lg p-3 mb-2",
  yellow: "border-l-4 border-yellow-400 bg-yellow-50 rounded-r-lg p-3 mb-2",
};

const TITLE_COLOR_MAP: Record<string, string> = {
  orange: "text-[#2B4B8C]",
  navy:   "text-[#2B4B8C]",
  red:    "text-red-800",
  green:  "text-green-800",
  yellow: "text-yellow-800",
};

const BORDER_STYLE_MAP: Record<string, React.CSSProperties> = {
  orange: { borderLeftColor: "#F26B3A" },
  navy:   { borderLeftColor: "#2B4B8C" },
  red:    {},
  green:  {},
  yellow: {},
};

// ── 내부 부적합 가이드 ────────────────────────────────────────────────────────
const INTERNAL_NC_TABS: Tab[] = [
  {
    key: "writing",
    label: "작성 요령",
    cards: [
      {
        color: "orange",
        title: "① 제목 작성법",
        body: "「부품명 + 불량 유형 + 발견 위치」 조합으로 작성. 예: 브레이크 패드 치수 불량 – 입고검사",
      },
      {
        color: "navy",
        title: "② 발견 단계 선택",
        body: "입고검사 → 협력사 귀책 가능성이 높음. 공정 중/출하 → 내부 공정 이슈. 내부감사 → 시스템/절차 문제.",
      },
      {
        color: "yellow",
        title: "③ 심각도 분류 기준",
        body: "긴급(Critical): 안전·규제 또는 100% 공급 중단 위험\n주요(Major): 기능 불량, 고객 라인 영향 가능\n경미(Minor): 외관·포장, 즉각 교환 가능",
      },
      {
        color: "navy",
        title: "④ 봉쇄조치 기술법",
        body: "「무엇을 / 몇 개를 / 어디에서 / 언제까지」를 명확히. 격리 장소와 수량을 구체적으로 기재.",
      },
      {
        color: "green",
        title: "⑤ 처분 결정 원칙",
        body: "재작업: 기준치 이내 복원 가능\n특채: 고객 승인 또는 기능 영향 없음\n폐기: 복원 불가, 안전·규제 불합격\n반품: 협력사 귀책 확인 후",
      },
    ],
  },
  {
    key: "escalation",
    label: "에스컬레이션",
    cards: [
      {
        color: "red",
        title: "🔴 긴급(Critical) — 즉시",
        body: "• 발견 즉시 품질팀장·공장장에게 구두 보고\n• 해당 라인 즉시 중단 또는 출하 정지 검토\n• 1시간 내 경영층 보고",
      },
      {
        color: "orange",
        title: "🟠 주요(Major) — 24시간 내",
        body: "• 발견 당일 품질팀장 서면 보고\n• 봉쇄조치 24시간 내 완료\n• 관련 고객사 영향 검토 필수",
      },
      {
        color: "yellow",
        title: "🟡 경미(Minor) — 주간 보고",
        body: "• 주간 품질 미팅 안건에 포함\n• 재발 경향 분석 후 CAPA 필요 여부 결정",
      },
      {
        color: "navy",
        title: "📋 안전·규제 관련",
        body: "안전(safetyRelated) 또는 규제(regulatoryRelated) 체크 시 심각도와 무관하게 즉시 품질팀장 + 법무/인증팀 동시 보고.",
      },
    ],
  },
];

// ── 고객 클레임 가이드 ────────────────────────────────────────────────────────
const COMPLAINT_TABS: Tab[] = [
  {
    key: "writing",
    label: "작성 요령",
    cards: [
      {
        color: "orange",
        title: "① 접수일 = SLA 기산점",
        body: "접수일(receivedAt)은 SLA 계산 기준. 늦게 등록해도 실제 접수일 기준으로 기재. 초기응답·최종보고 기한이 자동 계산됩니다.",
      },
      {
        color: "navy",
        title: "② 고객 설명 원문 보존",
        body: "「고객 내용(customerDescription)」란에 고객이 보낸 내용을 그대로 기재. 해석·판단은 조사 후 별도 작성.",
      },
      {
        color: "yellow",
        title: "③ 수량 확인 절차",
        body: "주장 수량(quantityClaimed)과 확인 수량(quantityConfirmed)을 구분. NTF(No Trouble Found) 클레임도 수량 0으로 등록 후 resolutionType=ntf 처리.",
      },
      {
        color: "green",
        title: "④ 리콜 위험 체크",
        body: "리콜위험(recallRisk) ON → 경영진 즉시 보고. 안전 관련 → 규제기관 보고 의무 확인 필수.",
      },
      {
        color: "navy",
        title: "⑤ 상태 흐름",
        body: "접수 → 인지(24h) → 봉쇄 → 조사 → 8D 진행 → 최종보고 → 종결\n각 단계 전환 시 날짜가 자동 기록됩니다.",
      },
    ],
  },
  {
    key: "escalation",
    label: "에스컬레이션",
    cards: [
      {
        color: "red",
        title: "🚨 리콜위험 + 긴급",
        body: "• 접수 즉시 CEO·영업 임원·품질 임원 동시 보고\n• 즉각 봉쇄조치 및 고객 라인 중단 협의\n• 법무팀 보고 (제조물책임 대비)",
      },
      {
        color: "orange",
        title: "🟠 긴급(Critical) — 4시간 내",
        body: "• 품질팀장에게 4시간 내 서면 보고\n• 고객사 담당자에게 초기 대응 문자/이메일 발송\n• 초기응답 SLA 내 공식 회신 준비",
      },
      {
        color: "yellow",
        title: "⏰ SLA 임박 경고",
        body: "• 초기응답 D-1: 담당자 자동 알림\n• 최종보고 D-3: 팀장 알림\n• SLA 초과 시 즉시 에스컬레이션 (고객사 페널티 위험)",
      },
      {
        color: "navy",
        title: "📋 8D 보고 단계",
        body: "8D 진행 상태에서 CAPA를 연결하면 D4~D7이 자동 연동. 최종보고 전 고객사 형식 요구 사항 확인 필수.",
      },
    ],
  },
];

// ── CAPA 가이드 ───────────────────────────────────────────────────────────────
const CAPA_TABS: Tab[] = [
  {
    key: "writing",
    label: "작성 요령",
    cards: [
      {
        color: "orange",
        title: "① 문제 설명 (D2)",
        body: "5W2H로 작성. What·When·Where·Who·Why + How much·How many. \"불량이 났다\" 대신 \"A공정에서 B부품 치수가 ±0.05mm 초과하는 불량이 C일 기준 12건 발생\"",
      },
      {
        color: "navy",
        title: "② 즉각 봉쇄조치 (D3)",
        body: "근본원인 파악 전 고객 보호를 위한 임시 조치. \"전수 검사 후 격리\" 수준도 OK. 봉쇄 완료 날짜와 수량을 기재.",
      },
      {
        color: "yellow",
        title: "③ 5Why 근본원인 (D4)",
        body: "왜? → 왜? → 왜? → 왜? → 왜? 순서로 단계별 원인을 연결. 마지막 Why의 답이 영구 시정조치의 대상이 되어야 합니다.",
      },
      {
        color: "green",
        title: "④ 영구 시정조치 (D5~D6)",
        body: "각 조치에 담당자와 기한을 필수 지정. 증거/근거 컬럼에는 실제 완료 증빙(사진, 검사성적서 등)을 첨부.",
      },
      {
        color: "orange",
        title: "⑤ 예방 및 수평전개 (D7)",
        body: "유사 부품/공정에 동일 조치 적용 여부를 반드시 검토. FMEA 개정 및 관리계획서(Control Plan) 업데이트 포함.",
      },
      {
        color: "navy",
        title: "⑥ 유효성 평가",
        body: "조치 완료 후 3~6개월 재발 여부 모니터링. 유효 판정 시 CAPA 종결. 미흡 시 D4부터 재분석.",
      },
    ],
  },
];

// ── 레슨런 가이드 ─────────────────────────────────────────────────────────────
const LESSONS_LEARNED_TABS: Tab[] = [
  {
    key: "writing",
    label: "작성 요령",
    cards: [
      {
        color: "orange",
        title: "① 핵심 레슨 작성 공식",
        body: "「다음번에 [○○을] 하면/확인하면 [△△ 문제]를 예방할 수 있다」\n예: 입고검사 시 치수 샘플링을 n=5→n=10으로 늘리면 표면 치수 불량을 초기 감지할 수 있다.",
      },
      {
        color: "navy",
        title: "② 소스 연결의 중요성",
        body: "내부 NC 또는 고객 클레임과 연결하면 문제 요약·근본원인이 자동으로 초안됩니다. 자동 초안을 검토·수정 후 저장하세요.",
      },
      {
        color: "yellow",
        title: "③ 적용 공정/부서 명시",
        body: "레슨런이 어느 공정·부서에 해당하는지 명확히 기재. 검색 및 수평전개 시 활용됩니다.",
      },
      {
        color: "green",
        title: "④ 태그 활용",
        body: "부품명·공정명·불량 유형·고객명 등을 태그로 입력하면 나중에 유사 사례 검색이 쉬워집니다.\n예: 브레이크패드, 치수불량, 입고검사, A고객",
      },
      {
        color: "navy",
        title: "⑤ 상태 관리",
        body: "초안(Draft) → 팀 검토(Review) → 발행(Published) 순서로 진행. Published 상태만 전사 공유 대상.",
      },
    ],
  },
];

const GUIDE_DATA: Record<GuideType, Tab[]> = {
  internal_nc: INTERNAL_NC_TABS,
  complaint: COMPLAINT_TABS,
  capa: CAPA_TABS,
  lessons_learned: LESSONS_LEARNED_TABS,
};

const GUIDE_TITLE: Record<GuideType, string> = {
  internal_nc: "내부 부적합 가이드",
  complaint: "고객 클레임 가이드",
  capa: "CAPA 작성 가이드",
  lessons_learned: "레슨런 작성 가이드",
};

function GuideCardItem({ card }: { card: GuideCard }) {
  const cls = cn(COLOR_MAP[card.color], "cursor-default");
  const titleCls = cn("font-bold text-sm mb-1", TITLE_COLOR_MAP[card.color]);

  return (
    <div className={cls} style={BORDER_STYLE_MAP[card.color]}>
      <p className={titleCls}>{card.title}</p>
      <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{card.body}</p>
    </div>
  );
}

export function WriteGuidePanel({ type, className }: Props) {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = GUIDE_DATA[type];
  const title = GUIDE_TITLE[type];
  const hasEscalation = type === "internal_nc" || type === "complaint";

  return (
    <div className={cn("flex flex-shrink-0", className)}>
      {/* 토글 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="self-start mt-1 mr-1 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title={open ? "가이드 닫기" : "가이드 열기"}
      >
        {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* 패널 본체 */}
      {open && (
        <div className="w-72 flex-shrink-0 border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          {/* 헤더 */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ background: "linear-gradient(135deg, #2B4B8C 0%, #3A5FA0 100%)" }}
          >
            <BookOpen className="h-4 w-4 text-white opacity-90" />
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>

          {/* 탭 (에스컬레이션이 있는 타입만) */}
          {hasEscalation && tabs.length > 1 && (
            <div className="flex border-b">
              {tabs.map((tab, i) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "flex-1 text-xs font-medium py-2 px-3 transition-colors",
                    activeTab === i
                      ? "border-b-2 text-[#2B4B8C]"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                  style={activeTab === i ? { borderBottomColor: "#F26B3A" } : {}}
                >
                  {tab.key === "escalation" && (
                    <AlertTriangle className="inline h-3 w-3 mr-1 text-orange-500" />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* 카드 목록 */}
          <div className="p-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            {tabs[activeTab]?.cards.map((card, i) => (
              <GuideCardItem key={i} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* 닫혔을 때 작은 아이콘 탭 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="self-start mt-1 flex flex-col items-center gap-1 p-2 rounded-lg border border-border bg-white shadow-sm hover:shadow-md transition-shadow"
          title="작성 가이드 열기"
        >
          <BookOpen className="h-4 w-4" style={{ color: "#2B4B8C" }} />
          <span
            className="text-[9px] font-medium writing-mode-vertical"
            style={{ color: "#2B4B8C", writingMode: "vertical-rl" }}
          >
            가이드
          </span>
        </button>
      )}
    </div>
  );
}
