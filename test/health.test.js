import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

test('health endpoint returns the SHINEX envelope', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      data: { message: 'SHINEX API is running' }
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('unknown routes return a safe error shape', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/does-not-exist`);
    assert.equal(response.status, 404);
    assert.deepEqual((await response.json()).success, false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});