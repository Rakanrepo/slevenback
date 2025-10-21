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

    const order = await OrderModel.create(orderData);
    
    const response: ApiResponse = {
      success: true,
      data: order,
      message: 'Order created successfully'
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({
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

    res.json(response);
  } catch (error: any) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get orders'
    });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

    res.json(response);
  } catch (error: any) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get order'
    });
  }
});

// Update order
router.put('/:id', authenticateToken, validateRequest(orderSchemas.update), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

    const updatedOrder = await OrderModel.update(id, req.body);
    
    const response: ApiResponse = {
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Update order error:', error);
    res.status(500).json({
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

    res.json(response);
  } catch (error: any) {
    console.error('Get pending Pay on Arrival order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get pending order'
    });
  }
});

// Delete order
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

    res.json(response);
  } catch (error: any) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete order'
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

    res.json(response);
  } catch (error: any) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get order statistics'
    });
  }
});

export default router;
