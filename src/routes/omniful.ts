import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import { OmnifulService } from '../services/OmnifulService.js';
import { ApiResponse } from '../types/index.js';

const router = Router();
const omnifulService = new OmnifulService();

// Process Omniful queue
router.get('/process-queue', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get pending queue items
      const query = `
        SELECT id, order_id, status, payload, attempts, max_attempts, error_message
        FROM omniful_queue
        WHERE status = 'pending'
        AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT 10
      `;
      
      const result = await client.query(query);
      const queueItems = result.rows;
      
      if (queueItems.length === 0) {
        return res.json({
          success: true,
          message: 'No pending queue items to process',
          processed: 0,
          failed: 0
        });
      }

      let processed = 0;
      let failed = 0;

      // Process each queue item
      for (const item of queueItems) {
        try {
          // Mark as processing
          await client.query(
            'UPDATE omniful_queue SET status = $1, attempts = $2, updated_at = NOW() WHERE id = $3',
            ['processing', item.attempts + 1, item.id]
          );

          // Process with Omniful
          const result = await omnifulService.processQueueItem(item.payload);
          
          if (result.success) {
            // Mark as completed
            await client.query(
              'UPDATE omniful_queue SET status = $1, updated_at = NOW() WHERE id = $2',
              ['completed', item.id]
            );
            processed++;
          } else {
            // Mark as failed
            await client.query(
              'UPDATE omniful_queue SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3',
              ['failed', result.error || 'Unknown error', item.id]
            );
            failed++;
          }
        } catch (error: any) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          
          // Mark as failed
          await client.query(
            'UPDATE omniful_queue SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3',
            ['failed', error.message, item.id]
          );
          failed++;
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          processed,
          failed,
          total: queueItems.length
        },
        message: `Processed ${processed} items, ${failed} failed`
      };

      return res.json(response);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Process queue error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process queue'
    });
  }
});

// Process specific order
router.post('/process-order', async (req: Request, res: Response) => {
  try {
    const { order_id } = req.body;
    
    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id is required'
      });
    }

    const client = await pool.connect();
    
    try {
      // Get order data
      const orderQuery = 'SELECT * FROM orders WHERE id = $1';
      const orderResult = await client.query(orderQuery, [order_id]);
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Order ${order_id} not found`
        });
      }

      const orderData = orderResult.rows[0];
      
      // Process with Omniful
      const result = await omnifulService.processQueueItem(orderData);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to process order'
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'Order processed successfully',
        data: {
          order_id: order_id
        }
      };

      return res.json(response);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Process order error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process order'
    });
  }
});

// Get queue status
router.get('/queue-status', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM omniful_queue
      `;
      
      const result = await client.query(query);
      const stats = result.rows[0];
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };

      res.json(response);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get queue status'
    });
  }
});

// Retry failed items
router.post('/retry-failed', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    
    try {
      // Reset failed items to pending
      const query = `
        UPDATE omniful_queue 
        SET status = 'pending', attempts = 0, error_message = NULL, updated_at = NOW()
        WHERE status = 'failed'
        AND attempts < max_attempts
      `;
      
      const result = await client.query(query);
      
      const response: ApiResponse = {
        success: true,
        data: {
          retried: result.rowCount
        },
        message: `Retried ${result.rowCount} failed items`
      };

      res.json(response);
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Retry failed items error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry failed items'
    });
  }
});

// Get inventory status
router.get('/inventory/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID parameter is required'
      });
    }
    
    const result = await omnifulService.getInventoryStatus(productId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to get inventory status'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: result.data
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Get inventory status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get inventory status'
    });
  }
});

// Sync product with Omniful
router.post('/sync-product', async (req: Request, res: Response) => {
  try {
    const productData = req.body;
    
    const result = await omnifulService.syncProduct(productData);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to sync product'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Product synced successfully'
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Sync product error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync product'
    });
  }
});

export default router;
