import type { CompanyProfile } from '../database/schema/company.schema.js';
import type { Payslip, PayrollRun } from '../database/schema/payroll.schema.js';
import {
  amountTable,
  details,
  footnote,
  formatDate,
  heading,
  letterhead,
  paragraph,
  renderPdf,
} from '../common/pdf/pdf.util.js';
import { amountInWords, formatMoney } from '../common/pdf/money.util.js';
import { maskAccountNumber } from './payroll.util.js';

export interface PayslipPdfInput {
  company: CompanyProfile | undefined;
  logo?: Buffer;
  run: PayrollRun;
  payslip: Payslip;
  employee: {
    employeeCode: string;
    jobTitle: string;
    firstName: string;
    lastName: string;
    departmentName: string;
  };
}

export function renderPayslipPdf(input: PayslipPdfInput): Promise<Buffer> {
  const { company, run, payslip: s, employee: e } = input;
  const currency = company?.currency ?? 'BDT';
  const money = (amount: string) => formatMoney(amount, currency);
  const period = formatDate(run.month.slice(0, 7));
  const gross = (Number(s.basePay) + Number(s.allowances)).toFixed(2);

  return renderPdf(`Payslip ${period} - ${e.employeeCode}`, (doc) => {
    letterhead(doc, company, input.logo);
    heading(doc, `Payslip for ${period}`);
    details(doc, [
      ['Employee', `${e.firstName} ${e.lastName}`],
      ['Employee ID', e.employeeCode],
      ['Designation', e.jobTitle],
      ['Department', e.departmentName],
      ['Pay period', period],
      ['Unpaid leave', `${s.unpaidLeaveDays} day(s)`],
    ]);
    amountTable(
      doc,
      'Earnings',
      [
        ['Basic pay', money(s.basePay)],
        ['Allowances', money(s.allowances)],
      ],
      ['Gross earnings', money(gross)],
    );
    amountTable(
      doc,
      'Deductions',
      [['Unpaid leave', money(s.deductions)]],
      ['Total deductions', money(s.deductions)],
    );
    amountTable(doc, 'Net pay', [], ['Net pay', money(s.netPay)]);
    paragraph(doc, `In words: ${amountInWords(s.netPay, currency)}.`);
    if (s.bankName) {
      details(doc, [
        [
          'Paid to',
          `${s.bankName}${s.bankBranchName ? `, ${s.bankBranchName}` : ''}`,
        ],
        ['Account', maskAccountNumber(s.bankAccountNumber) ?? ''],
      ]);
    }
    footnote(
      doc,
      `Computer-generated payslip; no signature required. Payroll run #${run.id} (${run.status}).`,
    );
  });
}
