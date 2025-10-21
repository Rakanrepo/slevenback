#!/bin/bash

# Sleven Backend Deployment Script
echo "🚀 Starting Sleven Backend Deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please update the .env file with your actual values before running the application."
fi

# Build the application
echo "🔨 Building the application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t sleven-backend .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed."
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start the application
echo "🚀 Starting the application..."
docker-compose up -d

# Wait for the application to start
echo "⏳ Waiting for the application to start..."
sleep 10

# Check if the application is running
echo "🔍 Checking application health..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health)

if [ $response -eq 200 ]; then
    echo "✅ Application is running successfully!"
    echo "🌐 API is available at: http://localhost:3001"
    echo "📊 Health check: http://localhost:3001/health"
    echo "📚 API Documentation: http://localhost:3001"
else
    echo "❌ Application failed to start. Check the logs:"
    echo "docker-compose logs sleven-backend"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
