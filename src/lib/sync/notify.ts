// Plain fetch to Resend's REST API — no SDK needed for a single email type.
// Sandbox sender (onboarding@resend.dev) works without domain verification
// as long as ALERT_EMAIL_TO is the Resend account's own address.
export async function sendSyncAlertEmail(subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;

  if (!apiKey || !to) {
    console.error("RESEND_API_KEY or ALERT_EMAIL_TO not set — skipping alert email. Message was:", subject, body);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "OBSI Hofer Sync <onboarding@resend.dev>",
      to,
      subject,
      text: body,
    }),
  });

  if (!res.ok) {
    console.error(`Failed to send alert email (${res.status}): ${await res.text()}`);
  }
}
