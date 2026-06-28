# FinançasPro 💰

Aplicativo de controle de finanças pessoais, disponível como **PWA** (Progressive Web App) — funciona no navegador e pode ser instalado no celular como um app nativo.

**Acesso:** https://minhas-financas-wine-sigma.vercel.app

---

## Funcionalidades

### Transações
- Lançamento de receitas, despesas e investimentos
- Campos: descrição, valor previsto, valor realizado, categoria, forma de pagamento, status (pago/pendente), data
- Filtro por tipo e por mês/ano
- Editar e excluir transações
- Modal de detalhes ao clicar no nome da transação
- Resumo mensal (Receitas / Despesas / Saldo) no topo da tela

### Investimentos
- Cadastro de aplicações financeiras (renda fixa, renda variável, previdência, etc.)
- Campos: nome, instituição, tipo, valor inicial, valor atual, meta
- Cálculo automático de rentabilidade e progresso

### Metas
- Criação de metas financeiras com valor alvo e prazo
- Acompanhamento de progresso

### Relatórios
- Visão anual com receitas, despesas, investimentos e saldo por mês
- Percentual de gastos essenciais

### Dashboard
- Resumo do mês atual (saldo, receitas, despesas, investimentos)
- Perfil e dados do usuário

### Configurações
- Atualização de nome e saldo atual

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 (UMD via CDN) |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Deploy | Vercel |
| PWA | Web App Manifest + Service Worker |
| Estilo | CSS-in-JS (inline styles) |

### Decisões técnicas

- **Single-file SPA** — toda a aplicação está em `index.html`. React é carregado via CDN (`cdn.jsdelivr.net`), sem bundler, sem transpiler, sem build step.
- **JSX pré-compilado** — o código usa `React.createElement` diretamente, eliminando a necessidade do Babel em runtime.
- **RLS no Supabase** — Row Level Security garante que cada usuário acessa apenas seus próprios dados.
- **Theming por mutação** — os objetos globais `T` (tokens de cor) e `s` (estilos) são recriados a cada render do componente `App`, permitindo troca de tema sem Context API.

---

## Estrutura de arquivos

```
minhas-financas/
├── index.html        # Aplicação completa (React SPA ~2300 linhas)
├── manifest.json     # Configuração PWA
├── sw.js             # Service Worker (cache offline)
├── icon.png          # Ícone 512×512 (PWA + favicon)
├── icon-192.png      # Ícone 192×192 (manifest)
├── icon.svg          # Ícone SVG legado
├── vercel.json       # Configuração de deploy
└── README.md
```

---

## Banco de dados (Supabase)

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `user_profiles` | Perfil do usuário (nome, saldo atual) |
| `transactions` | Lançamentos financeiros |
| `categories` | Categorias de transações (por tipo) |
| `investments` | Aplicações financeiras |
| `goals` | Metas financeiras |
| `monthly_balance` | Saldo mensal registrado manualmente |
| `monthly_periods` | Períodos mensais do usuário |

### Segurança
- Todas as tabelas têm **RLS habilitado**
- Políticas garantem acesso apenas ao `user_id` autenticado
- Trigger automático cria `user_profiles` e categorias padrão no cadastro

---

## PWA — Instalação no celular

**Android (Chrome):**
1. Abra o site no Chrome
2. Menu ⋮ → "Adicionar à tela inicial" ou "Instalar app"

**iOS (Safari):**
1. Abra o site no Safari
2. Botão compartilhar ⬆ → "Adicionar à Tela de Início"

### Service Worker
- Assets do app: **network-first** com fallback para cache
- CDN (React, Supabase JS): **cache-first**
- API Supabase: sempre **rede** (nunca cacheado)

---

## Tema

O app suporta modo **dark** e **light**, com preferência salva em `localStorage`.

| Token | Dark | Light |
|---|---|---|
| Background | `#0f1117` | `#f1f5f9` |
| Surface | `#181c27` | `#ffffff` |
| Verde (sucesso) | `#3ecf8e` | `#10b981` |
| Vermelho (despesa) | `#f87171` | `#ef4444` |
| Texto | `#e2e8f0` | `#0f172a` |

---

## Deploy

O projeto faz deploy automático na **Vercel** a cada push na branch `main`.

```
git push origin main  →  Vercel detecta  →  deploy em ~30s
```

O arquivo `vercel.json` configura rewrite para SPA (todas as rotas redirecionam para `index.html`).

---

## Desenvolvimento local

Não há build step. Basta servir os arquivos estáticos:

```bash
# Python
python3 -m http.server 3000

# Node
npx serve .
```

Acesse `http://localhost:3000`. As variáveis do Supabase estão hardcoded no `index.html` (projeto pessoal com RLS).

---

## Histórico de versões

| PR | Funcionalidade |
|---|---|
| #1 | Setup inicial: auth, dashboard, transações |
| #2 | Correções de auth e fluxo de confirmação de e-mail |
| #3 | Fix trigger de criação de perfil no Supabase |
| #4 | Botão de editar transações |
| #5 | Renomear menu "Aplicações" → "Investimentos"; Previdência Inter; tema dark/light |
| #7 | PWA: manifest, service worker, ícones, meta tags |
| #8 | Modal de detalhes ao clicar na transação |
| #9 | Ícone personalizado PNG; sidebar inicia fechada |
| #10 | Responsividade mobile: modais e cards de resumo |
