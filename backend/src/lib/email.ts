import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "noreply@golfcharityplatform.com";

export async function sendConfirmationEmail(
  to: string,
  name: string
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Golf Charity Platform — confirm your email",
    html: `<p>Hi ${name},</p><p>Thanks for registering. Please confirm your email to get started.</p>`,
  });
}

export async function sendDrawResultsEmail(
  subscriberIds: string[],
  drawId: string
): Promise<void> {
  // In production this would fetch subscriber emails and send individually.
  // Placeholder implementation — real delivery requires fetching emails from profiles.
  console.log(`Draw results email triggered for draw ${drawId} to ${subscriberIds.length} subscribers`);
}

export async function sendWinnerAlertEmail(to: string, prizeAmount: number): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Congratulations — You won a Golf Charity Platform draw!",
    html: `<p>You have won £${prizeAmount.toFixed(2)}. Please log in to submit your verification proof.</p>`,
  });
}

export async function sendWinnerRejectionEmail(to: string, name: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your Golf Charity Platform winner proof was not approved",
    html: `<p>Hi ${name || "there"},</p><p>Unfortunately your proof submission was not approved. Please log in and resubmit your proof screenshot.</p>`,
  });
}

export async function sendSubscriptionEmail(
  to: string,
  event: "renewal_success" | "renewal_failed"
): Promise<void> {
  const subject =
    event === "renewal_success"
      ? "Your Golf Charity Platform subscription has been renewed"
      : "Action required: Your Golf Charity Platform subscription renewal failed";
  const body =
    event === "renewal_success"
      ? "<p>Your subscription has been successfully renewed. Thank you!</p>"
      : "<p>We were unable to renew your subscription. Please update your payment details.</p>";

  await resend.emails.send({ from: FROM, to, subject, html: body });
}
