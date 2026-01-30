#!/bin/bash

# Startup health check script
echo "Waiting for application to start..."

for i in {1..30}; do
  if curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Application health check passed"
    exit 0
  fi
  echo "⏳ Waiting for application... attempt $i/30"
  sleep 2
done

echo "❌ Application failed to start properly"
exit 1