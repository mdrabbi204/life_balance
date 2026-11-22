import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type Row = Record<string, unknown>

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportCsv(rows: Row[], columns: { key: string; label: string }[], filename: string) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(','))].join('\n')
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename)
}

export function exportPdf(opts: { title: string; subtitle: string; summary: [string, string][]; sections: { title: string; columns: string[]; rows: (string | number)[][] }[]; filename: string }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  doc.setFontSize(18)
  doc.setTextColor(15, 118, 110)
  doc.text(opts.title, 40, 48)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(opts.subtitle, 40, 66)

  autoTable(doc, {
    startY: 84,
    head: [['Metric', 'Value']],
    body: opts.summary,
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110] },
    styles: { fontSize: 9 },
    tableWidth: 320,
  })
  for (const s of opts.sections) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const y = ((doc as any).lastAutoTable?.finalY ?? 84) + 28
    doc.setFontSize(12)
    doc.setTextColor(30)
    doc.text(s.title, 40, y)
    autoTable(doc, { startY: y + 8, head: [s.columns], body: s.rows, theme: 'striped', headStyles: { fillColor: [15, 118, 110] }, styles: { fontSize: 8 } })
  }
  doc.save(opts.filename)
}
