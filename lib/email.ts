const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Foretell <onboarding@resend.dev>";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(
      `[email] RESEND_API_KEY is not set; logging instead.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`,
    );
    return;
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Resend rejected the email (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }
}

export function buildPasswordResetEmail({
  name,
  resetUrl,
}: {
  name: string;
  resetUrl: string;
}) {
  const greeting = `Hi ${escapeHtml(name)},`;

  const text = `Hi ${name},

We received a request to reset your Foretell password. Open the link below within the next hour to choose a new one:

${resetUrl}

If you did not request this, you can ignore this email. Your password will stay the same.`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef1ea;color:#101713;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#f7f8f2;border:1px solid #d5dccf;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #d5dccf;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#5b665f;">
                Foretell
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:Georgia,'Times New Roman',serif;">
                <h1 style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:26px;line-height:1.2;color:#101713;">
                  Reset your password
                </h1>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#101713;">${greeting}</p>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#101713;">
                  We received a request to reset your password. Choose a new one with the link below.
                </p>
                <p style="margin:28px 0;">
                  <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#101713;color:#eef1ea;padding:14px 22px;text-decoration:none;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;">
                    Choose a new password
                  </a>
                </p>
                <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#5b665f;">
                  This link expires in one hour and can only be used once.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #d5dccf;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#5b665f;">
                If you did not request this, you can ignore this email. Your password will stay the same.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: "Reset your Foretell password",
    text,
    html,
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}
