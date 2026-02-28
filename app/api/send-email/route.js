import { sendResendEmail } from '../../../src/server/sendEmail.js';

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const result = await sendResendEmail(payload);

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status || 500 });
  }

  return Response.json({ ok: true, id: result.id }, { status: 200 });
}

export async function GET() {
  return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}
