import test from 'node:test';
import assert from 'node:assert/strict';

import { AgentCore, AGENT_MODES } from '../agent/AgentCore.js';
import { createContextManager } from '../agent/ContextManager.js';

function createAgentHarness(overrides = {}) {
  const calls = [];

  const client = {
    chatNonStream: async (messages, options = {}) => {
      calls.push({ type: 'chatNonStream', messages, options });
      return { ok: true, data: { message: { content: 'Resposta simulada' } } };
    },
    abort: () => {
      calls.push({ type: 'abort' });
    }
  };

  const router = {
    selectModelForTask: (type) => 'llama3.1:8b',
    getModelForRole: (role) => 'llama3.1:8b',
    getSelectedModel: () => 'llama3.1:8b'
  };

  const tools = {
    execute: async (toolId, params, options = {}) => {
      calls.push({ type: 'tool', toolId, params, signal: options.signal });
      return { status: 'success', facts: { ok: true, tool: toolId, params } };
    }
  };

  const context = createContextManager();
  const agent = new AgentCore(client, router, tools, context, {
    maxSteps: 6,
    maxToolCalls: 3,
    maxConsecutiveSameTool: 2,
    ...overrides
  });

  return { agent, calls };
}

test('rejeição de execuções concorrentes', async () => {
  const { agent } = createAgentHarness();

  const first = agent.process('liste a pasta atual');
  const second = agent.process('liste outra pasta');

  const [res1, res2] = await Promise.all([first, second]);

  assert.equal(res1.ok, true);
  assert.equal(res2.ok, false);
  assert.equal(res2.error.code, 'EXECUTION_IN_PROGRESS');
});

test('limpeza do ciclo após conclusão', async () => {
  const { agent } = createAgentHarness();
  const result = await agent.process('liste a pasta atual');

  assert.equal(result.ok, true);
  assert.equal(agent.isRunning, false);
  assert.equal(agent.isCancelled, false);
  assert.equal(agent.abortController, null);
  assert.equal(agent.currentStep, 0);
  assert.equal(agent.stepHistory.length >= 0, true);
});

test('abort da execução', async () => {
  const { agent, calls } = createAgentHarness();
  let release;
  const slowTools = {
    execute: async (toolId, params, options = {}) => {
      calls.push({ type: 'tool', toolId, params, signal: options.signal });
      await new Promise((resolve) => {
        release = resolve;
      });
      return { status: 'success', facts: { ok: true, tool: toolId, params } };
    }
  };

  agent.tools = slowTools;

  const promise = agent.process('liste a pasta atual');
  await Promise.resolve();
  agent.abort();

  assert.equal(agent.isCancelled, true);
  assert.equal(agent.isRunning, true);

  release?.();
  const result = await promise;

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'ABORTED');
  assert.equal(agent.isRunning, false);
  assert.equal(agent.isCancelled, false);
  assert.equal(agent.abortController, null);
  assert.ok(calls.some(c => c.type === 'abort'));
});

test('retorno do agente ao estado ocioso', async () => {
  const { agent } = createAgentHarness();

  await agent.process('analise o projeto');
  assert.equal(agent.isRunning, false);
  assert.equal(agent.currentStep, 0);
  assert.equal(agent.plan.length, 0);
  assert.equal(agent.getStatus().isRunning, false);
});

test('limpeza de abortController', async () => {
  const { agent } = createAgentHarness();

  await agent.process('liste a pasta atual');
  assert.equal(agent.abortController, null);

  agent.abort();
  assert.equal(agent.abortController, null);
});
