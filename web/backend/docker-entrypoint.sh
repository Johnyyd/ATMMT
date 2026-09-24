#!/bin/sh
set -e

echo "Waiting for database to be ready..."
# Wait a bit for database to be ready (handles volume mount timing issues)
sleep 2

echo "Checking database migration status..."
# Check if alembic_version table exists
if ! sqlite3 /app/data/guestbook.db "SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version';" 2>/dev/null | grep -q "alembic_version"; then
    echo "Alembic version table not found. Creating initial database schema..."
    # Create directory if it doesn't exist
    mkdir -p /app/data
    # Create uploads directory for avatar files
    mkdir -p /app/uploads/avatars
    # Create tables based on current models
    python -c "
import sys
sys.path.insert(0, '/app')
from app.database import engine, Base
print('Creating database tables...')
Base.metadata.create_all(bind=engine)
print('Database tables created successfully.')
"
    # Stamp with head revision since we just created tables at current model version
    echo "Stamping database with head revision..."
    alembic stamp head
    echo "Database stamped with head revision."
else
    echo "Alembic version table found. Checking current revision..."
    # Check current revision
    CURRENT_REV=$(alembic current 2>/dev/null | grep -Eo '[0-9a-f]{12}' | head -1) || CURRENT_REV=''
    echo "Current revision: $CURRENT_REV"

    # Get head revision
    HEAD_REV=$(alembic heads 2>/dev/null | grep -Eo '[0-9a-f]{12}' | head -1) || HEAD_REV=''
    echo "Head revision: $HEAD_REV"

    # If we're not at the head, try to upgrade
    if [ "$CURRENT_REV" != "$HEAD_REV" ]; then
        echo 'Running database migration...'
        alembic upgrade head
        echo 'Migration complete.'
    else
        echo 'Database is already up to date.'
    fi
fi

# Ensure uploads directory exists (needed for StaticFiles mount)
mkdir -p /app/uploads/avatars

echo 'Starting application...'
exec uvicorn app.main:app --host 0.0.0.0 --port 7000
