import { ProcurementOrder, getProcurementStatusLabel } from './procurementStore';

const buildRows = (order: ProcurementOrder) =>
  order.items
    .map(
      (item) => `
        <tr>
          <td>${item.title}</td>
          <td>${item.barcode}</td>
          <td>${item.quantity}</td>
          <td>${typeof item.receivedQuantity === 'number' ? item.receivedQuantity : '-'}</td>
        </tr>
      `
    )
    .join('');

const buildTimeline = (order: ProcurementOrder) =>
  order.timeline
    .map(
      (item) => `
        <div class="timeline-item">
          <div class="dot"></div>
          <div>
            <div class="timeline-title">${item.label}</div>
            <div class="timeline-meta">${item.by} · ${item.at}</div>
          </div>
        </div>
      `
    )
    .join('');

export const buildProcurementDocumentHtml = (
  order: ProcurementOrder,
  title: string,
  subtitle: string
) => `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}-${order.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
        h1 { margin: 0 0 8px; font-size: 24px; }
        .subtitle { color: #475569; margin-bottom: 16px; font-size: 14px; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
        .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 14px; }
        .label { color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        .value { color: #0f172a; font-size: 15px; font-weight: 800; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; }
        th { background: #f8fafc; }
        .timeline { margin-top: 20px; padding: 16px; border: 1px solid #cbd5e1; border-radius: 14px; }
        .timeline-item { display: flex; gap: 10px; margin-bottom: 12px; }
        .timeline-item:last-child { margin-bottom: 0; }
        .dot { width: 10px; height: 10px; margin-top: 6px; border-radius: 999px; background: #0ea5e9; flex-shrink: 0; }
        .timeline-title { font-size: 14px; font-weight: 800; }
        .timeline-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
        .note { margin-top: 16px; padding: 12px 14px; border-radius: 12px; background: #fff7ed; color: #9a3412; font-size: 13px; font-weight: 700; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
      <div class="grid">
        <div class="card"><div class="label">单号</div><div class="value">${order.id}</div></div>
        <div class="card"><div class="label">状态</div><div class="value">${getProcurementStatusLabel(order.status)}</div></div>
        <div class="card"><div class="label">零售门店</div><div class="value">${order.retailerName}</div></div>
        <div class="card"><div class="label">批发商</div><div class="value">${order.wholesalerName}</div></div>
      </div>
      <table>
        <thead>
          <tr><th>商品</th><th>条码</th><th>应到/应发</th><th>实收</th></tr>
        </thead>
        <tbody>${buildRows(order)}</tbody>
      </table>
      <div class="timeline">
        <div class="label">流转时间轴</div>
        <div style="margin-top:12px;">${buildTimeline(order)}</div>
      </div>
      ${order.note ? `<div class="note">${order.note}</div>` : ''}
    </body>
  </html>
`;

export const printProcurementDocument = (
  order: ProcurementOrder,
  title: string,
  subtitle: string
) => {
  const popup = window.open('', '_blank', 'width=980,height=760');
  if (!popup) return;
  popup.document.write(buildProcurementDocumentHtml(order, title, subtitle));
  popup.document.close();
  popup.focus();
  popup.print();
};
