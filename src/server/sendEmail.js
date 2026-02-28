const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function normalizeText(value) {
  return (value || '').toString().trim();
}

export function validateContactPayload(payload) {
  const name = normalizeText(payload?.name);
  const email = normalizeText(payload?.email);
  const subject = normalizeText(payload?.subject) || 'Message from portfolio';
  const topic = normalizeText(payload?.topic) || 'General';
  const message = normalizeText(payload?.message);

  if (!name || !email || !message) {
    return { ok: false, error: 'Name, email, and message are required.' };
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return { ok: false, error: 'Please provide a valid email address.' };
  }

  return {
    ok: true,
    data: { name, email, subject, topic, message }
  };
}

export async function sendResendEmail(payload, env = process.env) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM_EMAIL || 'Portfolio Contact <onboarding@resend.dev>';
  const to = env.CONTACT_TO_EMAIL || 'sudiksha0302@gmail.com';

  if (!apiKey) {
    return { ok: false, status: 500, error: 'RESEND_API_KEY is missing.' };
  }

  const validation = validateContactPayload(payload);
  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.error };
  }

  const { name, email, subject, topic, message } = validation.data;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.55; color: #0f172a;">
      <h2 style="margin: 0 0 12px;">New portfolio contact message</h2>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${name}</p>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0 0 8px;"><strong>Topic:</strong> ${topic}</p>
      <p style="margin: 0 0 16px;"><strong>Subject:</strong> ${subject}</p>
      <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #f8fafc;">
        ${message.replace(/\n/g, '<br/>')}
      </div>
    </div>
  `;

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `[${topic}] ${subject}`,
      html
    })
  });

  const responseJson = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messageText = responseJson?.message || 'Failed to send email.';
    return { ok: false, status: response.status, error: messageText };
  }

  return { ok: true, status: 200, id: responseJson?.id || null };
}
