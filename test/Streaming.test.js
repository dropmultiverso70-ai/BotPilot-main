import test from 'node:test';
import assert from 'node:assert/strict';

import { OllamaClient } from '../agent/OllamaClient.js';

test('inicia stream de chunks corretamente', async () => {
  const client = new OllamaClient({ baseUrl: 'http://localhost:11434' });

  const stream = {
    read: async () => ({ done: true })
  };

  const processor = client.createStreamProcessor((piece) => {
    assert.ok(typeof piece === 'string');
  }, () => {}, () => {});

  await processor.process({ stream, decoder: new TextDecoder(), controller: new AbortController() });
});

test('recebe chunks e finaliza stream sem erro', async () => {
  const client = new OllamaClient({ baseUrl: 'http://localhost:11434' });
  const chunks = [];
  let completed = false;

  const reader = {
    reads: [
      { value: new TextEncoder().encode('{"message":{"content":"ol"}}\n'), done: false },
      { value: new TextEncoder().encode('{"message":{"content":"a"}}\n'), done: false },
      { value: undefined, done: true }
    ],
    async read() {
      const next = this.reads.shift();
      return next ?? { done: true };
    }
  };

  const processor = client.createStreamProcessor(
    (piece, data) => {
      chunks.push({ piece, data });
    },
    () => {
      completed = true;
    },
    (err) => {
      throw err;
    }
  );

  await processor.process({ stream: reader, decoder: new TextDecoder(), controller: new AbortController() });

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].piece, 'ol');
  assert.equal(chunks[1].piece, 'a');
  assert.equal(completed, true);
});

test('falha de conexão com Ollama é reportada', async () => {
  const client = new OllamaClient({ baseUrl: 'http://localhost:1' });
  const result = await client.chat([{ role: 'user', content: 'teste' }], { model: 'fake-model', stream: false });

  assert.equal(result.ok, false);
  assert.ok(result.error.message.includes('fetch') || result.error.message.includes('Failed') || result.error.code === 'ERR' || result.error.message.includes('HTTP'));
});
