import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  MAIL_FROM,
  APP_ORIGIN,
} = process.env;

const hasSmtpConfig = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

let transporter = null;
if (hasSmtpConfig) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true' || SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export function isMailConfigured() {
  return Boolean(transporter);
}

export async function sendResetEmail(to, token) {
  if (!transporter) {
    throw new Error('SMTP не настроен: заполните SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS');
  }
  const origin = APP_ORIGIN || 'http://localhost:5173';
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}&username=${encodeURIComponent(to || '')}`;

  await transporter.sendMail({
    from: MAIL_FROM || SMTP_USER,
    to,
    subject: 'Сброс пароля (Menu Constructor)',
    text: `Для сброса пароля перейдите по ссылке:\n${resetUrl}\n\nЕсли вы не запрашивали сброс, проигнорируйте это письмо.`,
    html: `<p>Для сброса пароля перейдите по ссылке:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>`,
  });
  return resetUrl;
}
