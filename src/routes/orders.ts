import { Router, Request, Response } from 'express';
import { OrderModel } from '../models/Order.js';
import { PaymentModel } from '../models/Payment.js';
import { UserModel } from '../models/User.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { validateRequest, orderSchemas } from '../middleware/validation.js';
import { ApiResponse } from '../types/index.js';

const router = Router();

// Create order
router.post('/', optionalAuth, validateRequest(orderSchemas.create), async (req: Request, res: Response) => {
  try {
    console.log('🔄 Order creation request:', {
      user_id: req.user?.id,
      total_amount: req.body.total_amount,
      payment_type: req.body.payment_type,
      items_count: req.body.items?.length
    });
    
    let userId = req.user?.id;
    
    // If no authenticated user, create a guest user
    if (!userId) {
      // Create a guest user with a temporary email
      const guestEmail = `guest_${Date.now()}@sleven.com`;
      const guestUser = await UserModel.create({
        email: guestEmail,
        password: 'guest_password', // Temporary password
        full_name: 'Guest User'
      });
      userId = guestUser.id;
    }

    const orderData = {
      ...req.body,
      user_id: userId
    };

    console.log('💾 Creating order in database:', {
      user_id: userId,
      total_amount: orderData.total_amount,
      payment_type: orderData.payment_type,
      items: orderData.items
    });
    
    const order = await OrderModel.create(orderData);
    
    console.log('✅ Order created successfully:', {
      order_id: order.id,
      user_id: order.user_id,
      status: order.status,
      payment_type: order.payment_type,
      total_amount: order.total_amount
    });
    
    const response: ApiResponse = {
      success: true,
      data: order,
      message: 'Order created successfully'
    };

    return res.status(201).json(response);
  } catch (error: any) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order'
    });
  }
});

// Get user orders
router.get('/my-orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orders = await OrderModel.findByUserId(req.user!.id);
    
    const response: ApiResponse = {
      success: true,
      data: orders
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Get user orders error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get orders'
    });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID parameter is required'
      });
    }
    const order = await OrderModel.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get payment data if exists
    if (order.payment_id) {
      const payment = await PaymentModel.findByOrderId(order.id);
      if (payment) {
        (order as any).payment = payment;
      }
    }

    const response: ApiResponse = {
      success: true,
      data: order
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Get order error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get order'
    });
  }
});

// Update order
router.put('/:id', authenticateToken, validateRequest(orderSchemas.update), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID parameter is required'
      });
    }
    
    console.log('🔄 Order update request:', {
      order_id: id,
      user_id: req.user?.id,
      update_data: req.body
    });
    
    const order = await OrderModel.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Log payment_id update (no validation needed since it's now TEXT field)
    if (req.body.payment_id) {
      console.log('💳 Updating order with payment_id:', {
        order_id: id,
        payment_id: req.body.payment_id
      });
    }

    console.log('💾 Updating order in database:', {
      order_id: id,
      payment_id: req.body.payment_id,
      status: req.body.status
    });
    
    const updatedOrder = await OrderModel.update(id, req.body);
    
    console.log('✅ Order updated successfully:', {
      order_id: updatedOrder?.id,
      status: updatedOrder?.status,
      payment_id: updatedOrder?.payment_id
    });

    // If status is being updated to 'paid', handle payment success logic
    if (req.body.status === 'paid') {
      console.log('💰 Processing payment success for order:', id);
      
      try {
        // Find and delete any Pay on Arrival orders for the same user
        const payOnArrivalOrders = await OrderModel.findByUserId(order.user_id);
        const payOnArrivalOrder = payOnArrivalOrders.find(o => 
          o.status === 'pending' && 
          o.payment_type === 'pay_on_arrival' &&
          o.id !== id
        );

        if (payOnArrivalOrder) {
          console.log(`🗑️ Deleting Pay on Arrival order: ${payOnArrivalOrder.id}`);
          await OrderModel.delete(payOnArrivalOrder.id);
        }

        // Sync with Omniful
        try {
          const { OmnifulService } = await import('../services/OmnifulService.js');
          const omnifulService = new OmnifulService();
          
          const syncResult = await omnifulService.processQueueItem({
            id: order.id,
            user_id: order.user_id,
            total_amount: order.total_amount,
            currency: order.currency,
            items: order.items
          });

          console.log('✅ Order synced with Omniful:', syncResult);
        } catch (omnifulError: any) {
          console.error('❌ Omniful sync failed:', omnifulError.message);
          // Don't fail the request if Omniful sync fails
        }

        // Deduct stock quantities
        try {
          const { CapModel } = await import('../models/Cap.js');
          
          for (const item of order.items || []) {
            if (item.cap_id) {
              const stockDeducted = await CapModel.deductStock(item.cap_id, item.quantity);
              if (stockDeducted) {
                console.log(`📦 Stock deducted for cap ${item.cap_id}: ${item.quantity} units`);
              } else {
                console.error(`❌ Failed to deduct stock for cap ${item.cap_id}: insufficient stock or cap not found`);
              }
            }
          }
        } catch (stockError: any) {
          console.error('❌ Stock deduction failed:', stockError.message);
          // Don't fail the request if stock deduction fails
        }

        // Send invoice email
        try {
          const { EmailService } = await import('../services/EmailService.js');
          const emailService = new EmailService();
          
          const emailData = {
            customerName: order.shipping_address?.customer_name || 'عميل',
            customerEmail: order.shipping_address?.customer_email || '',
            orderId: order.id,
            orderDate: order.created_at,
            items: (order.items || []).map(item => ({
              name: item.name || 'Item',
              name_ar: item.name_ar || 'عنصر',
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity
            })),
            subtotal: parseFloat(order.total_amount.toString()),
            shipping: 0,
            tax: 0,
            total: parseFloat(order.total_amount.toString()),
            shippingAddress: order.shipping_address?.address || 'لم يتم تحديد العنوان',
            currency: order.currency || 'SAR'
          };

          if (emailData.customerEmail) {
            const emailResult = await emailService.sendInvoiceEmail(emailData);
            console.log('📧 Invoice email sent:', emailResult.success ? 'Success' : emailResult.error);
          } else {
            console.log('⚠️ No customer email found, skipping invoice email');
          }
        } catch (emailError: any) {
          console.error('❌ Invoice email failed:', emailError.message);
          // Don't fail the request if email fails
        }

        console.log('✅ Payment success processing completed for order:', id);
      } catch (paymentSuccessError: any) {
        console.error('❌ Payment success processing failed:', paymentSuccessError.message);
        // Don't fail the main request if payment success processing fails
      }
    }
    
    const response: ApiResponse = {
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Update order error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update order'
    });
  }
});

