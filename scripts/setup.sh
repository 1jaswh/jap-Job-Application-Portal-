#!/bin/bash

# Job Application Portal - Setup Script

echo "🚀 Setting up Job Application Portal..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file from example
if [ ! -f ../backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cp ../backend/.env.example ../backend/.env
    echo "✅ .env file created. Please update with your database credentials if needed."
else
    echo "✅ Backend .env already exists"
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p ../backend/uploads
chmod 755 ../backend/uploads

# Start services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run migrations (optional - GORM auto-migrate will also work)
echo "📊 Database migrations will run automatically on first startup."

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Access points:"
echo "   Frontend:  http://localhost"
echo "   Backend:   http://localhost:8080"
echo "   API Health: http://localhost:8080/health"
echo ""
echo "👤 Admin credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📝 To view logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down"
