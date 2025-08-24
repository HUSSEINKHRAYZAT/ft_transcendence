import fp from 'fastify-plugin';

import nodemailer from 'nodemailer';
export const smtpPlugin = fp(async (app) => {
  const c = app.config;
  const transporter = nodemailer.createTransport({
    host: c.SMTP_HOST,
    port: c.SMTP_PORT,
    secure: c.SMTP_SECURE,
    auth: c.SMTP_USER && c.SMTP_PASS ? { user: c.SMTP_USER, pass: c.SMTP_PASS } : undefined,
  });

  await transporter.verify().catch((err: any) =>
    app.log.warn({ err }, 'SMTP verify failed (continuing)')
  );

  app.decorate('smtp', transporter);
});

declare module 'fastify' {
  interface FastifyInstance {
    smtp: nodemailer.Transporter;
  }
}
