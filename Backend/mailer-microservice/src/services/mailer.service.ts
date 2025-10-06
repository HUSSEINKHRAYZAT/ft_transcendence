import type { FastifyInstance } from 'fastify';
import { verificationEmailHtml, verificationEmailText } from '../utils/templates';

export function mailerService(app: FastifyInstance) {
  const from = `${app.config.FROM_NAME} <${app.config.FROM_EMAIL}>`;

  async function sendVerification(to: string, firstName: string, code: string) {
    console.log('📧 ========================================');
    console.log('📧 VERIFICATION CODE BEING SENT:');
    console.log('📧 Email:', to);
    console.log('📧 Name:', firstName);
    console.log('📧 CODE:', code);
    console.log('📧 ========================================');
    
    const subject = 'Your verification code';
    const html = verificationEmailHtml(firstName, code);
    const text = verificationEmailText(firstName, code);
    const info = await app.smtp.sendMail({ from, to, subject, html, text });
    app.log.info({ to, messageId: info.messageId, code }, 'verification email sent');
  }

  return { sendVerification };
}
