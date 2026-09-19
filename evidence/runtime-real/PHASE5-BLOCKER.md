# Bloqueio da Fase 5 — runtime real fora do container

## Resumo
A validação real do Electron + Ollama + instalador Windows não pode ser concluída neste ambiente atual porque o container é Linux e não possui o executável `electron`, nem o binário `ollama`, nem suporte de execução do instalador NSIS/Windows.

## Evidência observada

Comando executado:

```bash
cd /workspaces/BotPilot-main && uname -a && which electron || true && which ollama || true && node -v && npm -v
```

Resultado relevante:

- SO: Linux codespaces-a3e9c6 6.8.0-1064-azure ...
- `which electron`: sem saída
- `which ollama`: sem saída
- Node e npm disponíveis

Isso confirma que o ambiente atual não atende aos requisitos de runtime real da Fase 5:

- Electron real para abrir a janela desktop
- Ollama real em execução localmente
- ambiente Windows para build/instalação NSIS

## Impacto
A branch `fix/stabilize-botia-runtime` não pode ser declarada como pronta para revisão/PR enquanto a Fase 5 não for executada em máquina local com suporte ao runtime alvo.

## Próximo passo obrigatório
Executar os passos da Fase 5 em uma máquina local Windows com:

1. Node.js + npm limpo
2. `npm install`
3. Ollama instalado e rodando (`llama3.1:8b` ou modelo compatível)
4. execução do app em modo Electron real
5. build + instalador NSIS
6. validação do app instalado

## Status
Bloqueado por ambiente, não por falha de código validada no CI automatizado.
