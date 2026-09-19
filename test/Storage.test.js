import test from 'node:test';
import assert from 'node:assert/strict';

import { ContextManager, createContextManager, MEMORY_TYPES } from '../agent/ContextManager.js';

test('escreve e lê memória curta e de trabalho', () => {
  const context = createContextManager({ limits: { shortMessages: 5, workingItems: 10, longMemories: 20 } });

  context.addShortMessage({ from: 'me', text: 'Olá' });
  context.addWorkingItem({ type: 'thought', data: { value: 'planejar' } });

  assert.equal(context.getShortMemory().length, 1);
  assert.equal(context.getWorkingMemory().length, 1);
  assert.equal(context.getWorkingMemory()[0].content.type, 'thought');
});

test('falha de storage corrompido é tratada com recuperação segura', () => {
  const corrupted = '{not valid json';

  assert.throws(() => {
    JSON.parse(corrupted);
  });

  const recovered = ContextManager.fromJSON({ shortMemory: [], workingMemory: [], longMemory: [] });
  assert.ok(recovered instanceof ContextManager);
  assert.deepEqual(recovered.toJSON().shortMemory, []);
});

test('migração de dados preserva histórico e contexto', () => {
  const payload = {
    shortMemory: [{ id: 's-1', type: MEMORY_TYPES.SHORT, content: { from: 'me', text: 'hello' }, metadata: {}, tokens: 10 }],
    workingMemory: [{ id: 'w-1', type: MEMORY_TYPES.WORKING, content: { type: 'observation', data: { ok: true } }, metadata: {}, tokens: 10 }],
    longMemory: [{ id: 'l-1', type: MEMORY_TYPES.LONG, content: { note: 'persist' }, metadata: {}, tokens: 10 }],
    contextSummary: 'resumo',
    projectContext: { project: 'botia' },
    systemPrompt: 'prompt' 
  };

  const restored = ContextManager.fromJSON(payload);

  assert.deepEqual(restored.getShortMemory(), payload.shortMemory);
  assert.deepEqual(restored.getWorkingMemory(), payload.workingMemory);
  assert.equal(restored.getProjectContext().project, 'botia');
  assert.equal(restored.getContextSummary(), 'resumo');
});

test('storage cheio dispara truncamento de memória antiga', () => {
  const context = createContextManager({ limits: { shortMessages: 2, workingItems: 2, longMemories: 2 } });

  context.addShortMessage({ from: 'me', text: 'a' });
  context.addShortMessage({ from: 'me', text: 'b' });
  context.addShortMessage({ from: 'me', text: 'c' });
  context.addLongMemory({ note: 'v1' });
  context.addLongMemory({ note: 'v2' });
  context.addLongMemory({ note: 'v3' });

  assert.equal(context.getShortMemory().length, 2);
  assert.equal(context.getLongMemories().length, 2);
  assert.equal(context.getShortMemory()[0].content.text, 'b');
});
