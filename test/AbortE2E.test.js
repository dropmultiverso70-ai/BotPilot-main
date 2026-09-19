import test from 'node:test';
import assert from 'node:assert/strict';

import { AgentCore } from '../agent/AgentCore.js';
import { createContextManager } from '../agent/ContextManager.js';

function buildAgentWithSlowTool() {
  const calls = [];
  const client = {
    chatNonStream: async () => ({ ok: true, data: { message: { content: 'ok' } } }),
    abort: () => calls.push({ type: 'abort' })
  };
  const router = {
    selectModelForTask: () => 'model',
    getModelForRole: () => 'model',
    getSelectedModel: () => 'model'
  };
  const tools = {
    execute: async (toolId, params, options = {}) => {
      calls.push({ type: 'tool', toolId, params, aborted: options.signal?.aborted ?? false });
      await new Promise((resolve) => setTimeout(resolve, 80));
      return { status: 'success', facts: { ok: true } };
    }
  };

  const agent = new AgentCore(client, router, tools, createContextManager(), { maxSteps: 5, maxToolCalls: 2, maxConsecutiveSameTool: 2 });
  return { agent, calls };
}

test('abort no início do streaming finaliza sem estado inconsistente', async () => {
  const { agent } = buildAgentWithSlowTool();
  const promise = agent.process('liste a pasta atual');
  await Promise.resolve();
  agent.abort();
  const result = await promise;

  assert.equal(result.ok, false);
  assert.equal(agent.isRunning, false);
  assert.equal(agent.abortController, null);
  assert.equal(agent.currentStep, 0);
});

test('abort no meio do streaming não deixa estado inconsistente', async () => {
  const { agent } = buildAgentWithSlowTool();
  const promise = agent.process('analise o projeto');
  await Promise.resolve();
  await Promise.resolve();
  agent.abort();
  const result = await promise;

  assert.equal(result.ok, false);
  assert.equal(agent.isRunning, false);
  assert.equal(agent.abortController, null);
  assert.equal(agent.plan.length, 0);
});

test('abort ao final não persiste estado inconsistente', async () => {
  const { agent } = buildAgentWithSlowTool();
  const promise = agent.process('liste a pasta atual');
  await promise;
  agent.abort();

  assert.equal(agent.isRunning, false);
  assert.equal(agent.isCancelled, false);
  assert.equal(agent.abortController, null);
  assert.equal(agent.currentStep, 0);
});
