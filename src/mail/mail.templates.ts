import type { MailMessage } from './mail.service.js';

export interface Brand {
  /** Company display name, e.g. "Staffwise". */
  name: string;
  /** #RRGGBB, used for the button. */
  color: string;
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

interface Body {
  greeting: string;
  /** Plain-text paragraphs (escaped for HTML). */
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
}

/** One layout for every email: plain text plus a minimal inline-styled HTML. */
function render(
  to: string,
  subject: string,
  brand: Brand,
  body: Body,
): MailMessage {
  const text = [
    body.greeting,
    '',
    ...body.paragraphs.flatMap((p) => [p, '']),
    ...(body.action ? [`${body.action.label}: ${body.action.url}`, ''] : []),
    ...(body.footnote ? [body.footnote, ''] : []),
    `— ${brand.name}`,
  ].join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px">
<tr><td>
<p style="font-size:18px;font-weight:bold;margin:0 0 24px">${escape(brand.name)}</p>
<p>${escape(body.greeting)}</p>
${body.paragraphs.map((p) => `<p style="line-height:1.5">${escape(p)}</p>`).join('\n')}
${
  body.action
    ? `<p style="margin:28px 0"><a href="${escape(body.action.url)}" style="background:${escape(brand.color)};color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${escape(body.action.label)}</a></p>
<p style="font-size:12px;color:#71717a">If the button does not work, open this link: ${escape(body.action.url)}</p>`
    : ''
}
${body.footnote ? `<p style="font-size:12px;color:#71717a">${escape(body.footnote)}</p>` : ''}
</td></tr></table></body></html>`;

  return { to, subject, text, html };
}

export interface Recipient {
  email: string;
  firstName: string;
}

export const templates = {
  passwordReset: (r: Recipient, brand: Brand, url: string, minutes: number) =>
    render(r.email, `Reset your ${brand.name} password`, brand, {
      greeting: `Hi ${r.firstName},`,
      paragraphs: [
        'We received a request to reset your password.',
        `The link below works once and expires in ${minutes} minutes.`,
      ],
      action: { label: 'Reset password', url },
      footnote:
        "If you didn't ask for this, you can ignore this email; your password stays the same.",
    }),

  accountSetup: (r: Recipient, brand: Brand, url: string, hours: number) =>
    render(r.email, `Your ${brand.name} account is ready`, brand, {
      greeting: `Hi ${r.firstName},`,
      paragraphs: [
        `An account has been created for you on ${brand.name}.`,
        `Choose your own password with the link below. It works once and expires in ${hours} hours.`,
      ],
      action: { label: 'Set your password', url },
    }),

  leaveSubmitted: (
    manager: Recipient,
    brand: Brand,
    l: {
      employeeName: string;
      type: string;
      start: string;
      end: string;
      days: number;
    },
  ) =>
    render(manager.email, `Leave request from ${l.employeeName}`, brand, {
      greeting: `Hi ${manager.firstName},`,
      paragraphs: [
        `${l.employeeName} requested ${l.type} leave from ${l.start} to ${l.end} (${l.days} working day${l.days === 1 ? '' : 's'}).`,
        'Review it in the pending leave requests.',
      ],
    }),

  leaveDecided: (
    r: Recipient,
    brand: Brand,
    l: { type: string; start: string; end: string; approved: boolean },
  ) =>
    render(
      r.email,
      `Your leave request was ${l.approved ? 'approved' : 'rejected'}`,
      brand,
      {
        greeting: `Hi ${r.firstName},`,
        paragraphs: [
          `Your ${l.type} leave from ${l.start} to ${l.end} was ${l.approved ? 'approved' : 'rejected'}.`,
        ],
      },
    ),

  correctionDecided: (
    r: Recipient,
    brand: Brand,
    c: { workDate: string; approved: boolean },
  ) =>
    render(
      r.email,
      `Attendance correction ${c.approved ? 'approved' : 'rejected'}`,
      brand,
      {
        greeting: `Hi ${r.firstName},`,
        paragraphs: [
          c.approved
            ? `Your attendance correction for ${c.workDate} was approved and your record has been updated.`
            : `Your attendance correction for ${c.workDate} was rejected.`,
        ],
      },
    ),

  certificateDecided: (
    r: Recipient,
    brand: Brand,
    c: { purpose: string; referenceNo: string | null; issued: boolean },
  ) =>
    render(
      r.email,
      c.issued
        ? `Your salary certificate ${c.referenceNo} is ready`
        : 'Your salary certificate request was declined',
      brand,
      {
        greeting: `Hi ${r.firstName},`,
        paragraphs: [
          c.issued
            ? `Your salary certificate for "${c.purpose}" has been issued (ref. ${c.referenceNo}). Download it from ${brand.name}.`
            : `Your salary certificate request for "${c.purpose}" was declined. Contact HR if you have questions.`,
        ],
      },
    ),

  separationDecided: (
    r: Recipient,
    brand: Brand,
    s: { lastWorkingDay: string; approved: boolean },
  ) =>
    render(
      r.email,
      s.approved
        ? 'Your resignation has been accepted'
        : 'Your resignation request was declined',
      brand,
      {
        greeting: `Hi ${r.firstName},`,
        paragraphs: s.approved
          ? [
              `Your resignation has been accepted. Your last working day is ${s.lastWorkingDay}.`,
              'HR will share your final settlement before then.',
            ]
          : [
              'Your resignation request was declined. Please talk to HR or your manager.',
            ],
      },
    ),

  payslipReady: (r: Recipient, brand: Brand, month: string) =>
    render(r.email, `Your payslip for ${month} is ready`, brand, {
      greeting: `Hi ${r.firstName},`,
      paragraphs: [
        `Payroll for ${month} has been approved and your payslip is available in ${brand.name}.`,
      ],
    }),
};
