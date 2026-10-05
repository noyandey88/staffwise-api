import PDFDocument from 'pdfkit';
import type { CompanyProfile } from '../../database/schema/company.schema.js';

export type Pdf = PDFKit.PDFDocument;

const MARGIN = 56;
const MUTED = '#52525b';
const RULE = '#d4d4d8';
const DEFAULT_COLOR = '#1E40AF';

/** Builds an A4 PDF in memory. */
export function renderPdf(
  title: string,
  draw: (doc: Pdf) => void,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      info: { Title: title, Producer: 'Staffwise' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      draw(doc);
      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export function contentWidth(doc: Pdf) {
  return doc.page.width - MARGIN * 2;
}

/** Logo (if any) on the right, company name, contact line, coloured rule. */
export function letterhead(
  doc: Pdf,
  company: CompanyProfile | undefined,
  logo?: Buffer,
) {
  const color = company?.primaryColor ?? DEFAULT_COLOR;
  const logoBox = 48;
  if (logo) {
    try {
      doc.image(logo, MARGIN + contentWidth(doc) - logoBox * 2, MARGIN - 6, {
        fit: [logoBox * 2, logoBox],
        align: 'right',
      });
    } catch {
      // An unreadable image must not break the document.
    }
  }
  doc
    .fillColor(color)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text(company?.legalName ?? 'Staffwise', MARGIN, MARGIN, {
      width: contentWidth(doc) - (logo ? logoBox * 2 + 12 : 0),
    });

  const contact = [
    company?.address,
    company?.phone,
    company?.supportEmail,
    company?.website,
  ].filter(Boolean);
  if (contact.length) {
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(9)
      .text(contact.join('  ·  '), {
        width: contentWidth(doc) - (logo ? logoBox * 2 + 12 : 0),
      });
  }

  const y = Math.max(doc.y, logo ? MARGIN + logoBox - 6 : 0) + 8;
  doc
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + contentWidth(doc), y)
    .lineWidth(2)
    .strokeColor(color)
    .stroke();
  doc.y = y + 18;
  doc.x = MARGIN;
  doc.fillColor('#000000');
}

export function heading(doc: Pdf, text: string) {
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#000000')
    .text(text, MARGIN, doc.y, { align: 'center', width: contentWidth(doc) });
  doc.moveDown(1);
}

/** Two columns of "Label: value" pairs. */
export function details(doc: Pdf, rows: [string, string][]) {
  const half = contentWidth(doc) / 2;
  const labelWidth = 95;
  doc.fontSize(10);
  for (let i = 0; i < rows.length; i += 2) {
    const y = doc.y;
    let bottom = y;
    for (const [col, row] of [rows[i], rows[i + 1]].entries()) {
      if (!row) continue;
      const x = MARGIN + col * half;
      doc
        .font('Helvetica')
        .fillColor(MUTED)
        .text(row[0], x, y, { width: labelWidth });
      doc
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(row[1], x + labelWidth, y, { width: half - labelWidth - 8 });
      bottom = Math.max(bottom, doc.y);
    }
    doc.y = bottom + 4;
  }
  doc.x = MARGIN;
  doc.moveDown(0.8);
}

/** A bordered two-column table; `total` renders as a bold last row. Without rows, only the total is drawn. */
export function amountTable(
  doc: Pdf,
  title: string,
  rows: [string, string][],
  total?: [string, string],
) {
  const width = contentWidth(doc);
  const rowHeight = 22;
  const draw = (
    label: string,
    value: string,
    bold: boolean,
    shaded: boolean,
  ) => {
    const y = doc.y;
    if (shaded) doc.rect(MARGIN, y, width, rowHeight).fill('#f4f4f5');
    doc
      .rect(MARGIN, y, width, rowHeight)
      .lineWidth(0.5)
      .strokeColor(RULE)
      .stroke();
    doc
      .fillColor('#000000')
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(10)
      .text(label, MARGIN + 10, y + 7, { width: width / 2 - 10 })
      .text(value, MARGIN + width / 2, y + 7, {
        width: width / 2 - 10,
        align: 'right',
      });
    doc.y = y + rowHeight;
  };
  if (rows.length) draw(title, '', true, true);
  for (const [label, value] of rows) draw(label, value, false, false);
  if (total) draw(total[0], total[1], true, true);
  doc.x = MARGIN;
  doc.moveDown(1);
}

/** Ends a sentence with `text` without doubling a period ("Ltd." + "."). */
export function endSentence(text: string): string {
  return text.endsWith('.') ? text : `${text}.`;
}

export function paragraph(doc: Pdf, text: string) {
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor('#000000')
    .text(text, MARGIN, doc.y, {
      width: contentWidth(doc),
      align: 'justify',
      lineGap: 3,
    });
  doc.moveDown(0.8);
}

export function footnote(doc: Pdf, text: string) {
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED)
    .text(text, MARGIN, doc.page.height - MARGIN - 20, {
      width: contentWidth(doc),
      align: 'center',
    });
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-10-05" -> "05 October 2026"; "2026-10" -> "October 2026". */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  const month = MONTHS[Number(m) - 1];
  return d ? `${d} ${month} ${y}` : `${month} ${y}`;
}
