import { Router, Request, Response } from 'express';
import { EmailService } from '../services/EmailService.js';
import { ApiResponse } from '../types/index.js';

const router = Router();

// Send invoice email
router.post('/send-invoice', async (req: Request, res: Response) => {
  try {
    console.log('📧 Received email request:', JSON.stringify(req.body, null, 2));
    
    const { 
      customerName, 
      customerEmail, 
      orderId, 
      orderDate, 
      items, 
      subtotal, 
      shipping, 
      tax, 
      total, 
      shippingAddress, 
      currency 
    } = req.body;

    if (!orderId || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and customer email are required'
      });
    }

    const emailData = {
      customerName: customerName || 'عميل',
      customerEmail,
      orderId,
      orderDate: orderDate || new Date().toISOString(),
      items: items || [],
      subtotal: subtotal || 0,
      shipping: shipping || 0,
      tax: tax || 0,
      total: total || 0,
      shippingAddress: shippingAddress || 'لم يتم تحديد العنوان',
      currency: currency || 'SAR'
    };

    console.log('📧 Sending email with data:', emailData);
    const emailService = new EmailService();
    const result = await emailService.sendInvoiceEmail(emailData);

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        message: 'Invoice email sent successfully',
        messageId: result.messageId
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: result.error || 'Failed to send email'
      };
      res.status(500).json(response);
    }
  } catch (error: any) {
    console.error('❌ Email route error:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
