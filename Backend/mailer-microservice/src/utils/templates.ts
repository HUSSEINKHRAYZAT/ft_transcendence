// export function verificationEmailHtml(firstName: string, code: string) {
//   return `
//   <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
//     <h2>Welcome${firstName ? `, ${firstName}` : ''}!</h2>
//     <p>Your verification code:</p>
//     <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${code}</div>
//     <p>Enter this code in the website to verify your account.</p>
//   </div>`;
// }



export function verificationEmailHtml(firstName: string, code: string) {
  return `
  <div style="background-color:#111827;padding:40px 20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#f7ffe0;">
    <table width="100%" style="max-width:560px;margin:auto;background-color:#1f2937;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="background-color:#84cc16;padding:20px;text-align:center;">
          <h1 style="margin:0;font-size:24px;color:#111827;font-weight:700;">ft_pong</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#f7ffe0;">
            Welcome${firstName ? `, ${firstName}` : ''}!
          </h2>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#d1d5db;">
            Thank you for signing up. Please use the verification code below to activate your account.
          </p>
          <div style="font-size:32px;font-weight:700;letter-spacing:6px;background-color:#374151;color:#84cc16;padding:16px;text-align:center;border-radius:8px;margin:24px 0;">
            ${code}
          </div>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#d1d5db;">
            Enter this code on our website to complete your verification.
          </p>
        </td>
      </tr>
      <tr>
        <td style="background-color:#15803d;text-align:center;padding:16px;color:#f7ffe0;font-size:13px;">
          &copy; ${new Date().getFullYear()} FT_PONG. All rights reserved.
        </td>
      </tr>
    </table>
  </div>`;
}

export function verificationEmailText(firstName: string, code: string) {
  const hi = firstName ? `Hi ${firstName},` : 'Hi,';
  return `${hi}\n\nYour verification code is: ${code}\n\nEnter this code in the website to verify your account.`;
}
