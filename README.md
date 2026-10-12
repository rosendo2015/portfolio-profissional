# Portfólio profissional de Francisco Rosendo

Portfólio pessoal desenvolvido com React, TypeScript e Vite para apresentar projetos públicos do GitHub, destacar trabalhos relevantes e facilitar o contato profissional.

## Prévia

![Captura da página inicial do portfólio](public/portfolio-homepage.png)

## Visão geral

Este projeto exibe uma seleção dos meus repositórios, excluindo forks e organizando os projetos por categoria, busca e status de publicação. A interface foi pensada para ser responsiva, acessível e com suporte a tema claro e escuro.

## Funcionalidades

- Listagem dinâmica de repositórios públicos do GitHub
- Exibição de descrição, linguagem principal, tópicos e estatísticas
- Filtro por projetos com site publicado e por categoria
- Busca por nome, descrição e tecnologias
- Paginação para navegação entre projetos
- Destaques manuais de projetos selecionados
- Tema claro/escuro com persistência no navegador
- Integração com a API pública do GitHub
- Design responsivo para desktop, tablet e mobile

## Stack utilizada

- React 19
- TypeScript
- Vite
- ESLint
- Lucide React

## Requisitos

Antes de iniciar, certifique-se de ter instalado:

- Node.js 18 ou superior
- npm 9 ou superior

## Como executar localmente

1. Clone o repositório:

```bash
git clone ***
cd portfolio-profissional
```

2. Instale as dependências:

```bash
npm install
```

3. Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

4. Acesse a aplicação no navegador:

```text
http://localhost:5173
```

## Scripts disponíveis

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

### Descrição dos scripts

- `npm run dev`: inicia o servidor de desenvolvimento do Vite
- `npm run build`: compila o projeto para produção
- `npm run lint`: executa a verificação de qualidade com ESLint
- `npm run preview`: abre a build de produção localmente

## Integração com o GitHub

A aplicação consulta a API pública do GitHub para listar os repositórios do usuário `rosendo2015`.

Alguns comportamentos importantes:

- forks são excluídos da listagem
- os dados são carregados em páginas da API até completar os repositórios
- a seção de projetos publicados usa o campo `homepage` do GitHub
- quando o repositório possui uma URL válida em `homepage`, é exibida a ação de acesso ao site
- a página também tenta extrair uma imagem de destaque de cada README para melhorar a visualização

## Estrutura do projeto

```text
portfolio-profissional/
├── public/
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── assets/
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## Observações importantes

- O projeto depende da API pública do GitHub e pode sofrer limitações de taxa quando acessada muitas vezes em sequência.
- Para exibir corretamente um link de site em um projeto, o repositório deve ter o campo `homepage` preenchido no GitHub.
- A interface foi desenvolvida em português do Brasil e prioriza responsividade e acessibilidade.

## Licença

Este projeto não possui uma licença explícita definida no repositório. Caso deseje reutilizar ou adaptar o código, verifique a política da organização ou do autor antes de publicar em produção.

## Contato

- GitHub: https://github.com/rosendo2015
- Portfolio: explore os projetos no próprio site em execução localmente
