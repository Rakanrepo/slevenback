import { Router, Request, Response } from 'express';
import { PaymentModel } from '../models/Payment.js';
import { OrderModel } from '../models/Order.js';
import { MoyasarService } from '../services/MoyasarService.js';
import { EmailService } from '../services/EmailService.js';
import { validateRequest, paymentSchemas } from '../middleware/validation.js';
import { ApiResponse } from '../types/index.js';

const router = Router();
const moyasarService = new MoyasarService();
const emailService = new EmailService();

// Create payment
router.post('/create', validateRequest(paymentSchemas.create), async (req: Request, res: Response) => {
  try {
    const paymentData = req.body;
    
    // Create payment with Moyasar
    const moyasarResult = await moyasarService.createPayment(paymentData);
    
    if (!moyasarResult.success) {
      return res.status(400).json({
        success: false,
        error: moyasarResult.error || 'Payment creation failed'
      });
    }

    // Store payment in database (same as Supabase function)
    const payment = await PaymentModel.create({
      order_id: paymentData.order_id || 'temp', // You might need to pass order_id
      moyasar_payment_id: moyasarResult.payment!.id,
      amount: moyasarResult.payment!.amount,
      currency: moyasarResult.payment!.currency,
      status: moyasarResult.payment!.status,
      payment_method: paymentData.payment_method,
      metadata: {
        ...paymentData.metadata,
        moyasar_payment: moyasarResult.payment,
        customer_info: {
          name: paymentData.customer_name,
          email: paymentData.customer_email,
          phone: paymentData.customer_phone
        }
      }
    });

    const response: ApiResponse = {
      success: true,
      data: {
        payment: moyasarResult.payment,
        database_payment: payment
      },
      message: 'Payment created successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment creation failed'
    });
  }
});

// Validate Apple Pay merchant
router.post('/applepay/validate', async (req: Request, res: Response) => {
  try {
    const { validation_url } = req.body;
    
    if (!validation_url) {
      return res.status(400).json({
        success: false,
        error: 'Validation URL is required'
      });
    }

    const result = await moyasarService.validateApplePayMerchant(validation_url);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Merchant validation failed'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: result.merchantSession,
      message: 'Merchant validation successful'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Apple Pay validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Merchant validation failed'
    });
  }
});

// Get payment status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get payment from database first
    const payment = await PaymentModel.findByMoyasarId(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Get latest status from Moyasar
    const moyasarResult = await moyasarService.getPaymentStatus(id);
    
    if (!moyasarResult.success) {
      return res.status(400).json({
        success: false,
        error: moyasarResult.error || 'Failed to get payment status'
      });
    }

    // Update payment status in database if changed
    if (moyasarResult.payment && moyasarResult.payment.status !== payment.status) {
      await PaymentModel.update(payment.id, {
        status: moyasarResult.payment.status
      });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        payment: moyasarResult.payment,
        database_payment: payment
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment status'
    });
  }
});

// Moyasar webhook
router.post('/webhook/moyasar', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-moyasar-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    // Verify webhook signature
    const isValidSignature = await moyasarService.verifyWebhookSignature(payload, signature);
    if (!isValidSignature) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    const webhookData = req.body;
    console.log('Processing Moyasar webhook:', webhookData.id, webhookData.status);

    // Find payment in database
    const payment = await PaymentModel.findByMoyasarId(webhookData.id);
    if (!payment) {
      console.warn('Payment not found in database:', webhookData.id);
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    // Update payment status
    await PaymentModel.update(payment.id, {
      status: webhookData.status,
      metadata: {
        ...payment.metadata,
        webhook_data: webhookData
      }
    });

    // Update order status based on payment status
    if (webhookData.status === 'paid') {
      await OrderModel.update(payment.order_id, {
        status: 'paid',
        payment_id: payment.id
      });

      // Send invoice email
      try {
        const order = await OrderModel.findById(payment.order_id);
        if (order && order.shipping_address) {
          const emailData = {
            customerName: order.shipping_address.name || 'Customer',
            customerEmail: order.shipping_address.email || 'customer@example.com',
            orderId: order.id,
            orderDate: order.created_at,
            items: order.items.map((item: any) => ({
              name: item.name,
              name_ar: item.name_ar,
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity
            })),
            subtotal: order.total_amount,
            shipping: 0,
            tax: 0,
            total: order.total_amount,
            shippingAddress: order.shipping_address.address || 'N/A',
            currency: order.currency
          };

          await emailService.sendInvoiceEmail(emailData);
        }
      } catch (emailError) {
        console.error('Failed to send invoice email:', emailError);
        // Don't fail the webhook if email fails
      }
    } else if (webhookData.status === 'failed' || webhookData.status === 'cancelled') {
      await OrderModel.update(payment.order_id, {
        status: 'failed'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Webhook processed successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed'
    });
  }
});

// Get payment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await PaymentModel.findById(id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: payment
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment'
    });
  }
});

// Get payment statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const stats = await PaymentModel.getPaymentStats();
    
    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment statistics'
    });
  }
});

export default router;
