import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? "noreply@nc-manager.com";

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