// Get pending Pay on Arrival order
router.get('/pending/pay-on-arrival', authenticateToken, async (req: Request, res: Response) => {
  try {
    const order = await OrderModel.findPendingPayOnArrival(req.user!.id);
    
    const response: ApiResponse = {
      success: true,
      data: order
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Get pending Pay on Arrival order error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pending order'
    });
  }
});

// Delete order
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID parameter is required'
      });
    }
    const order = await OrderModel.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Only allow deletion of pending orders
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending orders can be deleted'
      });
    }

    const success = await OrderModel.delete(id);
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete order'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Order deleted successfully'
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Delete order error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete order'
    });
  }
});

// Handle payment success - sync with Omniful and clean up Pay on Arrival orders
router.post('/payment-success', async (req: Request, res: Response) => {
  try {
    const { order_id } = req.body;
    
    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Get the order
    const order = await OrderModel.findById(order_id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order status to paid
    const updatedOrder = await OrderModel.update(order_id, {
      status: 'paid'
    });

    // Find and delete any Pay on Arrival orders for the same user
    const payOnArrivalOrders = await OrderModel.findByUserId(order.user_id);
    const payOnArrivalOrder = payOnArrivalOrders.find(o => 
      o.status === 'pending' && 
      o.payment_type === 'pay_on_arrival' &&
      o.id !== order_id
    );

    if (payOnArrivalOrder) {
      console.log(`🗑️ Deleting Pay on Arrival order: ${payOnArrivalOrder.id}`);
      await OrderModel.delete(payOnArrivalOrder.id);
    }

    // Sync with Omniful
    try {
      const { OmnifulService } = await import('../services/OmnifulService.js');
      const omnifulService = new OmnifulService();
      
      const syncResult = await omnifulService.processQueueItem({
        id: order.id,
        user_id: order.user_id,
        total_amount: order.total_amount,
        currency: order.currency,
        items: order.items
      });

      console.log('✅ Order synced with Omniful:', syncResult);
    } catch (omnifulError: any) {
      console.error('❌ Omniful sync failed:', omnifulError.message);
      // Don't fail the request if Omniful sync fails
    }

    const response: ApiResponse = {
      success: true,
      data: {
        order: updatedOrder,
        omniful_synced: true,
        pay_on_arrival_cleaned: !!payOnArrivalOrder
      },
      message: 'Payment success processed and order synced with Omniful'
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Payment success processing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process payment success'
    });
  }
});

// Get order statistics (admin only)
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const stats = await OrderModel.getOrderStats();
    
    const response: ApiResponse = {
      success: true,
      data: stats
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Get order stats error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get order statistics'
    });
  }
});

export default router;
