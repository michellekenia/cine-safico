# CINE-SAFICO 🎬

**Catálogo de Filmes Sáficos - Sistema de Curadoria e Descoberta de Filmes LBT**

Este projeto é uma aplicação backend desenvolvida em NestJS que serve como um catálogo especializado de filmes com temática LBT (Lésbicas, Bissexuais e Trans). O sistema realiza web scraping de listas do Letterboxd, traduz automaticamente os dados coletados para português brasileiro e expõe uma API RESTful para consulta.

## 🌟 Funcionalidades

- Coleta automatizada de dados de filmes do Letterboxd
- Tradução automática de sinopses, gêneros, países e idiomas para PT-BR
- API RESTful para busca, filtros e paginação
- Relacionamentos robustos entre filmes, gêneros, países, idiomas e serviços de streaming
- Processamento em lotes e controle de rate limiting

## 📋 Índice

- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Tecnologias](#-tecnologias)
- [Modelo de Dados](#-modelo-de-dados)
- [Configuração do Ambiente](#-configuração-do-ambiente)
- [Instalação e Execução](#-instalação-e-execução)
- [Web Scraping](#-web-scraping)
- [Tradução Automática](#-tradução-automática)
- [API Endpoints](#-api-endpoints)
- [Jobs e Automação](#-jobs-e-automação)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Deploy e Produção](#-deploy-e-produção)

## 🏗️ Arquitetura do Sistema

O projeto segue os princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**:

```
src/
├── adapters/         # Adaptadores externos (Prisma)
├── core/             # Regras de negócio e domínio
├── movie/            # Módulo principal de filmes
├── scraper/          # Serviço de web scraping
├── translate/        # Serviço de tradução
└── jobs/             # Tarefas em background
```

### Padrões Utilizados
- **Repository Pattern**: Abstração da camada de dados
- **Service Layer**: Lógica de negócio centralizada
- **DTO Pattern**: Transferência de dados tipada
- **Dependency Injection**: Inversão de controle

## 🛠️ Tecnologias

### Backend Core
- **Node.js 18+**: Runtime JavaScript
- **NestJS 10+**: Framework progressivo para Node.js
- **TypeScript 5+**: Superset tipado do JavaScript
- **Prisma 5+**: ORM moderno e type-safe

### Banco de Dados
- **PostgreSQL 15+**: Sistema de banco relacional
- **Prisma Client**: Cliente de banco gerado automaticamente
- **Migrations**: Controle de versão do schema

### Web Scraping & Automação
- **Puppeteer**: Automação de navegador headless
- **Cheerio**: Parser HTML do lado servidor
- **Axios**: Cliente HTTP para requisições
- **Node-Cron**: Agendamento de tarefas automatizadas

### Tradução & Processamento
- **Google Translate API**: Tradução automática de sinopses, gêneros, países e idiomas
- **Processamento em Lotes**: Traduções processadas em grupos de 10 itens (sinopses) ou sem limite (metadados)
- **Rate Limiting**: Delays de 2 segundos entre traduções de sinopses e 1 segundo entre metadados

### Qualidade de Código
- **ESLint**: Linter para JavaScript/TypeScript
- **Prettier**: Formatador de código

## 🗄️ Modelo de Dados

O modelo de dados do CINE-SAFICO é gerenciado pelo Prisma ORM, que garante integridade referencial, tipagem automática e facilidade de consulta entre entidades relacionadas. O Prisma permite definir o schema do banco de dados de forma declarativa, gerar clientes tipados para acesso aos dados e realizar migrações seguras.

As principais entidades do sistema são:

- **ScrapedMovie**: Representa um filme coletado do Letterboxd, incluindo título, diretor, ano, sinopses (original e traduzida), pôster, duração, classificação, data de coleta e relacionamentos.
- **Genre**: Gêneros do filme, com nome original, nome traduzido, slug e destaque. Relacionamento muitos-para-muitos com filmes.
- **Country**: Países de produção, com nome original, nome traduzido e slug. Relacionamento muitos-para-muitos com filmes.
- **Language**: Idiomas do filme, com nome original, nome traduzido e slug. Relacionamento muitos-para-muitos com filmes.
- **StreamingService**: Serviços de streaming onde o filme está disponível, com nome e link. Relacionamento um-para-muitos com filmes.

### Relacionamentos e integridade
- Um filme pode ter vários gêneros, países, idiomas e serviços de streaming associados.
- Os relacionamentos muitos-para-muitos (filme-gênero, filme-país, filme-idioma) são gerenciados automaticamente pelo Prisma, facilitando consultas e garantindo que não haja duplicidade ou inconsistência.
- O Prisma gera tipos TypeScript para todas as entidades e relações, permitindo autocompletar e validação em tempo de desenvolvimento.

Durante o scraping, o sistema detecta duplicatas, registra logs, aplica tentativas automáticas em caso de erro, gerencia memória e controla a frequência das requisições, sempre respeitando a integridade do modelo de dados definido pelo Prisma.

## ⚙️ Configuração do Ambiente

Pré-requisitos: Node.js 18+, PostgreSQL 15+, Git.

Crie um arquivo `.env` na raiz do projeto com as variáveis de ambiente necessárias (veja `.env.example`).

## 🚀 Instalação e Execução

```bash
# 1. Clone o repositório
git clone https://github.com/michellekenia/cine-safico.git
cd cine-safico

# 2. Instale as dependências
npm install

# 3. Configure o banco de dados (gere o cliente Prisma e execute as migrações)
npx prisma generate
npx prisma migrate dev

# 4. Inicie a aplicação em modo desenvolvimento
npm run start:dev
```

Acesse a API em http://localhost:3000

## 🕷️ Web Scraping

O sistema de web scraping do CINE-SAFICO é responsável por alimentar o catálogo com filmes a partir de listas curadas do Letterboxd.

### Como funciona o processo:

- **Fonte dos dados:** O scraper acessa uma lista pública e especializada no Letterboxd, mantida pela comunidade, contendo filmes com temática LBT.
- **Navegação automatizada:** Utiliza Puppeteer para simular um navegador, acessar a lista e visitar cada página de filme individualmente.
- **Extração de dados:** Para cada filme, são coletados: título, título original, diretor, ano, duração, sinopse (em inglês), gêneros, países, idiomas, classificação indicativa, imagem do pôster e links de streaming disponíveis no Brasil.
- **Tratamento e limpeza:** Os dados extraídos passam por limpeza (remoção de duplicatas, normalização de nomes, geração de slugs únicos) e validação para garantir integridade e consistência.
- **Tradução automática:** Sinopses, gêneros, países e idiomas são traduzidos automaticamente para português brasileiro utilizando a API do Google Translate.
- **Persistência:** Os dados tratados e traduzidos são salvos no banco de dados relacional, respeitando os relacionamentos entre filmes, gêneros, países, idiomas e serviços de streaming.
- **Controle de frequência:** O scraping é feito em lotes, com delays entre as requisições para evitar bloqueios e sobrecarga no Letterboxd.
- **Execução:** O processo pode ser disparado manualmente via endpoint da API ou agendado para rodar automaticamente em horários definidos.

### Como acionar o scraping manualmente

O processo de scraping pode ser disparado a qualquer momento via API pelo seguinte endpoint:

- **POST http://localhost:3000/scraper/trigger-scraper**

Ao chamar esse endpoint, o sistema inicia a coleta dos filmes em background e retorna uma mensagem de confirmação.

### Arquitetura técnica do Scraper

O scraper é implementado seguindo a arquitetura do NestJS, com separação clara entre controller e service:

- **Controller (`JobsController`):**
  - Expõe o endpoint POST `/scraper/trigger-scraper`.
  - Recebe a requisição HTTP e dispara o job de scraping em background, retornando uma resposta imediata para o usuário.
  - Não contém lógica de scraping, apenas orquestra a chamada ao service.

- **Service (`ScraperService`):**
  - Contém toda a lógica de navegação, extração, tratamento e persistência dos dados.
  - Utiliza Puppeteer para acessar a lista do Letterboxd e visitar cada página de filme.
  - Extrai os campos relevantes, faz a limpeza e normalização dos dados.
  - Chama o serviço de tradução automática para sinopses, gêneros, países e idiomas.
  - Salva os dados no banco de dados via Prisma, respeitando os relacionamentos.
  - Implementa controle de lotes, delays e tratamento de erros.

## 🌍 Tradução Automática

Após a coleta dos dados pelo scraper, o sistema executa a tradução automática dos principais campos para português brasileiro:

- **Sinopses:** O texto original em inglês é traduzido para PT-BR utilizando a API do Google Translate.
- **Gêneros, países e idiomas:** Os nomes originais são traduzidos e armazenados em campos próprios, mantendo a referência ao valor original.
- **Processamento em lotes:** A tradução de sinopses é feita em grupos pequenos para evitar limites da API, enquanto metadados (gêneros, países, idiomas) são processados sem limite.
- **Controle de frequência:** Há delays entre as requisições para evitar bloqueios e respeitar as políticas do serviço de tradução.
- **Persistência:** Os dados traduzidos são salvos no banco de dados, ficando disponíveis para consulta na API.

> O tradutor automático também pode ser acionado periodicamente por um cron job externo, configurado na plataforma [cron-job.org](https://cron-job.org), que faz requisições HTTP para o endpoint de tradução hospedado no Render.

### Arquitetura técnica da Tradução Automática

O processo de tradução automática é implementado em camadas, seguindo a arquitetura do NestJS:

- **Controller (JobsController):**
  - Expõe os endpoints para acionar a tradução de metadados e sinopses.
  - Recebe a requisição HTTP e dispara o job de tradução em background, retornando resposta imediata.
  - Não contém lógica de tradução, apenas orquestra a chamada ao service.

- **Service (TranslationService):**
  - Responsável por buscar os registros que precisam ser traduzidos (sinopses, gêneros, países, idiomas).
  - Para sinopses, processa em lotes pequenos (ex: 10 por vez) para evitar limites da API.
  - Para metadados, processa todos os itens pendentes sem limite de quantidade.
  - Chama a API do Google Translate para cada item, aguardando um delay configurável entre as requisições para evitar bloqueios.
  - Atualiza o banco de dados com o texto traduzido, mantendo o original para referência.
  - Registra logs de sucesso e erro para cada tradução.


## 📡 API Endpoints

Os principais endpoints RESTful disponíveis para o front-end consumir são:

- **GET /movies**
  - Lista filmes do catálogo.
  - Resposta: lista paginada de filmes, cada um com dados completos e metadados de paginação.

- **GET /movies/{slug}**
  - Retorna detalhes completos de um filme específico identificado pelo slug.
  - Resposta: objeto com todos os campos do filme, incluindo sinopse traduzida, gêneros, países, idiomas e serviços de streaming.

- **GET /movies/highlights**
  - Lista filmes em destaque, selecionados por critérios de curadoria ou popularidade.
  - Uso: exibição em carrosséis, banners ou seções especiais do front-end.

- **GET /movies/by-genre**
  - Lista filmes agrupados por gênero.
  - Uso: navegação temática e filtros dinâmicos.

- **GET /movies/by-country/{slug}**
  - Lista filmes de um país específico, identificado pelo slug.
  - Uso: páginas de país ou filtros regionais.

- **GET /movies/by-language/{slug}**
  - Lista filmes de um idioma específico, identificado pelo slug.
  - Uso: navegação por idioma ou acessibilidade.

- **GET /movies/metadata/genres**
  - Lista todos os gêneros disponíveis para filtros e navegação.
  - Resposta: array de objetos com nome, slug e nome traduzido.

- **GET /movies/metadata/countries**
  - Lista todos os países disponíveis para filtros e navegação.
  - Resposta: array de objetos com nome, slug e nome traduzido.

- **GET /movies/metadata/languages**
  - Lista todos os idiomas disponíveis para filtros e navegação.
  - Resposta: array de objetos com nome, slug e nome traduzido.

### Funcionamento Técnico das Camadas Controller, Service e Repository

Cada endpoint exposto segue o padrão NestJS, com separação clara entre as camadas:

- **Controller (`MovieController`)**
  - Recebe as requisições HTTP do front-end.
  - Valida e interpreta parâmetros de rota, query e corpo.
  - Chama o método correspondente do service, repassando os parâmetros já validados.
  - Retorna a resposta do service diretamente para o front, no formato JSON padronizado.
  - Não contém lógica de negócio, apenas orquestra a entrada e saída dos dados.

- **Service (`MovieService`)**
  - Centraliza toda a lógica de negócio e acesso ao banco de dados.
  - Executa consultas via Prisma, aplicando filtros, paginação e ordenação conforme os parâmetros recebidos.
  - Realiza o mapeamento dos dados para os DTOs de resposta, garantindo que apenas os campos necessários sejam expostos.
  - Implementa regras como busca textual, agrupamento, seleção de destaques e montagem dos relacionamentos (gêneros, países, idiomas, streaming).
  - Retorna os dados prontos para o controller, já no formato esperado pelo front-end.

- **Repository (`MovieRepository`)**
  - Abstrai o acesso ao banco de dados, encapsulando as operações de leitura e escrita.
  - Expõe métodos específicos para consultas e manipulação de filmes, gêneros, países, idiomas e serviços de streaming.
  - Permite que o service utilize uma interface desacoplada da implementação concreta (Prisma), facilitando testes, manutenção e possíveis trocas de tecnologia no futuro.
  - Garante que a lógica de persistência e recuperação de dados fique isolada da lógica de negócio.

### Exemplo de resposta — Detalhes de um filme

```json
{
	"id": "cmfhd0yzd008jia78zuudchhl",
	"slug": "bound",
	"title": "Bound",
	"releaseDate": "1996",
	"director": "Lilly Wachowski, Lana Wachowski",
	"synopsisEn": "Corky, a tough female ex-convict working on an apartment renovation in a Chicago building, meets a couple living next door, Caesar, a paranoid mobster, and Violet, his seductive girlfriend, who is immediately attracted to her.",
	"synopsisPt": "Corky, uma ex-presidência dura que trabalha em uma reforma de apartamentos em um prédio de Chicago, encontra um casal morando ao lado, César, um mafioso paranóico e Violet, sua namorada sedutora, que é imediatamente atraída por ela.",
	"posterImage": "https://a.ltrbxd.com/resized/film-poster/4/7/2/8/9/47289-bound-0-250-0-375-crop.jpg?v=54e3ef63ae",
	"duration": "105 mins",
	"rating": "4.0",
	"scrapedAt": "2025-09-12T21:39:10.490Z",
	"streamingServices": [
		{
			"id": "cmfhd0yze008pia78o4ln07jg",
			"service": "Apple TV",
			"link": "https://tv.apple.com/br/movie/ligadas-pelo-desejo/umc.cmc.14h6ctfrpoaaiu4lbndk1pxcy?at=1000l3V2&ct=app_tv&itscg=30200&itsct=justwatch_tv_12&playableId=tvs.sbd.9001%3A950866823",
			"scrapedMovieId": "cmfhd0yzd008jia78zuudchhl"
		},
		{
			"id": "cmfhd0yze008qia788onczdbn",
			"service": "Google Play Movies",
			"link": "https://play.google.com/store/movies/details/Ligadas_Pelo_Desejo_LEG?gl=BR&hl=en&id=6vj1nD2jsEA",
			"scrapedMovieId": "cmfhd0yzd008jia78zuudchhl"
		},
		{
			"id": "cmfhd0yze008ria781lfcjobr",
			"service": "Filmelier Plus Amazon Channel",
			"link": "https://app.primevideo.com/detail?gti=amzn1.dv.gti.62b6b512-41df-2f12-b201-f05526a8554b",
			"scrapedMovieId": "cmfhd0yzd008jia78zuudchhl"
		}
	],
	"genres": [
		{
			"id": "cmfhcwxrw0001ia78slnkxy5a",
			"nome": "Drama",
			"nomePt": "Drama",
			"slug": "drama",
			"isFeatured": false
		},
		{
			"id": "cmfhcxd1h000qia782vxniof0",
			"nome": "Thriller",
			"nomePt": "Filme de ação",
			"slug": "thriller",
			"isFeatured": false
		},
		{
			"id": "cmfhcxg9q0012ia78m7i4hu2z",
			"nome": "Crime",
			"nomePt": "Crime",
			"slug": "crime",
			"isFeatured": false
		}
	],
	"country": [
		{
			"id": "cmfhcx6h5000hia78ofbc2b5p",
			"nome": "USA",
			"nomePt": "Estados Unidos",
			"slug": "usa"
		}
	],
	"language": [
		{
			"id": "cmfhcx20n000dia78n1uf4z1f",
			"nome": "English",
			"nomePt": "Inglês",
			"slug": "english"
		}
	]
}
```

## 🤖 Jobs e Automação

A camada de jobs do sistema é responsável por orquestrar tarefas automáticas e em background, como scraping e tradução de dados.

- **JobsController**: Expõe endpoints para disparo manual dos jobs de scraping e tradução, recebendo requisições HTTP e acionando os serviços correspondentes em background. Não contém lógica de negócio, apenas orquestra a execução.
- **Agendamento automático**: O sistema pode ser integrado a plataformas externas de agendamento (ex: cron-job.org), que disparam periodicamente os endpoints de job para manter o catálogo atualizado sem intervenção manual.
- **Execução em background**: Os jobs são processados de forma assíncrona, permitindo que operações demoradas (como scraping de listas grandes ou tradução em lote) não bloqueiem a API principal.
- **Controle de frequência e lotes**: O processamento é feito em lotes, com delays configuráveis, para evitar sobrecarga em serviços externos e respeitar limites de uso.
- **Logs e monitoramento**: Cada execução de job registra logs de sucesso e erro, facilitando o acompanhamento e a manutenção.


## 📁 Estrutura do Projeto

A estrutura do projeto segue os princípios de modularidade e separação de responsabilidades, facilitando manutenção e escalabilidade:

```
prisma/           # Schema do banco de dados e migrações
src/
├── adapters/     # Integração com serviços externos (ex: Prisma)
├── core/         # Regras de negócio e modelos de domínio
├── movie/        # Módulo principal de filmes (controllers, services, DTOs, repositórios)
├── scraper/      # Serviço de web scraping
├── translate/    # Serviço de tradução automática
├── jobs/         # Camada de jobs e automação (JobsController, agendamento)
└── test/         # Testes automatizados
```

- **prisma/**: Contém o schema do banco de dados (Prisma) e as migrações versionadas.
- **src/adapters/**: Módulos de integração com serviços externos, como o Prisma Client.
- **src/core/**: Modelos de domínio e regras de negócio centrais, independentes de infraestrutura.
- **src/movie/**: Toda a lógica relacionada a filmes, incluindo controllers, services, DTOs e repositórios.
- **src/scraper/**: Implementação do serviço de scraping, responsável por coletar e tratar dados do Letterboxd.
- **src/translate/**: Serviço de tradução automática, responsável por traduzir sinopses, gêneros, países e idiomas.
- **src/jobs/**: Camada de jobs, responsável por orquestrar tarefas automáticas e agendadas (scraping, tradução, etc).
- **test/**: Testes automatizados de integração e ponta a ponta.

## 🚀 Deploy em Produção

O deploy do sistema é dividido em duas partes principais: o backend (API) hospedado no Render e o banco de dados PostgreSQL hospedado no Supabase. Abaixo, veja como cada etapa é realizada e configurada.

### Backend (API) no Render

O Render é uma plataforma de cloud moderna voltada para desenvolvedores, que permite hospedar aplicações web forma simples e escalável. Com integração direta ao GitHub/GitLab, automação de deploy, gerenciamento de variáveis de ambiente e monitoramento integrado, o Render facilita todo o ciclo de vida de aplicações Node.js:

- Permite deploy contínuo a partir do repositório, automatizando atualizações e builds.
- Gerencia variáveis de ambiente de forma segura, sem expor segredos no código.
- Oferece logs em tempo real, monitoramento e fácil reinicialização do serviço.
- Provisiona recursos de forma automática, com escalabilidade horizontal e vertical.
- Suporte nativo a bancos PostgreSQL gerenciados, facilitando integração com Prisma.

**Passos para deploy no Render:**
1. **Crie um novo serviço Web no Render** e conecte ao repositório do projeto no GitHub.
2. **Configure as variáveis de ambiente** no painel do Render, conforme o arquivo `.env` (veja exemplo abaixo).
3. **Comando de build:**
   ```bash
   npm install && npm run build
   ```
4. **Comando de inicialização:**
   ```bash
   npx prisma migrate deploy && npm run start:prod
   ```
5. O Render irá provisionar a aplicação, rodar as migrations e iniciar o servidor automaticamente.

### Banco de Dados no Supabase

O Supabase é uma plataforma open source que oferece banco de dados PostgreSQL gerenciado, APIs automáticas, autenticação e storage de arquivos. Ele é uma excelente escolha para projetos Node.js/NestJS por ser fácil de integrar com o Prisma, garantir alta disponibilidade, backups automáticos e permitir gerenciamento completo dos dados via painel web.

**Passos para deploy/configuração no Supabase:**
1. **Crie um novo projeto** no painel do Supabase.
2. **Copie a string de conexão** PostgreSQL fornecida pelo Supabase.
3. **Atualize a variável `DATABASE_URL`** no `.env` do Render com a string de conexão do Supabase.

### Exemplo de configuração do arquivo `.env`

```
# URL de conexão com o banco de dados PostgreSQL (Supabase)
DATABASE_URL="postgresql://postgres:senha-supersecreta@db.xxxxxxxx.supabase.co:5432/nome_do_banco"

# Ativação dos jobs automáticos
SCRAPER_JOB_ENABLED=true
TRANSLATION_JOB_ENABLED=true

# Chave secreta para proteção dos endpoints de job
JOB_TRIGGER_SECRET="sua-chave-secreta"
```

## 👥 Equipe

- Michelle Kenia - Desenvolvedora Principal - [@michellekenia](https://github.com/michellekenia)

---

**🏳️‍🌈 Feito com amor para a comunidade LBT 💜**

