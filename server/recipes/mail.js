import nodemailer from 'nodemailer';
import { ProductConfigurationError } from './config.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export async function sendAccessEmail({ email, url, productTitle, env = process.env }) {
  const user = String(env.SMTP_USER || '').trim();
  const password = String(env.SMTP_APP_PASSWORD || '');
  const from = String(env.SMTP_FROM || user).trim();
  if (!user || !password || !from) throw new ProductConfigurationError('Configure SMTP_USER, SMTP_APP_PASSWORD e SMTP_FROM.');
  const transporter = nodemailer.createTransport({
    host: String(env.SMTP_HOST || 'smtp.gmail.com'),
    port: Number(env.SMTP_PORT || 465),
    secure: Number(env.SMTP_PORT || 465) === 465,
    requireTLS: Number(env.SMTP_PORT || 465) !== 465,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  const safeUrl = escapeHtml(url);
  const safeTitle = escapeHtml(productTitle);
  await transporter.sendMail({
    from,
    to: email,
    subject: `Seu acesso à coleção de receitas | Gislaine Duarte`,
    text: `Seu acesso a ${productTitle} está pronto. Abra este link em até 15 minutos: ${url}\n\nSe você não pediu este acesso, ignore esta mensagem.`,
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head><body style="margin:0;padding:32px 12px;background:#f3f1e9;font-family:Arial,sans-serif;color:#173f35"><table role="presentation" style="max-width:560px;margin:auto;background:#fff;border-radius:18px;border-collapse:collapse;overflow:hidden"><tr><td style="padding:32px 36px;background:#173f35;color:#f5f1e8"><p style="margin:0;font-size:12px;letter-spacing:3px;color:#d9bf85">GISLAINE DUARTE</p><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:34px;line-height:1.15;margin:20px 0 0">Sua coleção está pronta.</h1></td></tr><tr><td style="padding:32px 36px"><p style="font-size:16px;line-height:1.6">Seu acesso a <strong>${safeTitle}</strong> foi preparado. Confirme seu e-mail para abrir as receitas, a versão offline e o PDF.</p><p style="margin:30px 0"><a href="${safeUrl}" style="display:inline-block;background:#173f35;color:#fff;text-decoration:none;padding:16px 25px;border-radius:9px;font-weight:bold">Confirmar meu acesso</a></p><p style="font-size:13px;line-height:1.6;color:#5e6a62">Este link expira em 15 minutos. Se você iniciou o acesso no computador e abriu este e-mail no celular, o computador também entrará automaticamente após a confirmação.</p><p style="font-size:12px;line-height:1.5;color:#727a74">Se você não solicitou este acesso, pode ignorar a mensagem.</p></td></tr></table></body></html>`,
  });
}
