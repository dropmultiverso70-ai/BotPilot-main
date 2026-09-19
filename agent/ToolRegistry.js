/**
 * ToolRegistry - Sistema genérico de ferramentas
 * Cada ferramenta: id, nome, descrição, schema, função, nível de segurança
 * Ferramentas filesystem usam botiaDesktop.filesystem (IPC real)
 */
import { toolSchemas } from './toolSchemas.js';

const SECURITY_LEVELS = {
  READ: 'read',
  ANALYZE: 'analyze',
  WRITE: 'write',
  DANGEROUS: 'dangerous'
};

function createToolResult(status, data, metadata = {}) {
  return {
    status,
    data,
    metadata: { timestamp: Date.now(), ...metadata }
  };
}

function normalizeObservation(toolName, result) {
  return {
    tool: toolName,
    status: result.status,
    facts: result.data,
    errors: result.status === 'error' || result.status === 'partial'
      ? [result.metadata?.error].filter(Boolean)
      : [],
    timestamp: result.metadata?.timestamp || Date.now()
  };
}

export class ToolRegistry {
  constructor(filesystemApi) {
    this.tools = new Map();
    this.filesystemApi = filesystemApi;
    this.registerFilesystemTools();
  }

  registerFilesystemTools() {
    this.register({
      id: 'filesystem.drives',
      name: 'Listar unidades',
      description: 'Retorna unidades de disco disponíveis no sistema',
      schema: toolSchemas.drives,
      securityLevel: SECURITY_LEVELS.READ,
      execute: async () => {
        try {
          const res = await this.filesystemApi.drives();
          if (!res.ok) return createToolResult('error', null, { error: res.error?.message || 'Falha ao listar unidades' });
          return createToolResult('success', { drives: res.drives || [] });
        } catch (e) {
          return createToolResult('error', null, { error: e.message });
        }
      }
    });

    this.register({
      id: 'filesystem.inspect',
      name: 'Inspecionar caminho',
      description: 'Inspeciona um arquivo ou pasta',
      schema: toolSchemas.inspect,
      securityLevel: SECURITY_LEVELS.READ,
      execute: async ({ path }) => {
        try {
          const res = await this.filesystemApi.inspect(path);
          if (!res.ok) return createToolResult('error', null, { error: res.error?.message || 'Falha na inspeção' });
          if (!res.exists) return createToolResult('not_found', { path: res.path }, { reason: 'Caminho não existe' });
          return createToolResult('success', res);
        } catch (e) {
          return createToolResult('error', null, { error: e.message });
        }
      }
    });

    this.register({
      id: 'filesystem.list',
      name: 'Listar diretório',
      description: 'Lista conteúdo de diretório',
      schema: toolSchemas.list,
      securityLevel: SECURITY_LEVELS.READ,
      execute: async ({ path, deep = false, entryLimit = 60000, depthLimit = 16, cancelId }) => {
        try {
          const res = await this.filesystemApi.list(path, { deep, entryLimit, depthLimit, cancelId });
          if (!res.ok) return createToolResult('error', null, { error: res.error?.message || 'Falha ao listar' });
          return createToolResult('success', res);
        } catch (e) {
          return createToolResult('error', null, { error: e.message });
        }
      }
    });

    this.register({
      id: 'filesystem.search',
      name: 'Buscar por nome',
      description: 'Busca arquivos/pastas por nome em raízes definidas',
      schema: toolSchemas.search,
      securityLevel: SECURITY_LEVELS.READ,
      execute: async ({ roots, name, type = 'file', maxResults = 20, depthLimit = 12, entryLimit = 60000, cancelId }) => {
        try {
          const res = await this.filesystemApi.search(roots, { name, type, maxResults, depthLimit, entryLimit, cancelId });
          if (!res.ok) return createToolResult('error', null, { error: res.error?.message || 'Falha na busca' });
          return createToolResult('success', res);
        } catch (e) {
          return createToolResult('error', null, { error: e.message });
        }
      }
    });

    this.register({
      id: 'filesystem.discover',
      name: 'Descobrir projetos',
      description: 'Descobre projetos em raízes definidas',
      schema: toolSchemas.discover,
      securityLevel: SECURITY_LEVELS.READ,
      execute: async ({ roots, maxResults = 10, depthLimit = 4, entryLimit = 50000, filter, cancelId }) => {
        try {
          const res = await this.filesystemApi.discover(roots, { maxResults, depthLimit, entryLimit, filter, cancelId });
          if (!res.ok) return createToolResult('error', null, { error: res.error?.message || 'Falha na descoberta' });
          return createToolResult('success', res);
        } catch (e) {
          return createToolResult('error', null, { error: e.message });
        }
      }
    });

    this.register({
      id: 'filesystem.hash',
      name: 'Hash SHA-256',
      description: 'Calcula SHA-256 de um arquivo',
      schema: toolSchemas.hash,
      securityLevel: SECURITY_LEVELS.READ,
      execute: async ({ path }) => {
        try {
          const res = await this.filesystemApi.hash(path);
          if (!res.ok) return createToolResult('error', null, { error: res.error?.message || 'Falha no hash' });
          return createToolResult('success', res);
        } catch (e) {
          return createToolResult('error', null, { error: e.message });
        }
      }
    });

    this.register({
      id: 'filesystem.cancel',
      name: 'Cancelar operação',
      description: 'Cancela busca/descoberta em andamento',
      schema: toolSchemas.cancel,
      securityLevel: SECURITY_LEVELS.READ,
      execute: async ({ cancelId }) => {
        try {
          const res = await this.filesystemApi.cancel(cancelId);
          return createToolResult('success', { cancelled: res.cancelled });
        } catch (e) {
          return createToolResult('error', null, { error: e.message });
        }
      }
    });
  }

