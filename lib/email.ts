import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "noreply@nc-manager.com";

export async function sendDefectNotificationEmail({
  to,
  subject,
  body,
  senderName,
  orgName,
}: {
  to: string[];
  subject: string;
  body: string;
  senderName: string;
  orgName: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <p style="color:#6b7280;font-size:12px;margin-bottom:16px;">[NC Manager] ${orgName} — ${senderName}이(가) 발송</p>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;">${body.replace(/\n/g, "<br/>")}</div>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
      <p style="color:#9ca3af;font-size:11px;">이 이메일은 NC Manager에서 자동 발송되었습니다.</p>
    `,
  });
}

export async function sendSlaReminderEmail({
  to,
  recipientName,
  orgName,
  complaintNumber,
  title,
  slaType,
  dueAt,
  complaintUrl,
}: {
  to: string;
  recipientName: string;
  orgName: string;
  complaintNumber: string;
  title: string;
  slaType: "initial_response" | "final_report";
  dueAt: Date;
  complaintUrl: string;
}) {
  const slaLabel = slaType === "initial_response" ? "초기 대응" : "최종 보고서 제출";
  const dueDateStr = dueAt.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const isOverdue = dueAt < new Date();
  const subject = isOverdue
    ? `[NC Manager] ⚠️ SLA 기한 초과 — ${complaintNumber}`
    : `[NC Manager] SLA 마감 임박 — ${complaintNumber}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <p style="color:#6b7280;font-size:12px;margin-bottom:16px;">[NC Manager] ${orgName}</p>
        <h2 style="font-size:18px;margin-bottom:8px;">${isOverdue ? "⚠️ SLA 기한이 초과되었습니다" : "🔔 SLA 마감일이 다가오고 있습니다"}</h2>
        <p style="color:#374151;font-size:14px;">안녕하세요, ${recipientName}님.</p>
        <p style="color:#374151;font-size:14px;">아래 고객 클레임의 <strong>${slaLabel}</strong> 기한을 확인해 주세요.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">클레임 번호</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;font-family:monospace;">${complaintNumber}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">제목</p>
          <p style="margin:0 0 16px;font-size:14px;">${title}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">SLA 항목</p>
          <p style="margin:0 0 16px;font-size:14px;">${slaLabel}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">마감일</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:${isOverdue ? "#ef4444" : "#f59e0b"};">${dueDateStr}${isOverdue ? " (초과)" : ""}</p>
        </div>
        <a href="${complaintUrl}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;margin-top:8px;">클레임 확인하기</a>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
        <p style="color:#9ca3af;font-size:11px;">이 이메일은 NC Manager에서 자동 발송되었습니다.</p>
      </div>
    `,
  });
}

export async function sendCapaAssignmentEmail({
  to,
  recipientName,
  orgName,
  capaNumber,
  title,
  assignerName,
  capaUrl,
}: {
  to: string;
  recipientName: string;
  orgName: string;
  capaNumber: string;
  title: string;
  assignerName: string;
  capaUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[NC Manager] CAPA 담당자로 지정되었습니다 — ${capaNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <p style="color:#6b7280;font-size:12px;margin-bottom:16px;">[NC Manager] ${orgName}</p>
        <h2 style="font-size:18px;margin-bottom:8px;">📋 CAPA 담당자 지정</h2>
        <p style="color:#374151;font-size:14px;">안녕하세요, ${recipientName}님.</p>
        <p style="color:#374151;font-size:14px;"><strong>${assignerName}</strong>님이 아래 CAPA의 담당자(Champion)로 지정했습니다.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">CAPA 번호</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;font-family:monospace;">${capaNumber}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">제목</p>
          <p style="margin:0;font-size:14px;">${title}</p>
        </div>
        <a href="${capaUrl}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;margin-top:8px;">CAPA 확인하기</a>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
        <p style="color:#9ca3af;font-size:11px;">이 이메일은 NC Manager에서 자동 발송되었습니다.</p>
      </div>
    `,
  });
}

export async function sendCapaActionAssignmentEmail({
  to,
  recipientName,
  orgName,
  capaNumber,
  capaTitle,
  actionDescription,
  dueAt,
  assignerName,
  capaUrl,
}: {
  to: string;
  recipientName: string;
  orgName: string;
  capaNumber: string;
  capaTitle: string;
  actionDescription: string;
  dueAt: Date | null;
  assignerName: string;
  capaUrl: string;
}) {
  const dueDateStr = dueAt
    ? dueAt.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : "미지정";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `[NC Manager] CAPA 조치항목 담당자로 지정되었습니다 — ${capaNumber}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <p style="color:#6b7280;font-size:12px;margin-bottom:16px;">[NC Manager] ${orgName}</p>
        <h2 style="font-size:18px;margin-bottom:8px;">✅ CAPA 조치항목 담당자 지정</h2>
        <p style="color:#374151;font-size:14px;">안녕하세요, ${recipientName}님.</p>
        <p style="color:#374151;font-size:14px;"><strong>${assignerName}</strong>님이 아래 CAPA 조치항목의 담당자로 지정했습니다.</p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">CAPA</p>
          <p style="margin:0 0 16px;font-size:14px;font-family:monospace;">${capaNumber} — ${capaTitle}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">조치항목 내용</p>
          <p style="margin:0 0 16px;font-size:14px;">${actionDescription}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">완료 기한</p>
          <p style="margin:0;font-size:14px;font-weight:600;">${dueDateStr}</p>
        </div>
        <a href="${capaUrl}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;margin-top:8px;">CAPA 확인하기</a>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;"/>
        <p style="color:#9ca3af;font-size:11px;">이 이메일은 NC Manager에서 자동 발송되었습니다.</p>
      </div>
    `,
  });
}

