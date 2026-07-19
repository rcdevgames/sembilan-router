#!/bin/bash

# E2E Test for Sembilan Router

set -e

echo "=== Testing Sembilan Router Service ==="

# Test service is running
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:20127/)
echo "Root endpoint status: $STATUS"
if [ "$STATUS" != "307" ]; then
  echo "❌ Root endpoint failed: expected 307, got $STATUS"
  exit 1
fi

echo "✅ Root endpoint OK"

# Test chat endpoint (should return 401 or 404, not 500)
CHAT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:20127/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-key" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}')
echo "Chat endpoint status: $CHAT_STATUS"
if [ "$CHAT_STATUS" -ge 500 ]; then
  echo "❌ Chat endpoint failed: returned $CHAT_STATUS (server error)"
  exit 1
fi

echo "✅ Chat endpoint OK"

echo "=== All tests passed! ==="
