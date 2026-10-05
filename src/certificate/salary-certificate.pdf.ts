import type { CompanyProfile } from '../database/schema/company.schema.js';
import type { SalaryCertificateSnapshot } from '../database/schema/salary-certificate.schema.js';
import {
  amountTable,
  contentWidth,
  endSentence,
  footnote,
  formatDate,
  heading,
  letterhead,
  paragraph,
  renderPdf,
} from '../common/pdf/pdf.util.js';
import { amountInWords, formatMoney } from '../common/pdf/money.util.js';

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  permanent: 'permanent',
  contract: 'contractual',
  intern: 'internship',
  part_time: 'part-time',
};

export interface SalaryCertificatePdfInput {
  /** Current profile, for the letterhead only; the body uses the snapshot. */
  company: CompanyProfile | undefined;
  logo?: Buffer;
  referenceNo: string;
  purpose: string;
  addressedTo: string | null;
  snapshot: SalaryCertificateSnapshot;
}

export function renderSalaryCertificatePdf(
  input: SalaryCertificatePdfInput,
): Promise<Buffer> {
  const { company, snapshot: s } = input;
  const money = (amount: string) => formatMoney(amount, s.currency);
  const type = EMPLOYMENT_TYPE_LABEL[s.employmentType] ?? s.employmentType;

  return renderPdf(`Salary Certificate ${input.referenceNo}`, (doc) => {
    letterhead(doc, company, input.logo);

    const top = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text(`Ref: ${input.referenceNo}`, doc.x, top);
    doc.text(`Date: ${formatDate(s.issueDate)}`, doc.x, top, {
      width: contentWidth(doc),
      align: 'right',
    });
    doc.moveDown(2);

    doc.font('Helvetica').fontSize(10.5);
    for (const line of (input.addressedTo ?? 'To Whom It May Concern').split(
      ',',
    )) {
      doc.text(line.trim());
    }
    doc.moveDown(1.5);

    heading(doc, 'SALARY CERTIFICATE');

    paragraph(
      doc,
      `This is to certify that ${s.employeeName} (Employee ID: ${s.employeeCode}) ` +
        `has been employed with ${s.companyLegalName} on a ${type} basis since ` +
        `${formatDate(s.hiredAt)} and currently holds the position of ${s.jobTitle} ` +
        `in the ${s.departmentName} department.`,
    );
    paragraph(
      doc,
      `The current monthly salary of ${s.employeeName} is as follows:`,
    );

    amountTable(
      doc,
      'Monthly salary',
      [
        ['Basic pay', money(s.basePay)],
        ['Allowances', money(s.allowances)],
      ],
      ['Gross monthly salary', money(s.grossPay)],
    );
    paragraph(doc, `In words: ${amountInWords(s.grossPay, s.currency)}.`);
    paragraph(
      doc,
      `This certificate is issued upon request for the purpose of ${input.purpose} ` +
        `and carries no financial obligation or liability on the part of ` +
        endSentence(s.companyLegalName),
    );

    doc.moveDown(3);
    const x = doc.x;
    const y = doc.y;
    doc
      .moveTo(x, y)
      .lineTo(x + 180, y)
      .lineWidth(0.7)
      .strokeColor('#000000')
      .stroke();
    doc.y = y + 6;
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(s.signatoryName ?? 'Authorized Signatory', x);
    doc.font('Helvetica').fontSize(10);
    if (s.signatoryTitle) doc.text(s.signatoryTitle, x);
    doc.text(s.companyLegalName, x);

    footnote(
      doc,
      `Reference ${input.referenceNo}. To verify this certificate, contact ` +
        endSentence(company?.supportEmail ?? s.companyLegalName),
    );
  });
}
