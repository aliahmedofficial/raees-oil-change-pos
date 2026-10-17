import { Sale } from '../../types';
import { useApp } from '../../context/SupabaseAppContext';
import { formatCurrency } from '../../lib/currency';

interface ReceiptPrintProps {
  sale: Sale;
  onClose: () => void;
}

export function ReceiptPrint({ sale, onClose }: ReceiptPrintProps) {
  const { state } = useApp();
  const customer = state.customers.find((entry) => entry.id === sale.customerId);
  const customerName = sale.customerName || customer?.name || '';
  const customerPhone = customer?.phone || '';

  const handlePrint = async () => {
    const invoice = document.getElementById('receipt-content');
    const invoiceStyles = document.querySelector<HTMLStyleElement>('.receipt-overlay style');
    if (!invoice || !invoiceStyles) return;

    const printFrame = document.createElement('iframe');
    printFrame.title = 'Invoice print document';
    printFrame.setAttribute('aria-hidden', 'true');
    Object.assign(printFrame.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '210mm',
      height: '297mm',
      border: '0',
    });
    document.body.appendChild(printFrame);

    const printWindow = printFrame.contentWindow;
    const printDocument = printWindow?.document;
    if (!printWindow || !printDocument) {
      printFrame.remove();
      return;
    }

    const themeVariables = [
      '--raees-ink',
      '--raees-gold',
      '--raees-paper',
      '--raees-line',
      '--raees-text',
      '--raees-bronze',
      '--raees-gold-light',
      '--raees-white',
      '--raees-ink-rgb',
      '--raees-gold-rgb',
      '--raees-paper-rgb',
      '--raees-line-rgb',
      '--raees-text-rgb',
      '--raees-bronze-rgb',
      '--raees-gold-light-rgb',
    ];
    const rootStyles = getComputedStyle(document.documentElement);
    const themeStyle = themeVariables
      .map((name) => `${name}: ${rootStyles.getPropertyValue(name).trim()};`)
      .join('\n');

    printDocument.open();
    printDocument.write(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Raees Enterprises Invoice</title>
          <style>:root { ${themeStyle} } ${invoiceStyles.textContent || ''}</style>
        </head>
        <body>${invoice.outerHTML}</body>
      </html>`);
    printDocument.close();

    const imagesReady = Promise.all(Array.from(printDocument.images).map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }));

    await Promise.all([printDocument.fonts.ready, imagesReady]);
    await new Promise<void>((resolve) => {
      printWindow.requestAnimationFrame(() => {
        printWindow.requestAnimationFrame(() => resolve());
      });
    });

    let cleanupTimer = 0;
    const cleanup = () => {
      window.clearTimeout(cleanupTimer);
      printFrame.remove();
    };
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    cleanupTimer = window.setTimeout(cleanup, 60000);
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="modal-overlay receipt-overlay">
      <div className="modal receipt-modal max-w-4xl">
        <div className="modal-header no-print">
          <h2 className="text-xl font-bold text-gray-900">Print Invoice</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        <div className="receipt-preview">
          <div className="receipt-page" id="receipt-content">
          <header className="receipt-header">
            <div className="receipt-brand-row">
              <div className="receipt-mark" aria-hidden="true">RE</div>
              <h1>RAEES ENTERPRISES</h1>
              <span className="receipt-company-type">SMC (PVT) LTD</span>
            </div>
            <div className="receipt-registration">NTN: 45897777</div>
            <p className="receipt-tagline">DEALS PETROCHEMICAL &amp; LUBE OILS</p>
            <p className="receipt-tagline receipt-oil-change">FREE OIL CHANGE</p>
            <p className="receipt-proprietor">Prop: Salman Ali 0304-2612690 0301-8864729</p>
          </header>

          <section className="receipt-customer" aria-label="Customer and vehicle information">
            <div className="receipt-serial"><strong>S.No#</strong><span>{sale.receiptNumber || sale.invoiceNumber}</span></div>
            <div className="receipt-field">
              <strong>Customer Name:</strong><span>{customerName}</span><i />
            </div>
            <div className="receipt-field">
              <strong>Phone No.</strong><span>{customerPhone}</span><i />
            </div>
            <div className="receipt-vehicle-row">
              <div className="receipt-field"><strong>Vehical No.</strong><i /></div>
              <div className="receipt-field"><strong>Vehical Model:</strong><i /></div>
            </div>
          </section>

          <table className="receipt-items">
            <colgroup>
              <col className="receipt-col-number" />
              <col className="receipt-col-description" />
              <col className="receipt-col-quantity" />
              <col className="receipt-col-rate" />
              <col className="receipt-col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th>S. No.</th>
                <th>DESCRIPTION / SERVICE</th>
                <th>QTY.</th>
                <th>RATE</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={`${item.product.id}-${index}`}>
                  <td className="receipt-center">{index + 1}</td>
                  <td>
                    {item.product.name}
                    {item.discount > 0 && <small>Discount: -{formatCurrency(item.discount)}</small>}
                  </td>
                  <td className="receipt-center">
                    {item.weight ? `${item.weight} ${item.product.unit}` : item.quantity}
                  </td>
                  <td className="receipt-money">
                    {formatCurrency(item.product.isWeightBased
                      ? item.product.pricePerUnit || 0
                      : item.product.price)}
                  </td>
                  <td className="receipt-money">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
              {sale.freeGifts?.map((gift, index) => (
                <tr key={`gift-${gift.product.id}-${index}`}>
                  <td className="receipt-center">{sale.items.length + index + 1}</td>
                  <td>{gift.product.name} (FREE)</td>
                  <td className="receipt-center">{gift.quantity}</td>
                  <td className="receipt-money">{formatCurrency(0)}</td>
                  <td className="receipt-money">{formatCurrency(0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="receipt-subtotal-row">
                <td colSpan={3} />
                <th>SUBTOTAL</th>
                <td className="receipt-money">{formatCurrency(sale.subtotal)}</td>
              </tr>
              {sale.discountAmount > 0 && (
                <tr className="receipt-discount-row">
                  <td colSpan={3} />
                  <th>DISCOUNT</th>
                  <td className="receipt-money">-{formatCurrency(sale.discountAmount)}</td>
                </tr>
              )}
              <tr className="receipt-total-row">
                <td colSpan={3} />
                <th colSpan={1}>TOTAL AMOUNT</th>
                <td className="receipt-money">{formatCurrency(sale.total)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="receipt-payment">
            <strong>Payment Method:</strong>
            <span>{sale.paymentMethod}</span>
          </div>

          <footer className="receipt-footer">
            <div className="receipt-footer-main">
              <div className="receipt-thanks">
                <strong>Thank You!</strong>
                <span>We Detail, You Shine</span>
                <span>Ali Ahmed 0336-0103000</span>
              </div>
              <div className="receipt-signature">
                <span />
                <strong>Authorized Signature</strong>
              </div>
            </div>
            <div className="receipt-address">
              Add: Shop # S-19,20 Stylish Veiw, Near Manghoper Road Chungi Karachi.
            </div>
          </footer>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button
            onClick={onClose}
            className="btn btn-secondary btn-md"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary btn-md"
          >
            Print Receipt
          </button>
        </div>        </div>

        <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            html, body {
              width: 100%;
              min-width: 0;
              margin: 0 !important;
              padding: 0 !important;
              background: var(--raees-white) !important;
            }

            .no-print {
              display: none !important;
            }

            .receipt-overlay,
            .receipt-modal {
              position: static !important;
              display: block !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              max-width: none !important;
              max-height: none !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: transparent !important;
              transform: none !important;
            }

            .receipt-preview {
              display: block !important;
              flex: none !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }

            #receipt-content {
              display: block !important;
              position: static !important;
              width: 100%;
              min-height: 280mm;
              max-height: none !important;
              margin: 0 auto !important;
              padding: 0 !important;
              overflow: visible !important;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .receipt-items thead {
              display: table-header-group;
            }

            .receipt-items tfoot {
              display: table-row-group;
            }

            .receipt-items tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .receipt-footer {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }

          .receipt-overlay {
            overflow-y: auto;
          }

          .receipt-modal {
            height: min(94vh, calc(100vh - 2rem));
            min-height: 0;
          }

          .receipt-preview {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            overscroll-behavior: contain;
            padding: 1rem;
          }

          .receipt-page {
            display: flex;
            flex-direction: column;
            min-height: 280mm;
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            color: var(--raees-text);
            background: var(--raees-white);
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11pt;
            line-height: 1.3;
          }

          .receipt-header {
            padding: 7mm 8mm 0;
            color: var(--raees-gold);
            background: var(--raees-ink);
            text-align: center;
          }

          .receipt-brand-row {
            display: grid;
            grid-template-columns: 24mm 1fr auto;
            align-items: center;
            gap: 3mm;
          }

          .receipt-mark {
            display: grid;
            width: 20mm;
            height: 16mm;
            place-items: center;
            border: 2px solid var(--raees-gold);
            font-size: 20pt;
            font-weight: 800;
          }

          .receipt-brand-row h1 {
            margin: 0;
            font-size: 26pt;
            font-weight: 800;
            line-height: 1;
            white-space: nowrap;
          }

          .receipt-company-type {
            align-self: end;
            padding-bottom: 1mm;
            font-size: 8pt;
            font-weight: 700;
            white-space: nowrap;
          }

          .receipt-registration {
            margin-top: 2mm;
            text-align: left;
            font-size: 10pt;
            font-weight: 700;
          }

          .receipt-tagline {
            margin: 1.5mm 0 0;
            font-size: 12pt;
            font-weight: 700;
          }

          .receipt-oil-change {
            margin-top: 0;
          }

          .receipt-proprietor {
            margin: 3mm -8mm 0;
            padding: 2mm 4mm;
            border-top: 1px solid var(--raees-gold);
            font-size: 12pt;
            font-weight: 700;
          }

          .receipt-customer {
            position: relative;
            display: grid;
            gap: 4mm;
            padding: 7mm 8mm 5mm;
          }

          .receipt-serial {
            display: flex;
            justify-content: flex-end;
            gap: 3mm;
            margin-top: -4mm;
            font-size: 11pt;
          }

          .receipt-field {
            display: flex;
            align-items: baseline;
            gap: 2mm;
            min-width: 0;
          }

          .receipt-field strong,
          .receipt-serial strong {
            flex: 0 0 auto;
            font-size: 10pt;
          }

          .receipt-field span {
            flex: 0 0 auto;
            min-width: 0;
          }

          .receipt-field i {
            flex: 1 1 auto;
            min-width: 12mm;
            height: 4mm;
            border-bottom: 1px solid var(--raees-line);
          }

          .receipt-vehicle-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8mm;
          }

          .receipt-items {
            width: 100%;
            flex: 1 0 145mm;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .receipt-col-number { width: 10%; }
          .receipt-col-description { width: 44%; }
          .receipt-col-quantity { width: 12%; }
          .receipt-col-rate { width: 16%; }
          .receipt-col-amount { width: 18%; }

          .receipt-items th,
          .receipt-items td {
            padding: 2.5mm 2mm;
            border: 1px solid var(--raees-line);
            overflow-wrap: anywhere;
          }

          .receipt-items thead th {
            height: 12mm;
            background: var(--raees-paper);
            font-size: 9pt;
            text-align: center;
          }

          .receipt-items tbody td {
            vertical-align: top;
          }

          .receipt-items tbody td small {
            display: block;
            margin-top: 1mm;
            color: var(--raees-bronze);
            font-size: 8pt;
          }

          .receipt-center { text-align: center; }
          .receipt-money { text-align: right; white-space: nowrap; }

          .receipt-items tfoot th,
          .receipt-items tfoot td {
            height: 12mm;
            font-size: 10pt;
          }

          .receipt-total-row th,
          .receipt-total-row td {
            font-weight: 800;
          }

          .receipt-footer {
            margin-top: 5mm;
          }

          .receipt-footer-main {
            display: flex;
            justify-content: space-between;
            align-items: end;
            min-height: 23mm;
            padding: 0 7mm 4mm;
          }

          .receipt-thanks {
            display: flex;
            flex-direction: column;
            gap: 1mm;
          }

          .receipt-thanks strong {
            color: var(--raees-bronze);
            font-family: Georgia, serif;
            font-size: 15pt;
            font-style: italic;
          }

          .receipt-signature {
            display: flex;
            width: 58mm;
            flex-direction: column;
            align-items: center;
            gap: 2mm;
            padding-bottom: 1mm;
            font-size: 9pt;
          }

          .receipt-signature span {
            width: 100%;
            height: 10mm;
            border-bottom: 1px solid var(--raees-line);
          }

          .receipt-address {
            padding: 4mm 5mm;
            color: var(--raees-gold-light);
            background: var(--raees-ink);
            font-size: 9pt;
            font-weight: 700;
            text-align: center;
          }

          .receipt-payment {
            display: flex;
            justify-content: flex-end;
            gap: 3mm;
            padding: 2mm 5mm 0;
            font-size: 9pt;
          }

          @media screen {
            .receipt-page {
              min-height: 280mm;
              border: 1px solid var(--raees-line);
              box-shadow: 0 4px 16px rgb(0 0 0 / 12%);
            }
          }
        `}
        </style>
    </div>
  );
}