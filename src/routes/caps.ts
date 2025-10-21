import { Router, Request, Response } from 'express';
import { CapModel } from '../models/Cap.js';
import { validateRequest, capSchemas } from '../middleware/validation.js';
import { ApiResponse, PaginatedResponse } from '../types/index.js';

const router = Router();

// Get all caps
router.get('/', async (req: Request, res: Response) => {
  try {
    const caps = await CapModel.findAll();
    
    const response: ApiResponse = {
      success: true,
      data: caps
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Get caps error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get caps'
    });
  }
});

// Get featured caps
router.get('/featured', async (req: Request, res: Response) => {
  try {
    const caps = await CapModel.findFeatured();
    
    const response: ApiResponse = {
      success: true,
      data: caps
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Get featured caps error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get featured caps'
    });
  }
});

// Get caps by category
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category parameter is required'
      });
    }
    const caps = await CapModel.findByCategory(category);
    
    const response: ApiResponse = {
      success: true,
      data: caps
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Get caps by category error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get caps by category'
    });
  }
});

// Get cap by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID parameter is required'
      });
    }
    const capId = parseInt(id);

    if (isNaN(capId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cap ID'
      });
    }

    const cap = await CapModel.findById(capId);
    if (!cap) {
      return res.status(404).json({
        success: false,
        error: 'Cap not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: cap
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Get cap error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get cap'
    });
  }
});

// Create cap (admin only - you might want to add admin authentication)
router.post('/', validateRequest(capSchemas.create), async (req: Request, res: Response) => {
  try {
    const cap = await CapModel.create(req.body);
    
    const response: ApiResponse = {
      success: true,
      data: cap,
      message: 'Cap created successfully'
    };

    return res.status(201).json(response);
  } catch (error: any) {
    console.error('Create cap error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create cap'
    });
  }
});

// Update cap (admin only)
router.put('/:id', validateRequest(capSchemas.update), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID parameter is required'
      });
    }
    const capId = parseInt(id);

    if (isNaN(capId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cap ID'
      });
    }

    const cap = await CapModel.update(capId, req.body);
    if (!cap) {
      return res.status(404).json({
        success: false,
        error: 'Cap not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: cap,
      message: 'Cap updated successfully'
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Update cap error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update cap'
    });
  }
});

// Update cap stock (admin only)
router.put('/:id/stock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID parameter is required'
      });
    }
    const { quantity } = req.body;
    const capId = parseInt(id);

    if (isNaN(capId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cap ID'
      });
    }

    if (typeof quantity !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a number'
      });
    }

    const success = await CapModel.updateStock(capId, quantity);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Cap not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Stock updated successfully'
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Update stock error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update stock'
    });
  }
});

// Delete cap (admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID parameter is required'
      });
    }
    const capId = parseInt(id);

    if (isNaN(capId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cap ID'
      });
    }

    const success = await CapModel.delete(capId);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Cap not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Cap deleted successfully'
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Delete cap error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete cap'
    });
  }
});

export default router;
