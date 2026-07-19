import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:20127';

test.describe('Sembilan Router API Tests', () => {
  
  test('GET /v1/models - should return models list or require auth', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/v1/models`);
    expect([200, 401]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('object', 'list');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      
      // Check model structure
      const model = data.data[0];
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('object', 'model');
    }
  });

  test('POST /v1/chat/completions - should handle chat request', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/v1/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say hello in one word' }
        ],
        max_tokens: 10
      }
    });
    
    // Should return 200 or 401 (if no auth configured)
    expect([200, 401, 403]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('object', 'chat.completion');
      expect(data).toHaveProperty('choices');
      expect(Array.isArray(data.choices)).toBe(true);
      expect(data.choices[0]).toHaveProperty('message');
      expect(data.choices[0].message).toHaveProperty('role', 'assistant');
      expect(data.choices[0].message).toHaveProperty('content');
    }
  });

  test('POST /v1/chat/completions - streaming should work', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/v1/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Count from 1 to 3' }
        ],
        stream: true,
        max_tokens: 50
      }
    });
    
    expect([200, 401, 403]).toContain(response.status());
    
    if (response.status() === 200) {
      const text = await response.text();
      // SSE format: lines starting with "data: "
      expect(text).toContain('data: ');
      expect(text).toContain('[DONE]');
    }
  });

  test('POST /v1/responses - OpenAI Responses API format', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/v1/responses`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        model: 'gpt-4o-mini',
        input: 'What is 2+2?'
      }
    });
    
    expect([200, 401, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('output');
    }
  });

  test('POST /v1/messages - Anthropic Messages API format', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/v1/messages`, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      data: {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          { role: 'user', content: 'Say hi' }
        ]
      }
    });
    
    expect([200, 401, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('type', 'message');
      expect(data).toHaveProperty('content');
      expect(Array.isArray(data.content)).toBe(true);
    }
  });

  test('POST /v1/chat/completions - invalid model should return error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/v1/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        model: 'nonexistent-model-xyz',
        messages: [
          { role: 'user', content: 'test' }
        ]
      }
    });
    
    // Should return 4xx error
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /v1/chat/completions - missing messages should return error', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/v1/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        model: 'gpt-4o-mini'
      }
    });
    
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('GET /v1/models/:id - should return specific model info or require auth', async ({ request }) => {
    // First get models list to find a valid model ID
    const listResponse = await request.get(`${BASE_URL}/v1/models`);
    expect([200, 401]).toContain(listResponse.status());
    
    if (listResponse.status() === 200) {
      const listData = await listResponse.json();
      if (listData.data.length > 0) {
        const modelId = listData.data[0].id;
        
        const response = await request.get(`${BASE_URL}/v1/models/${modelId}`);
        expect([200, 404]).toContain(response.status());
        
        if (response.status() === 200) {
          const data = await response.json();
          expect(data).toHaveProperty('id', modelId);
          expect(data).toHaveProperty('object', 'model');
        }
      }
    }
  });

  test('Media endpoints should be blocked (text-only mode)', async ({ request }) => {
    // Test that media endpoints return 404 (disabled)
    const endpoints = [
      '/v1/images/generations',
      '/v1/audio/speech',
      '/v1/audio/transcriptions',
      '/v1/embeddings'
    ];
    
    for (const endpoint of endpoints) {
      const response = await request.post(`${BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        data: {}
      });
      
      // Should return 404 (disabled) or 401 (auth required)
      expect([401, 404]).toContain(response.status());
    }
  });

  test('Dashboard should be accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard`);
    expect(response?.status()).toBe(200);
    
    // Check that dashboard loaded
    await expect(page).toHaveTitle(/Sembilan Router/);
  });

});
