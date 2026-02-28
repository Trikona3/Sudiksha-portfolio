import { sendResendEmail } from '../src/server/sendEmail.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const result = await sendResendEmail(req.body || {});
  if (!result.ok) {
    res.status(result.status || 500).json({ ok: false, error: result.error });
    return;
  }

  res.status(200).json({ ok: true, id: result.id });
}
