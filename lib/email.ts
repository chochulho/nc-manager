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

export async function sendInvitationEmail({
  to,
  inviterName,
  orgName,
  inviteUrl,
}: {
  to: string;
  inviterName: string;
  orgName: string;
  inviteUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[NC Manager] ${orgName}에 초대되었습니다`,
    html: `
      <p>${inviterName}님이 <strong>${orgName}</strong>에 초대했습니다.</p>
      <p><a href="${inviteUrl}">초대 수락하기</a></p>
      <p>이 링크는 7일 후 만료됩니다.</p>
    `,
  });
}
