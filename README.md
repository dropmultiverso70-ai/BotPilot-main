# BOT.IA

Aplicativo desktop local para chat com modelos Ollama, memória, skills e agente configurável.

## Status de validação atual

Validação concluída com evidência no ambiente atual:

- `npm test -- --test-reporter=spec`: 15 testes aprovados, 0 falhas.
- `npx eslint . --ext .js`: exit 0, sem falhas de lint.
- `npm audit --json`: 0 vulnerabilidades.
- `npm run build`: build do Vite concluído com sucesso.

Validação bloqueada fora do container atual:

- A Fase 5 exige runtime real do Electron + Ollama + instalador Windows em máquina local/Windows.
- Este ambiente atual é Linux (`uname -a`), sem `electron` e sem `ollama` no PATH.
- Portanto, não é possível afirmar runtime real concluído nem marcar a branch como pronta para revisão/PR.

## Requisitos

- Node.js 20 ou superior para desenvolvimento e build.
- Windows x64 para executar o instalador.
- Ollama instalado separadamente para chat com modelos locais.

O aplicativo funciona sem Ollama para configuração e visualização. O Ollama não é empacotado no instalador.

## Desenvolvimento

```bash
npm install
npm run dev
```

Para executar a janela Electron localmente, gere o build e use:

```bash
npm run build
npm start
```

## Build e instalador

Build web de produção:

```bash
npm run build
```

Instalador Windows NSIS:

```bash
npm run dist:win
```

O instalador Windows real gerado pela entrega local/CI tem nome profissional `BOT.IA-Setup-1.0.3.exe` e é distribuído como pacote Windows x64 sem empacotar Ollama. A entrega final deve ser validada em ambiente Windows real antes de divulgação pública; o artefato local gera a mesma entrega e pode ser verificado por hash e tamanho.

## Ollama

Na inicialização, o BOT.IA testa automaticamente, com timeout:

- `http://localhost:11434/api/tags`
- `http://127.0.0.1:11434/api/tags`
- `/api/ps` no endpoint que responder

O primeiro endpoint que responder é salvo como endpoint ativo. O campo de endpoint em Configurações > Agente aceita **apenas** `http://127.0.0.1:11434` e `http://localhost:11434` (e somente `http`/`https`): a política de segurança (`connect-src` da CSP) bloqueia qualquer outro host ou porta, então endpoints remotos **não** são suportados nesta versão. Um valor inválido é sinalizado na própria tela e o status passa a exibir `ENDPOINT INVÁLIDO` em vez de apenas `OLLAMA OFFLINE`. Os modelos instalados aparecem no Preview; o modelo em execução tem prioridade e, se não houver um, o primeiro modelo instalado é selecionado. A seleção manual e o botão de parada permanecem disponíveis.

No Windows, o processo principal também verifica a instalação e o processo `ollama.exe` com `where.exe` e `tasklist.exe`. Quando possível, o botão de diagnóstico tenta iniciar `ollama serve`; se houver exigência de privilégio, a interface informa que o Ollama deve ser iniciado externamente.

Os estados exibidos são `CONECTANDO...`, `OLLAMA ONLINE`, `OLLAMA OFFLINE` e `OLLAMA NÃO INSTALADO`.

## Preview do agente

O painel Preview renderiza, em um `iframe` com `sandbox="allow-scripts"` (sem `allow-same-origin`), o bloco HTML que o modelo devolver:

- **permitido:** HTML e CSS do agente (renderização estática);
- **bloqueado:** JavaScript do agente — o documento `srcdoc` herda a CSP do aplicativo (`script-src 'self'`), o que impede scripts/handlers inline;
- **bloqueado:** acesso ao contexto principal (o conteúdo roda em origem opaca: sem DOM do app, sem `localStorage`, sem cookies);
- **bloqueado:** navegação externa (`frame-src 'none'`, sandbox sem `allow-popups` e allowlist `http`/`https` no processo principal).

Essa é uma limitação **intencional de segurança**: habilitar JavaScript isolado exigiria um `webview`/`BrowserView` com sessão e CSP próprias.

O painel Preview tem um **minimizador exclusivo**: o botão no próprio cabeçalho recolhe o painel para uma faixa lateral estreita (~44 px) com ícone de restauração sempre visível; o chat ocupa o espaço liberado e o conteúdo do preview é preservado ao restaurar.

## Dados locais

Memórias, skills, agente, endpoint, modelo ativo e histórico do chat são persistidos no `localStorage` usando as chaves `botia_memories`, `botia_skills`, `botia_agent`, `botia_endpoint`, `botia_active_model` e `botia_messages`, sem backend e sem banco de dados.

O histórico é gravado fora do streaming (ao terminar cada geração). Em memória, o histórico é limitado a 800 mensagens: ao ultrapassar, as mais antigas saem da tela com aviso, preservando as recentes. A persistência tem limite técnico próprio: no máximo 400 mensagens e ~1,5 MB de JSON — quando atingido, as mensagens **mais antigas deixam de ser salvas** (as recentes são preservadas e o app avisa na tela). O Ollama também precisa estar instalado separadamente — ele não é empacotado.

## Código-fonte e entry point

O aplicativo é definido em `main.jsx` (empacotado pelo Vite) e carregado pela janela Electron via `electron/main.cjs` → `dist/index.html`.

O arquivo `Sistema-Unificado-V4-SPLIT-SEM-SIDEBAR.html` na raiz é uma **versão standalone legada** (React via CDN), mantida apenas como referência. **Ele NÃO é o entry point**, não é empacotado e não deve ser editado para alterar o aplicativo. Alterações de produto devem ser feitas em `main.jsx`.

## Limitações conhecidas

- O instalador é gerado para Windows x64; a criação pode ser feita em Windows ou em Linux com Wine configurado.
- Os cenários de instalação, atualização e desinstalação ainda precisam ser validados com o fluxo completo do instalador (telas do Setup NSIS) em Windows real; o teste em runtime do binário empacotado não cobre esse fluxo.
