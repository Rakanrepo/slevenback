import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt.js';
import { UserModel } from '../models/User.js';
import { validateRequest, authSchemas } from './validation.js';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        full_name?: string;
        phone?: string;
        is_verified: boolean;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const payload = JWTUtils.verifyToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Fetch user details from database
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      ...(user.full_name && { full_name: user.full_name }),
      ...(user.phone && { phone: user.phone }),
      is_verified: user.is_verified
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = JWTUtils.verifyToken(token);
      if (payload) {
        const user = await UserModel.findById(payload.userId);
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            ...(user.full_name && { full_name: user.full_name }),
            ...(user.phone && { phone: user.phone }),
            is_verified: user.is_verified
          };
        }
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue without authentication
  }
};

// Re-export validation functions
export { validateRequest, authSchemas };
