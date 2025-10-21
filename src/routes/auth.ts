import { Router, Request, Response } from 'express';
import { UserModel } from '../models/User.js';
import { JWTUtils } from '../utils/jwt.js';
import { authenticateToken, validateRequest, authSchemas } from '../middleware/auth.js';
import { ApiResponse, RegisterData, LoginCredentials } from '../types/index.js';

const router = Router();

// Register endpoint (optional registration)
router.post('/register', validateRequest(authSchemas.register), async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, phone }: RegisterData = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create user
    const user = await UserModel.create({ email, password, full_name, phone });
    
    // Generate JWT token
    const token = JWTUtils.generateToken({
      userId: user.id,
      email: user.email
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          is_verified: user.is_verified
        },
        token
      },
      message: 'Registration successful'
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
});

// Login endpoint
router.post('/login', validateRequest(authSchemas.login), async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginCredentials = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = JWTUtils.generateToken({
      userId: user.id,
      email: user.email
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          is_verified: user.is_verified
        },
        token
      },
      message: 'Login successful'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        is_verified: user.is_verified
      }
    };

    res.json(response);
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get profile'
    });
  }
});

// Update user profile
router.put('/me', authenticateToken, validateRequest(authSchemas.updateProfile), async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const user = await UserModel.update(req.user!.id, updates);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        is_verified: user.is_verified
      },
      message: 'Profile updated successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, validateRequest(authSchemas.changePassword), async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const user = await UserModel.findByEmail(req.user!.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const isValidPassword = await UserModel.verifyPassword(user, currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    const success = await UserModel.updatePassword(user.id, newPassword);
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update password'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Password updated successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to change password'
    });
  }
});

// Delete account
router.delete('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const success = await UserModel.delete(req.user!.id);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Account deleted successfully'
    };

    res.json(response);
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete account'
    });
  }
});

export default router;
