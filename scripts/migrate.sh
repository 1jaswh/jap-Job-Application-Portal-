#!/bin/bash

# Database migration script using golang-migrate

set -e

echo "🗄️  Running database migrations..."

# Check if golang-migrate is installed
if ! command -v migrate &> /dev/null; then
    echo "❌ golang-migrate is not installed."
    echo "Install with: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
    exit 1
fi

# Get database URL from environment or use default
DB_URL=${DATABASE_URL:-"postgres://postgres:password@localhost:5432/jap_db?sslmode=disable"}

# Apply migrations
echo "Applying up migrations..."
migrate -path ../migrations -database "$DB_URL" up

echo "✅ Migrations applied successfully!"