  register(tool) {
    if (!tool.id || typeof tool.execute !== 'function') {
      throw new Error('Ferramenta inválida: id e execute obrigatórios');
    }
    this.tools.set(tool.id, {
      ...tool,
      schema: tool.schema || { type: 'object', properties: {} },
      securityLevel: tool.securityLevel || SECURITY_LEVELS.READ
    });
  }

  unregister(toolId) { this.tools.delete(toolId); }
  getTool(toolId) { return this.tools.get(toolId); }
  getAllTools() { return Array.from(this.tools.values()); }
  getToolsBySecurityLevel(level) { return Array.from(this.tools.values()).filter(t => t.securityLevel === level); }

  async execute(toolId, params = {}, options = {}) {
    const tool = this.tools.get(toolId);
    if (!tool) return createToolResult('error', null, { error: `Ferramenta não encontrada: ${toolId}` });

    const signal = options.signal;
    if (signal?.aborted) return createToolResult('cancelled', null, { error: 'Operação cancelada.' });

    const cancelId = params?.cancelId;
    const cancelOnAbort = () => {
      if (cancelId && this.filesystemApi?.cancel) {
        Promise.resolve(this.filesystemApi.cancel({ cancelId })).catch(() => {});
      }
    };
    signal?.addEventListener('abort', cancelOnAbort, { once: true });

    try {
      for (const required of tool.schema?.required || []) {
        if (!(required in params) || params[required] == null || params[required] === '') {
          return createToolResult('error', null, { error: `Parâmetro obrigatório ausente: ${required}` });
        }
      }

      const maxRetries = 2;
      let attempt = 0;
      while (attempt <= maxRetries) {
        try {
          const result = await tool.execute(params, options);
          if (signal?.aborted) return createToolResult('cancelled', null, { error: 'Operação cancelada.' });
          return normalizeObservation(toolId, result);
        } catch (error) {
          if (signal?.aborted || error.name === 'AbortError') {
            return normalizeObservation(toolId, createToolResult('cancelled', null, { error: 'Operação cancelada.' }));
          }
          if (!this.isTransientError(error) || attempt >= maxRetries) {
            return normalizeObservation(toolId, createToolResult('error', null, { error: error.message }));
          }
          attempt += 1;
          const backoff = Math.min(500 * Math.pow(2, attempt - 1), 2000);
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, backoff);
            const cancel = () => {
              clearTimeout(timer);
              reject(Object.assign(new Error('Operação cancelada.'), { name: 'AbortError' }));
            };
            signal?.addEventListener('abort', cancel, { once: true });
          });
        }
      }
      return normalizeObservation(toolId, createToolResult('error', null, { error: 'Máximo de retries atingido' }));
    } finally {
      signal?.removeEventListener('abort', cancelOnAbort);
    }
  }

  isTransientError(error) {
    if (!error) return false;
    const message = error.message || String(error);
    const code = error.code || '';
    const status = error.status || error.statusCode || 0;
    const transientCodes = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH'];
    const transientStatuses = [408, 409, 429, 500, 502, 503, 504];
    if (transientCodes.includes(code) || transientStatuses.includes(status)) return true;
    return ['timeout', 'timed out', 'connection refused', 'connection reset', 'network error', 'temporary failure', 'service unavailable', 'too many requests', 'rate limit']
      .some(value => message.toLowerCase().includes(value));
  }

  async executeSequence(toolCalls) {
    const results = [];
    for (const call of toolCalls) {
      const result = await this.execute(call.tool, call.params || {});
      results.push({ tool: call.tool, ...result });
      if (result.status === 'error' && call.critical) break;
    }
    return results;
  }

  getSchemasForLLM() {
    return Array.from(this.tools.values()).map(t => ({ name: t.id, description: t.description, parameters: t.schema }));
  }
}

export { SECURITY_LEVELS, createToolResult, normalizeObservation };
