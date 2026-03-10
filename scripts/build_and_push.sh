#!/bin/bash

VERSION=$1
USERNAME="kacperprzybyla"

if [ -z "$VERSION" ]; then
    echo "Usage: ./build_and_push.sh <version>"
    echo "Example: ./build_and_push.sh 1.2.3"
    exit 1
fi

echo "Building images for version $VERSION"

docker build -t $USERNAME/task-backend:$VERSION ./backend
docker build -t $USERNAME/task-frontend:$VERSION ./frontend
docker build -t $USERNAME/task-proxy:$VERSION ./proxy

docker tag $USERNAME/task-backend:$VERSION $USERNAME/task-backend:latest
docker tag $USERNAME/task-frontend:$VERSION $USERNAME/task-frontend:latest
docker tag $USERNAME/task-proxy:$VERSION $USERNAME/task-proxy:latest

echo "Pushing images for version $VERSION to Docker Hub"

docker push $USERNAME/task-backend:$VERSION
docker push $USERNAME/task-backend:latest
docker push $USERNAME/task-frontend:$VERSION
docker push $USERNAME/task-frontend:latest
docker push $USERNAME/task-proxy:$VERSION
docker push $USERNAME/task-proxy:latest

echo "Done! Images pushed:"
echo "  $USERNAME/task-backend:$VERSION"
echo "  $USERNAME/task-frontend:$VERSION"
echo "  $USERNAME/task-proxy:$VERSION"