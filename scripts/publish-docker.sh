#!/bin/bash

# GalaOS Docker Image Publishing Script
# Builds and publishes Docker images to Docker Hub

set -e

VERSION=${1:-latest}
REGISTRY=${2:-justinwalkertattoo}

echo "=========================================="
echo "  Publishing GalaOS Docker Images"
echo "=========================================="
echo ""
echo "Version: $VERSION"
echo "Registry: $REGISTRY"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if logged into Docker Hub
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}⚠ Not logged into Docker Hub${NC}"
    echo "Please login first:"
    docker login
fi

echo -e "${GREEN}Building images...${NC}"
echo ""

# Build API
echo "📦 Building galaos-api..."
docker build -t $REGISTRY/galaos-api:$VERSION -f apps/api/Dockerfile .
docker tag $REGISTRY/galaos-api:$VERSION $REGISTRY/galaos-api:latest

# Build Web
echo "📦 Building galaos-web..."
docker build -t $REGISTRY/galaos-web:$VERSION -f apps/web/Dockerfile .
docker tag $REGISTRY/galaos-web:$VERSION $REGISTRY/galaos-web:latest

# Build Worker
echo "📦 Building galaos-worker..."
docker build -t $REGISTRY/galaos-worker:$VERSION -f apps/worker/Dockerfile .
docker tag $REGISTRY/galaos-worker:$VERSION $REGISTRY/galaos-worker:latest

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""

# Ask for confirmation before pushing
read -p "Push images to Docker Hub? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}Pushing images...${NC}"
echo ""

# Push API
echo "⬆️  Pushing galaos-api..."
docker push $REGISTRY/galaos-api:$VERSION
docker push $REGISTRY/galaos-api:latest

# Push Web
echo "⬆️  Pushing galaos-web..."
docker push $REGISTRY/galaos-web:$VERSION
docker push $REGISTRY/galaos-web:latest

# Push Worker
echo "⬆️  Pushing galaos-worker..."
docker push $REGISTRY/galaos-worker:$VERSION
docker push $REGISTRY/galaos-worker:latest

echo ""
echo "=========================================="
echo -e "${GREEN}  ✅ Publishing Complete!${NC}"
echo "=========================================="
echo ""
echo "Images published:"
echo "  - $REGISTRY/galaos-api:$VERSION"
echo "  - $REGISTRY/galaos-web:$VERSION"
echo "  - $REGISTRY/galaos-worker:$VERSION"
echo ""
echo "Users can now pull with:"
echo "  docker pull $REGISTRY/galaos-api:$VERSION"
echo "  docker pull $REGISTRY/galaos-web:$VERSION"
echo "  docker pull $REGISTRY/galaos-worker:$VERSION"
echo ""
