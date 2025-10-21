import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0]?.message || 'Validation error'
      });
    }
    
    next();
  };
};

// Validation schemas
export const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().optional(),
    phone: Joi.string().optional()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  updateProfile: Joi.object({
    full_name: Joi.string().optional(),
    phone: Joi.string().optional()
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  })
};

export const orderSchemas = {
  create: Joi.object({
    total_amount: Joi.number().positive().required(),
    currency: Joi.string().default('SAR'),
    shipping_address: Joi.object().optional(),
    items: Joi.array().items(
      Joi.object({
        cap_id: Joi.number().required(),
        quantity: Joi.number().positive().required(),
        price: Joi.number().positive().required(),
        name: Joi.string().required(),
        name_ar: Joi.string().required(),
        image_url: Joi.string().optional(),
        payment_type: Joi.string().optional()
      })
    ).min(1).required(),
    payment_type: Joi.string().default('online')
  }),
  
  update: Joi.object({
    status: Joi.string().valid('pending', 'paid', 'processing', 'failed', 'cancelled', 'completed').optional(),
    payment_id: Joi.string().uuid().optional(),
    payment_type: Joi.string().optional()
  })
};

export const paymentSchemas = {
  create: Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().default('SAR'),
    description: Joi.string().required(),
    customer_name: Joi.string().required(),
    customer_email: Joi.string().email().required(),
    customer_phone: Joi.string().optional(),
    shipping_address: Joi.string().optional(),
    quantity: Joi.number().positive().optional(),
    payment_method: Joi.string().valid('card', 'applepay').required(),
    card_data: Joi.object({
      number: Joi.string().required(),
      name: Joi.string().required(),
      month: Joi.string().required(),
      year: Joi.string().required(),
      cvc: Joi.string().required()
    }).when('payment_method', { is: 'card', then: Joi.required() }),
    apple_pay_token: Joi.string().when('payment_method', { is: 'applepay', then: Joi.required() }),
    metadata: Joi.object().optional()
  }),
  
  webhook: Joi.object({
    id: Joi.string().required(),
    status: Joi.string().valid('paid', 'failed', 'initiated', 'cancelled').required(),
    amount: Joi.number().required(),
    currency: Joi.string().required(),
    description: Joi.string().required(),
    source: Joi.object().optional(),
    metadata: Joi.object().optional(),
    created_at: Joi.string().required(),
    updated_at: Joi.string().required()
  })
};

export const capSchemas = {
  create: Joi.object({
    name: Joi.string().required(),
    name_ar: Joi.string().required(),
    description: Joi.string().required(),
    description_ar: Joi.string().required(),
    price: Joi.number().positive().required(),
    image_url: Joi.string().required(),
    category: Joi.string().required(),
    brand: Joi.string().required(),
    color: Joi.string().required(),
    size: Joi.string().required(),
    stock_quantity: Joi.number().integer().min(0).default(0),
    is_featured: Joi.boolean().default(false)
  }),
  
  update: Joi.object({
    name: Joi.string().optional(),
    name_ar: Joi.string().optional(),
    description: Joi.string().optional(),
    description_ar: Joi.string().optional(),
    price: Joi.number().positive().optional(),
    image_url: Joi.string().optional(),
    category: Joi.string().optional(),
    brand: Joi.string().optional(),
    color: Joi.string().optional(),
    size: Joi.string().optional(),
    stock_quantity: Joi.number().integer().min(0).optional(),
    is_featured: Joi.boolean().optional()
  })
};
