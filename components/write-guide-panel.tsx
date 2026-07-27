"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type GuideType = "internal_nc" | "part_nc" | "complaint" | "capa" | "lessons_learned";

interface Props {
  type: GuideType;
  methodology?: string;
  className?: string;
}

interface GuideCard {
  color: "orange" | "navy" | "red" | "green" | "yellow";
  title: string;
  body: string;
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

export function WriteGuidePanel({ type, methodology, className }: Props) {
  const t = useTranslations("guide");
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Build guide data from translations
  type TabKey = "nc" | "complaint" | "ll";
  const keyMap: Record<Exclude<GuideType, "capa">, TabKey> = {
    internal_nc: "nc",
    part_nc: "nc",
    complaint: "complaint",
    lessons_learned: "ll",
  };
  const tk = type !== "capa" ? keyMap[type] : ("nc" as TabKey);

  let writingCards: GuideCard[];
  if (type === "capa") {
    if (methodology === "simple_capa") {
      writingCards = [
        { color: "orange", title: t("capa_simple.w1_title"), body: t("capa_simple.w1_body") },
        { color: "navy",   title: t("capa_simple.w2_title"), body: t("capa_simple.w2_body") },
        { color: "yellow", title: t("capa_simple.w3_title"), body: t("capa_simple.w3_body") },
        { color: "green",  title: t("capa_simple.w4_title"), body: t("capa_simple.w4_body") },
        { color: "orange", title: t("capa_simple.w5_title"), body: t("capa_simple.w5_body") },
      ];
    } else {
      writingCards = [
        { color: "orange", title: t("capa.w1_title"), body: t("capa.w1_body") },
        { color: "navy",   title: t("capa.w2_title"), body: t("capa.w2_body") },
        { color: "yellow", title: t("capa.w3_title"), body: t("capa.w3_body") },
        { color: "green",  title: t("capa.w4_title"), body: t("capa.w4_body") },
        { color: "orange", title: t("capa.w5_title"), body: t("capa.w5_body") },
        { color: "navy",   title: t("capa.w6_title"), body: t("capa.w6_body") },
      ];
    }
  } else {
    writingCards = [
      { color: "orange", title: t(`${tk}.w1_title`), body: t(`${tk}.w1_body`) },
      { color: "navy",   title: t(`${tk}.w2_title`), body: t(`${tk}.w2_body`) },
      { color: "yellow", title: t(`${tk}.w3_title`), body: t(`${tk}.w3_body`) },
      { color: "green",  title: t(`${tk}.w4_title`), body: t(`${tk}.w4_body`) },
      { color: "navy",   title: t(`${tk}.w5_title`), body: t(`${tk}.w5_body`) },
    ];
  }

  const escalationCards: GuideCard[] = (type === "internal_nc" || type === "part_nc" || type === "complaint")
    ? [
        { color: "red",    title: t(`${tk}.e1_title`), body: t(`${tk}.e1_body`) },
        { color: "orange", title: t(`${tk}.e2_title`), body: t(`${tk}.e2_body`) },
        { color: "yellow", title: t(`${tk}.e3_title`), body: t(`${tk}.e3_body`) },
        { color: "navy",   title: t(`${tk}.e4_title`), body: t(`${tk}.e4_body`) },
      ]
    : [];

  const tabs = escalationCards.length > 0
    ? [
        { key: "writing",    label: t("tabs.writing"),    cards: writingCards },
        { key: "escalation", label: t("tabs.escalation"), cards: escalationCards },
      ]
    : [
        { key: "writing", label: t("tabs.writing"), cards: writingCards },
      ];

  const title = t(`titles.${type}`);
  const hasEscalation = escalationCards.length > 0;

  return (
    <div className={cn("flex flex-shrink-0", className)}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="self-start mt-1 mr-1 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        title={open ? t("close") : t("open")}
      >
        {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Panel body */}
      {open && (
        <div className="w-72 flex-shrink-0 border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ background: "linear-gradient(135deg, #2B4B8C 0%, #3A5FA0 100%)" }}
          >
            <BookOpen className="h-4 w-4 text-white opacity-90" />
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>

          {/* Tabs (only when escalation tab exists) */}
          {hasEscalation && (
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

          {/* Cards */}
          <div className="p-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            {tabs[activeTab]?.cards.map((card, i) => (
              <GuideCardItem key={i} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Collapsed state */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="self-start mt-1 flex flex-col items-center gap-1 p-2 rounded-lg border border-border bg-white shadow-sm hover:shadow-md transition-shadow"
          title={t("open")}
        >
          <BookOpen className="h-4 w-4" style={{ color: "#2B4B8C" }} />
          <span
            className="text-[9px] font-medium"
            style={{ color: "#2B4B8C", writingMode: "vertical-rl" }}
          >
            {t("collapsed")}
          </span>
        </button>
      )}
    </div>
  );
}
