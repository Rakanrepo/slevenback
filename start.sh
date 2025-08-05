#!/bin/bash
echo "Starting Sleven Caps Store API..."
echo "Environment: Production"
echo "Port: $PORT"
echo "Database: $DATABASE_URL"

# Run database migrations/setup if needed
python -c "
import os
os.environ.setdefault('DATABASE_URL', 'sqlite:///./caps_store.db')
from main_production import init_db
init_db()
print('Database initialized successfully')
"

# Start the application
exec uvicorn main_production:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1