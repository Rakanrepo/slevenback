# 🚂 Railway Deployment Guide for Sleven Backend

## 🚀 Quick Deploy to Railway

### 1. Connect Your Repository
1. Go to [Railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `slevenback` repository

### 2. Configure Environment Variables
In Railway dashboard, go to your project → Variables tab and add:

#### Required Variables:
```env
NODE_ENV=production
PORT=3001

# Database (Railway will provide these)
DB_HOST=your-railway-db-host
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=your-railway-db-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.railway.app

# Moyasar (Payment Gateway) - Get from Moyasar Dashboard
MOYASAR_SECRET_KEY=your-moyasar-secret-key
MOYASAR_PUBLIC_KEY=your-moyasar-public-key
MOYASAR_WEBHOOK_SECRET=your-moyasar-webhook-secret

# Resend (Email Service) - Get from Resend Dashboard
RESEND_API_KEY=re_your-resend-api-key

# Omniful - Get from Omniful Dashboard
OMNIFUL_API_URL=https://api.omniful.tech
OMNIFUL_API_KEY=your-omniful-api-key

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Add PostgreSQL Database
1. In Railway dashboard, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically set the database environment variables

### 4. Deploy
Railway will automatically:
- Install dependencies (`npm install`)
- Build the application (`npm run build`)
- Start the application (`npm run start:prod`)

## 🔧 Railway-Specific Configuration

### Build Settings
Railway will automatically detect this is a Node.js project and use the `railway.json` configuration.

### Health Check
Railway will use the `/health` endpoint to monitor your application.

### Custom Domain
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain
4. Update `CORS_ORIGIN` to match your domain

## 🗄️ Database Setup

### Automatic Setup
Railway PostgreSQL will be automatically configured with:
- Database name: `railway`
- User: `postgres`
- Password: Auto-generated (check Railway dashboard)

### Manual Database Setup (if needed)
```bash
# Connect to Railway database and run:
npm run migrate
npm run seed
```

## 🔍 Monitoring & Logs

### View Logs
1. Go to Railway dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Click on latest deployment
5. View logs in real-time

### Health Check
```bash
curl https://your-app.railway.app/health
```

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check Railway logs
   - Ensure all dependencies are in `package.json`
   - Verify TypeScript build works locally

2. **Application Crashes**
   - Check environment variables
   - Verify database connection
   - Check logs for specific errors

3. **Database Connection Issues**
   - Verify database environment variables
   - Check if PostgreSQL service is running
   - Ensure database credentials are correct

4. **Missing API Keys**
   - Add all required environment variables
   - Verify API keys are valid
   - Check service-specific dashboards

## 🔒 Security Best Practices

1. **Use Railway's built-in secrets management**
2. **Never commit `.env` files**
3. **Use strong, unique passwords**
4. **Enable HTTPS (automatic on Railway)**
5. **Set up proper CORS origins**

## 📊 Performance Optimization

1. **Railway automatically handles:**
   - Load balancing
   - Auto-scaling
   - HTTPS termination
   - CDN (if configured)

2. **Monitor usage in Railway dashboard**
3. **Set up alerts for high usage**

## 🆘 Support

### Railway Support
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

### Application Support
- Check application logs in Railway dashboard
- Verify all environment variables are set
- Test health endpoint: `https://your-app.railway.app/health`

## 🎉 Success!

Once deployed, your API will be available at:
- **API Base URL**: `https://your-app.railway.app`
- **Health Check**: `https://your-app.railway.app/health`
- **API Endpoints**: `https://your-app.railway.app/api/*`

Update your frontend to use the Railway URL instead of localhost!
