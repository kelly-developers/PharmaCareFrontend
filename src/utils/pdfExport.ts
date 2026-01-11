// utils/pdfExport.ts
// PDF export utility using browser print
export function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  const styles = Array.from(document.styleSheets)
    .map((styleSheet) => {
      try {
        return Array.from(styleSheet.cssRules)
          .map((rule) => rule.cssText)
          .join('');
      } catch (e) {
        return '';
      }
    })
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          ${styles}
          @media print {
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
              padding: 20px;
            }
            .no-print { display: none !important; }
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: white;
            color: black;
            padding: 20px;
          }
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
          }
          .print-header h1 {
            font-size: 24px;
            margin: 0;
          }
          .print-header p {
            color: #666;
            margin: 5px 0 0;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>Pharmacy Management System</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

export function exportTableToPDF(title: string, headers: string[], rows: string[][], filename: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  const tableRows = rows.map(row => 
    `<tr>${row.map(cell => `<td style="padding: 8px; border: 1px solid #ddd;">${cell}</td>`).join('')}</tr>`
  ).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background: #0066cc;
            color: white;
            padding: 10px 8px;
            border: 1px solid #ddd;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `);

  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// Purchase Order PDF Types and Generator
export interface PharmacyInfo {
  name: string;
  licenseNo: string;
  phone: string;
  email: string;
  address: string;
}

export interface SupplierInfo {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
}

export interface OrderItem {
  medicineName: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQty: number;
  orderQty: number;
  costPrice: number;
  totalPrice: number;
}

export interface PurchaseOrderPDFData {
  orderNumber: string;
  orderDate: string;
  pharmacy: PharmacyInfo;
  supplier: SupplierInfo;
  items: OrderItem[];
  totalAmount: number;
}

export const generatePurchaseOrderPDF = (data: PurchaseOrderPDFData): void => {
  const {
    orderNumber,
    orderDate,
    pharmacy,
    supplier,
    items,
    totalAmount,
  } = data;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this website to generate PDF');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Order - ${orderNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 40px;
          color: #333;
          background: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #0066cc;
        }
        .pharmacy-info {
          flex: 1;
        }
        .pharmacy-info h1 {
          color: #0066cc;
          font-size: 24px;
          margin-bottom: 5px;
        }
        .pharmacy-info p {
          font-size: 12px;
          color: #666;
          margin: 2px 0;
        }
        .order-info {
          text-align: right;
        }
        .order-info h2 {
          color: #333;
          font-size: 20px;
          margin-bottom: 8px;
        }
        .order-info p {
          font-size: 12px;
          color: #666;
          margin: 2px 0;
        }
        .order-number {
          font-size: 14px;
          font-weight: bold;
          color: #0066cc;
        }
        .parties {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          gap: 20px;
        }
        .party-box {
          width: 48%;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 1px solid #e9ecef;
        }
        .party-box h3 {
          color: #0066cc;
          font-size: 13px;
          text-transform: uppercase;
          margin-bottom: 10px;
          letter-spacing: 0.5px;
        }
        .party-box p {
          font-size: 12px;
          margin: 4px 0;
          color: #444;
        }
        .party-box .name {
          font-size: 14px;
          font-weight: bold;
          color: #333;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        .items-table th {
          background: #f8f9fa !important;
          color: #0066cc !important;
          padding: 12px 15px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          border: none;
          border-bottom: 2px solid #0066cc;
        }
        .items-table th:last-child {
          text-align: right;
        }
        .items-table td {
          padding: 12px 15px;
          border-bottom: 1px solid #e9ecef;
          font-size: 12px;
          border-left: none;
          border-right: none;
        }
        .items-table td:last-child {
          text-align: right;
        }
        .items-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        .items-table tr:hover {
          background: #f1f5f9;
        }
        .summary {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 40px;
        }
        .summary-box {
          width: 250px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
          border: 2px solid #0066cc;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .summary-row.total {
          padding-top: 8px;
          border-top: 2px solid #0066cc;
          margin-top: 8px;
          margin-bottom: 0;
          font-size: 16px;
          font-weight: bold;
          color: #0066cc;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
        }
        .signature-box {
          width: 45%;
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-top: 50px;
          padding-top: 8px;
          font-size: 12px;
          color: #666;
        }
        .notes {
          margin-top: 25px;
          padding: 12px;
          background: #fff3cd;
          border-radius: 6px;
          font-size: 12px;
          color: #856404;
        }
        .notes h4 {
          margin-bottom: 6px;
          font-size: 13px;
        }
        .notes ul {
          margin-left: 15px;
          padding-left: 0;
        }
        .notes li {
          margin-bottom: 3px;
        }
        @media print {
          body {
            padding: 15px;
          }
          .no-print {
            display: none;
          }
          .items-table th {
            background: #f8f9fa !important;
            color: #0066cc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media screen {
          .items-table th {
            background: #f8f9fa !important;
            color: #0066cc !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="pharmacy-info">
          <h1>${pharmacy.name}</h1>
          <p><strong>License:</strong> ${pharmacy.licenseNo}</p>
          <p><strong>Tel:</strong> ${pharmacy.phone}</p>
          <p><strong>Email:</strong> ${pharmacy.email}</p>
          <p>${pharmacy.address}</p>
        </div>
        <div class="order-info">
          <h2>PURCHASE ORDER</h2>
          <p class="order-number">${orderNumber}</p>
          <p><strong>Date:</strong> ${orderDate}</p>
        </div>
      </div>

      <div class="parties">
        <div class="party-box">
          <h3>Supplier Information</h3>
          <p class="name">${supplier.name}</p>
          ${supplier.contactPerson ? `<p><strong>Contact:</strong> ${supplier.contactPerson}</p>` : ''}
          ${supplier.address ? `<p>${supplier.address}</p>` : ''}
          ${supplier.city ? `<p>${supplier.city}</p>` : ''}
          ${supplier.phone ? `<p><strong>Tel:</strong> ${supplier.phone}</p>` : ''}
          ${supplier.email ? `<p><strong>Email:</strong> ${supplier.email}</p>` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Medicine/Item</th>
            <th>Order Quantity</th>
            <th>Total Amount (KSh)</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.medicineName}</td>
              <td>${item.orderQty.toLocaleString()}</td>
              <td>${item.totalPrice.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-box">
          <div class="summary-row">
            <span>Total Items:</span>
            <span>${items.length}</span>
          </div>
          <div class="summary-row">
            <span>Total Quantity:</span>
            <span>${items.reduce((sum, item) => sum + item.orderQty, 0).toLocaleString()}</span>
          </div>
          <div class="summary-row total">
            <span>Grand Total:</span>
            <span>KSh ${totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="notes">
        <h4>Terms & Conditions:</h4>
        <ul>
          <li>Please confirm order receipt and expected delivery date.</li>
          <li>All items must meet quality and regulatory standards.</li>
          <li>Payment terms: As per agreement.</li>
        </ul>
      </div>

      <div class="footer">
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">Authorized by (Pharmacy)</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Received by (Supplier)</div>
          </div>
        </div>
      </div>

      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 25px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
          Print / Save as PDF
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};