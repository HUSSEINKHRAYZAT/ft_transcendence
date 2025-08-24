export function verificationEmailHtml(firstName: string, code: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
    <h2>Welcome${firstName ? `, ${firstName}` : ''}!</h2>
    <p>Your verification code:</p>
    <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${code}</div>
    <p>Enter this code in the website to verify your account.</p>
  </div>`;
}

export function verificationEmailText(firstName: string, code: string) {
  const hi = firstName ? `Hi ${firstName},` : 'Hi,';
  return `${hi}\n\nYour verification code is: ${code}\n\nEnter this code in the website to verify your account.`;
}
