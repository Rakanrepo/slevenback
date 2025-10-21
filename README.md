# Sleven Caps Store Backend API

A comprehensive backend API for the Sleven Caps Store, built with Node.js, Express, TypeScript, and PostgreSQL. This backend replaces the previous Supabase implementation with a custom solution that includes Moyasar payment integration, Resend email service, and Omniful inventory management.

## Features

- **Authentication System**: JWT-based authentication with optional registration
- **Product Management**: CRUD operations for caps/products
- **Order Management**: Complete order lifecycle management
- **Payment Integration**: Moyasar payment gateway integration with Apple Pay support
- **Email Service**: Resend email service for invoice emails
- **Inventory Management**: Omniful integration for inventory tracking
- **Database**: PostgreSQL with automated migrations and seeding
- **Security**: Helmet, CORS, input validation, and rate limiting

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with pg driver
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Joi
- **Email**: Resend
- **Payments**: Moyasar API
- **Inventory**: Omniful API
- **Security**: Helmet, CORS

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Installation

1. **Clone and navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/sleven_db
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=sleven_db
   DB_USER=username
   DB_PASSWORD=password

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d

   # Server Configuration
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173

   # Moyasar Configuration
   MOYASAR_SECRET_KEY=sk_live_your_moyasar_secret_key
   MOYASAR_WEBHOOK_SECRET=your_webhook_secret
   MOYASAR_PUBLIC_KEY=pk_live_your_moyasar_public_key

   # Resend Email Configuration
   RESEND_API_KEY=re_your_resend_api_key

   # Omniful Configuration
   OMNIFUL_API_URL=https://api.omniful.tech
   OMNIFUL_API_KEY=your_omniful_api_key
   ```

4. **Set up the database**:
   ```bash
   # Create database
   createdb sleven_db
   
   # Run migrations and seed data
   npm run migrate
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (optional)
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `DELETE /api/auth/me` - Delete account

### Products (Caps)
- `GET /api/caps` - Get all caps
- `GET /api/caps/featured` - Get featured caps
- `GET /api/caps/category/:category` - Get caps by category
- `GET /api/caps/:id` - Get cap by ID
- `POST /api/caps` - Create cap (admin)
- `PUT /api/caps/:id` - Update cap (admin)
- `PUT /api/caps/:id/stock` - Update stock (admin)
- `DELETE /api/caps/:id` - Delete cap (admin)

### Orders
- `POST /api/orders` - Create order (supports guest orders)
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order
- `GET /api/orders/pending/pay-on-arrival` - Get pending Pay on Arrival order
- `DELETE /api/orders/:id` - Delete order
- `GET /api/orders/stats/overview` - Get order statistics

### Payments
- `POST /api/payments/create` - Create payment with Moyasar
- `POST /api/payments/applepay/validate` - Validate Apple Pay merchant
- `GET /api/payments/:id/status` - Get payment status
- `POST /api/payments/webhook/moyasar` - Moyasar webhook
- `GET /api/payments/:id` - Get payment by ID
- `GET /api/payments/stats/overview` - Get payment statistics

### Omniful Integration
- `GET /api/omniful/process-queue` - Process Omniful queue
- `POST /api/omniful/process-order` - Process specific order
- `GET /api/omniful/queue-status` - Get queue status
- `POST /api/omniful/retry-failed` - Retry failed items
- `GET /api/omniful/inventory/:productId` - Get inventory status
- `POST /api/omniful/sync-product` - Sync product with Omniful

### Health Check
- `GET /health` - Health check endpoint

## Database Schema

The database includes the following tables:

- **users**: User accounts and profiles
- **caps**: Product catalog
- **orders**: Order management
- **payments**: Payment records
- **omniful_queue**: Queue for Omniful API calls

## Key Features

### 1. Optional Registration
Users can browse and purchase without registration, but registration provides order history and account management.

### 2. Moyasar Payment Integration
- Support for credit card and Apple Pay
- Webhook handling for payment status updates
- Automatic invoice email sending on successful payment

### 3. Resend Email Service
- Beautiful HTML invoice emails in Arabic
- Automatic email sending on order completion
- Professional email templates

### 4. Omniful Integration
- Queue-based inventory management
- Automatic inventory updates
- Product synchronization
- Retry mechanism for failed operations

### 5. Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Input validation with Joi
- CORS protection
- Helmet security headers

## Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data

### Project Structure
```
src/
├── config/          # Configuration files
├── database/        # Database schema and migrations
├── middleware/      # Express middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # External service integrations
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Main application file
```

## Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set production environment variables**

3. **Run database migrations**:
   ```bash
   npm run migrate
   ```

4. **Start the production server**:
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `PORT` | Server port | No (default: 3001) |
| `MOYASAR_SECRET_KEY` | Moyasar API secret key | Yes |
| `RESEND_API_KEY` | Resend email API key | Yes |
| `OMNIFUL_API_KEY` | Omniful API key | No |

## API Response Format

All API responses follow this format:

```json
{
  "success": boolean,
  "data": any,
  "error": string,
  "message": string
}
```

## Error Handling

The API includes comprehensive error handling:
- Input validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software for Sleven Caps Store.
