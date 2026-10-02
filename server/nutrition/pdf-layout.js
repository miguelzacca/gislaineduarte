export const pdfColors = { forest: '#173f35', ink: '#203d34', sage: '#eaf0e5', ivory: '#fbfaf6', gold: '#ac803b', sand: '#f4ecdf', muted: '#50675c', line: '#d7dfd1', white: '#ffffff' };

export function createPdfLayout(doc) {
  const left = 42, width = doc.page.width - 84, bottom = 770;
  let cursor = 42, chapter = '', pageTitle = '', serial = 0;
  const entries = [];
  const text = value => String(value ?? '').replaceAll('≥', 'a partir de ').replaceAll('≤', 'até ');
  const measure = (value, size = 12, area = width, font = 'Body', lineGap = 3) => doc.font(font).fontSize(size).heightOfString(text(value), { width: area, lineGap });
  const at = (value, x, y, { size = 12, area = width, font = 'Body', color = pdfColors.ink, lineGap = 3, ...options } = {}) => {
    const height = measure(value, size, area, font, lineGap);
    doc.font(font).fontSize(size).fillColor(color).text(text(value), x, y, { width: area, lineGap, ...options });
    return y + height;
  };
  const page = (title = pageTitle, { eyebrow = chapter, anchor, toc = false, first = false } = {}) => {
    if (!first) doc.addPage();
    pageTitle = title; chapter = eyebrow;
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(pdfColors.ivory);
    at(eyebrow.toLocaleUpperCase('pt-BR'), left, 34, { size: 10, font: 'Strong', color: pdfColors.gold, lineGap: 0 });
    cursor = at(title, left, 56, { size: 32, font: 'Editorial', lineGap: 1 }) + 13;
    if (anchor || toc) {
      const destination = anchor || `section-${serial++}`;
      doc.addNamedDestination(destination, 'XYZ', left, 40, null);
      doc.outline.addItem(title);
      if (toc) entries.push({ label: title, page: doc.bufferedPageRange().count, destination });
    }
    return cursor;
  };
  const ensure = (height, title = `${pageTitle.replace(/ · continuação$/, '')} · continuação`) => {
    if (cursor + height <= bottom) return false;
    page(title); return true;
  };
  const paragraph = (value, { size = 12, font = 'Body', color = pdfColors.ink, gap = 13, area = width, x = left, lineGap = 4, ...options } = {}) => {
    let remaining = text(value).trim();
    while (remaining) {
      ensure(38);
      const available = bottom - cursor;
      if (measure(remaining, size, area, font, lineGap) <= available) {
        cursor = at(remaining, x, cursor, { size, font, color, area, lineGap, ...options }) + gap; break;
      }
      // Split lengthy professional prose at a word boundary. This keeps the
      // readable type size and leaves the fixed footer outside the text flow.
      let low = 0, high = remaining.length;
      while (low < high) { const mid = Math.ceil((low + high) / 2); if (measure(remaining.slice(0, mid), size, area, font, lineGap) <= available) low = mid; else high = mid - 1; }
      let cut = remaining.lastIndexOf(' ', low);
      if (cut < low / 2) cut = low;
      if (cut <= 0) { page(); continue; }
      cursor = at(remaining.slice(0, cut), x, cursor, { size, font, color, area, lineGap, ...options }) + gap;
      remaining = remaining.slice(cut).trim(); if (remaining) page();
    }
  };
  const heading = (value, { size = 23, gap = 12, keep = 60 } = {}) => {
    ensure(measure(value, size, width, 'Strong', 1) + keep);
    cursor = at(value, left, cursor, { size, font: 'Strong', lineGap: 1 }) + gap;
  };
  const image = (source, x, y, w, h, radius = 10) => {
    doc.save().roundedRect(x, y, w, h, radius).clip();
    doc.image(source, x, y, { cover: [w, h], align: 'center', valign: 'center' }); doc.restore();
  };
  const chips = (values, { gap = 7, size = 11.5, height = 37, fill = pdfColors.sage } = {}) => {
    const cellWidth = (width - gap * (values.length - 1)) / values.length;
    const h = Math.max(height, ...values.map(value => measure(value, size, cellWidth - 18, 'Strong', 2) + 18));
    ensure(h + 7); const top = cursor;
    values.forEach((value, index) => { const x = left + index * (cellWidth + gap); doc.roundedRect(x, top, cellWidth, h, 8).fill(fill); at(value, x + 9, top + 9, { size, area: cellWidth - 18, font: 'Strong', lineGap: 2 }); });
    cursor += h + 13;
  };
  return { left, width, bottom, entries, at, measure, page, ensure, paragraph, heading, image, chips,
    get y() { return cursor; }, set y(value) { cursor = value; },
    get section() { return chapter; },
  };
}
