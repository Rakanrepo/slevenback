# Sleven Backend Deployment Guide

## 🚀 Quick Start

### Option 1: Using the Start Script (Recommended)
```bash
# Make the script executable
chmod +x start.sh

# Run the application
./start.sh
```

### Option 2: Manual Steps
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start the application
npm start
```

## 🐳 Docker Deployment

### Prerequisites
- Docker installed
- Docker Compose installed

### Using Docker Compose (Recommended)
```bash
# Start all services (app + database)
docker-compose up -d

# Check logs
docker-compose logs sleven-backend

# Stop services
docker-compose down
```

### Using Docker directly
```bash
# Build the image
docker build -t sleven-backend .

# Run the container
docker run -p 3001:3001 --env-file .env sleven-backend
```

## 🔧 Environment Configuration

### Required Environment Variables
Create a `.env` file with the following variables:

```env
NODE_ENV=production
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sleven
DB_USER=sleven_user
DB_PASSWORD=your-password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Moyasar (Payment Gateway)
MOYASAR_SECRET_KEY=your-moyasar-secret-key
MOYASAR_PUBLIC_KEY=your-moyasar-public-key
MOYASAR_WEBHOOK_SECRET=your-moyasar-webhook-secret

# Resend (Email Service)
RESEND_API_KEY=your-resend-api-key

# Omniful
OMNIFUL_API_URL=https://api.omniful.tech
OMNIFUL_API_KEY=your-omniful-api-key
```

## 🗄️ Database Setup

### Using Docker Compose (Recommended)
The `docker-compose.yml` file includes a PostgreSQL database that will be automatically set up.

### Manual Database Setup
1. Install PostgreSQL
2. Create database and user:
```sql
CREATE DATABASE sleven;
CREATE USER sleven_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE sleven TO sleven_user;
```

3. Run migrations:
```bash
npm run migrate
```

4. Seed the database:
```bash
npm run seed
```

## 🔍 Health Check

The application includes a health check endpoint:
- **URL**: `http://localhost:3001/health`
- **Method**: GET
- **Response**: JSON with status information

## 📊 Monitoring

### Application Logs
```bash
# Docker Compose
docker-compose logs -f sleven-backend

# Docker
docker logs -f <container-id>

# Direct
npm start
```

### Health Check
```bash
curl http://localhost:3001/health
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process using port 3001
   lsof -ti:3001 | xargs kill -9
   ```

2. **Database connection failed**
   - Check database credentials in `.env`
   - Ensure database is running
   - Check network connectivity

3. **Build fails**
   ```bash
   # Clean and rebuild
   rm -rf node_modules dist
   npm install
   npm run build
   ```

4. **Permission denied**
   ```bash
   # Fix script permissions
   chmod +x start.sh
   chmod +x deploy.sh
   ```

## 🔒 Security Considerations

1. **Change default passwords** in production
2. **Use strong JWT secrets**
3. **Configure CORS** properly for your domain
4. **Use HTTPS** in production
5. **Keep dependencies updated**

## 📈 Performance Optimization

1. **Use PM2** for process management:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name sleven-backend
   ```

2. **Enable gzip compression** (already configured)
3. **Use a reverse proxy** like Nginx
4. **Monitor memory usage**

## 🆘 Support

If you encounter issues:
1. Check the logs
2. Verify environment variables
3. Ensure all dependencies are installed
4. Check database connectivity
