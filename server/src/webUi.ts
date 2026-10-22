const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
const ACCENT = '#5b9a6f';
const TEXT = '#1f2937';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const BG = '#f7f8fa';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[char] ?? char);
}

export function appHomeUrl(appPublicUrl: string): string {
  return appPublicUrl.replace(/\/?$/, '/');
}

export function page(
  title: string,
  body: string,
  action?: { href: string; label: string },
  lang = 'ru',
): string {
  const button = action
    ? `<a class="btn" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`
    : '';
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100dvh;
    background: ${BG};
    color: ${TEXT};
    font: 16px/1.5 ${FONT};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }
  .card {
    width: min(100%, 400px);
    background: #fff;
    border: 1px solid ${BORDER};
    border-radius: 16px;
    padding: 28px 22px 24px;
  }
  .brand {
    margin: 0 0 18px;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: ${ACCENT};
  }
  h1 {
    margin: 0 0 10px;
    font-size: 1.45rem;
    line-height: 1.25;
  }
  p { margin: 0 0 14px; color: ${MUTED}; }
  label { display: block; font-size: 14px; font-weight: 600; color: ${TEXT}; margin: 0 0 6px; }
  input[type="password"] {
    width: 100%;
    font: 16px/1.4 ${FONT};
    padding: 12px 14px;
    border: 1px solid ${BORDER};
    border-radius: 12px;
    background: #fff;
    color: ${TEXT};
  }
  .btn, button[type="submit"] {
    display: block;
    width: 100%;
    margin-top: 16px;
    padding: 14px 16px;
    border: none;
    border-radius: 12px;
    background: ${ACCENT};
    color: #fff;
    font: 600 16px ${FONT};
    text-align: center;
    text-decoration: none;
    cursor: pointer;
  }
  form { margin: 12px 0 0; }
</style>
</head>
<body>
  <main class="card">
    <p class="brand">TiLi</p>
    <h1>${escapeHtml(title)}</h1>
    ${body}
    ${button}
  </main>
</body>
</html>`;
}

export function transactionalMailHtml(input: {
  title: string;
  text: string;
  buttonLabel: string;
  buttonHref: string;
  footnote: string;
  lang?: string;
}): string {
  const href = escapeHtml(input.buttonHref);
  const lang = escapeHtml(input.lang ?? 'ru');
  return `<!doctype html>
<html lang="${lang}">
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;">
          <tr>
            <td style="padding:28px 24px 24px;font-family:${FONT};color:${TEXT};">
              <p style="margin:0 0 16px;font-size:15px;font-weight:800;letter-spacing:0.04em;color:${ACCENT};">TiLi</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;">${escapeHtml(input.title)}</h1>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:${MUTED};">${escapeHtml(input.text)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius:12px;background:${ACCENT};">
                    <a href="${href}" style="display:block;padding:14px 16px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(input.buttonLabel)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.45;color:${MUTED};">${escapeHtml(input.footnote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
