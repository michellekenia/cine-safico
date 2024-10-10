# Catálogo de Filmes Sáficos

Este projeto é uma aplicação web que serve como um catálogo de filmes. Ele permite que os usuários explorem, adicionem, editem e removam filmes do catálogo. A aplicação utiliza **Puppeteer** para coletar informações relevantes sobre os filmes da internet, garantindo que os dados estejam sempre atualizados e completos.

## Funcionalidades Principais

- **CRUD de Filmes**: Permite adicionar, listar, editar e remover filmes do catálogo.
- **Web Scraping com Puppeteer**: Coleta automaticamente informações sobre filmes de fontes confiáveis na internet.
- **Interface Amigável**: Uma interface intuitiva que facilita a navegação e a busca por filmes.
- **Filtragem e Pesquisa**: Os usuários podem filtrar e pesquisar filmes por gênero, ano de lançamento e outras categorias.

## Índice

- [Tecnologias](#tecnologias)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Instalação e Execução do Projeto](#instalação-e-execução-do-projeto)
- [Uso](#uso)

## Tecnologias

- **Node.js**: Ambiente de execução.
- **NestJS**: Framework para construir aplicações escaláveis e eficientes.
- **Prisma**: ORM para manipulação de banco de dados.
- **PostgreSQL**: Sistema de gerenciamento de banco de dados.
- **TypeScript**: Linguagem utilizada para o desenvolvimento do projeto.
- **Puppeteer**: Biblioteca para automação de navegadores e web scraping.

## Configuração do Ambiente

Este projeto utiliza um arquivo `.env` para gerenciar as variáveis de ambiente necessárias para a conexão com o banco de dados e outras configurações.

### Passos para Configurar o Arquivo `.env`

1. **Criar o Arquivo `.env`**:
   No diretório raiz do seu projeto, crie um arquivo chamado `.env`.

2. **Adicionar Variáveis de Ambiente**:
   Abra o arquivo `.env` e adicione as seguintes variáveis, substituindo os valores de exemplo pelos seus dados reais:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

## Instalação e Execução do Projeto

1. **Clone o repositório**:
   git clone https://github.com/michellekenia/cine-safico
  cd cine-safico

2. **Clone o repositório**:
   npm install

3. **Execute as migrações do banco de dados**:
   npx prisma migrate dev

4. **Inicie a aplicação**:
   npm run start

5. **Inicie a aplicação**:
   Acesse a aplicação no navegador ou através de uma ferramenta como Postman em http://localhost:3000.

## Uso

Após a configuração e execução, você pode acessar a API através dos seguintes endpoints: