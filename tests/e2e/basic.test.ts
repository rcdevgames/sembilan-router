import { test, expect } from '@playwright/test';

test('Sembilan Router API health check', async ({ page }) => {
  // Test that the service is running
  const response = await page.goto('http://127.0.0.1:20127/');
  expect(response?.status()).toBe(200);
  
  // Test chat endpoint
  const chatResponse = await fetch('http://127.0.0.1:20127/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer fake-key'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }]
    })
  });
  
  // Should return 401 (unauthorized) or 404 (if blocked), but not 500
  expect(chatResponse.status).toBeLessThan(500);
});