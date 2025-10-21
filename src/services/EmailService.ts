import { Resend } from 'resend';
import { config } from '../config/index.js';
import { InvoiceEmailData, EmailResponse } from '../types/index.js';

export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(config.resend.apiKey);
  }

  async sendEmail(data: { from: string; to: string[]; subject: string; html: string }): Promise<EmailResponse> {
    try {
      if (!config.resend.apiKey) {
        throw new Error('Resend API key not configured');
      }

      const result = await this.resend.emails.send(data);

      return {
        success: true,
        messageId: result.data?.id || 'unknown'
      };
    } catch (error: any) {
      console.error('❌ Email sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  async sendInvoiceEmail(data: InvoiceEmailData): Promise<EmailResponse> {
    try {
      console.log('📧 Sending invoice email to:', data.customerEmail);

      if (!config.resend.apiKey) {
        throw new Error('Resend API key not configured');
      }

      const emailHtml = this.generateInvoiceEmailHtml(data);

      const result = await this.resend.emails.send({
        from: 'Sleven <noreply@sleven.sa>',
        to: [data.customerEmail],
        subject: `فاتورة طلبك #${data.orderId.substring(0, 8)} - Sleven`,
        html: emailHtml,
      });

      console.log('✅ Email sent successfully! Message ID:', result.data?.id);
      
      return {
        success: true,
        messageId: result.data?.id || 'sent'
      };

    } catch (error: any) {
      console.error('❌ Email sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  private generateInvoiceEmailHtml(data: InvoiceEmailData): string {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاتورة طلبك - Sleven</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            direction: rtl;
            text-align: right;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4F9860;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4F9860;
            margin-bottom: 10px;
        }
        .invoice-title {
            font-size: 24px;
            color: #333;
            margin: 0;
        }
        .order-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            direction: rtl;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: bold;
            color: #4F9860;
            text-align: right;
            min-width: 120px;
        }
        .info-value {
            text-align: right;
            flex: 1;
            margin-right: 10px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th,
        .items-table td {
            padding: 12px;
            text-align: right;
            border-bottom: 1px solid #ddd;
        }
        .items-table th {
            background-color: #4F9860;
            color: white;
            font-weight: bold;
        }
        .items-table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .total-section {
            background-color: #4F9860;
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .total-amount {
            font-size: 24px;
            font-weight: bold;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }
        .thank-you {
            font-size: 18px;
            color: #4F9860;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SLEVEN</div>
            <h1 class="invoice-title">فاتورة طلبك</h1>
        </div>

        <div class="order-info">
            <div class="info-row">
                <span class="info-label">اسم العميل:</span>
                <span class="info-value">${data.customerName}</span>
            </div>
            <div class="info-row">
                <span class="info-label">رقم الطلب:</span>
                <span class="info-value">#${data.orderId.substring(0, 8)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">تاريخ الطلب:</span>
                <span class="info-value">${new Date(data.orderDate).toLocaleDateString('ar-SA')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">عنوان الشحن:</span>
                <span class="info-value">${data.shippingAddress}</span>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>المجموع</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map(item => `
                    <tr>
                        <td>${item.name_ar}</td>
                        <td>${item.quantity}</td>
                        <td>${item.price.toFixed(2)} ${data.currency}</td>
                        <td>${item.total.toFixed(2)} ${data.currency}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="total-section">
            <div>المجموع الفرعي: ${data.subtotal.toFixed(2)} ${data.currency}</div>
            <div>الشحن: ${data.shipping.toFixed(2)} ${data.currency}</div>
            <div>الضريبة: ${data.tax.toFixed(2)} ${data.currency}</div>
            <div class="total-amount">المجموع الكلي: ${data.total.toFixed(2)} ${data.currency}</div>
        </div>

        <div class="footer">
            <div class="thank-you">شكراً لاختيارك Sleven! 🎉</div>
            <p>سيتم شحن طلبك خلال 5-15 يوم عمل</p>
            <p>للاستفسارات، يرجى التواصل معنا على: support@sleven.sa</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
                © 2024 Sleven. جميع الحقوق محفوظة.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
