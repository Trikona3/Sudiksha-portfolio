import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sendResendEmail } from './src/server/sendEmail.js';

function contactApiPlugin() {
  return {
    name: 'contact-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/send-email', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        try {
          const body = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => {
              const raw = Buffer.concat(chunks).toString('utf8') || '{}';
              try {
                resolve(JSON.parse(raw));
              } catch (error) {
                reject(error);
              }
            });
            req.on('error', reject);
          });

          const result = await sendResendEmail(body);
          res.statusCode = result.status || (result.ok ? 200 : 500);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.ok ? { ok: true, id: result.id } : { ok: false, error: result.error }));
        } catch {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Unable to send email.' }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), contactApiPlugin()]
});
