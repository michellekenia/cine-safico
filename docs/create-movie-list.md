# Criar ou atualizar lista temática

Cria uma lista de filmes (ex: lista especial de feriado) ou atualiza uma já existente, adicionando filmes a ela.

## Comando

```bash
npx ts-node prisma/create-movie-list.ts --title=<título> --slug=<slug-da-lista> --movies=<slug1,slug2,...> [--description=<texto>] [--featured=true] [--order=<número>]
```

- `--title`: nome da lista.
- `--slug`: slug único da lista (usado na URL do site).
- `--movies`: slugs dos filmes, separados por vírgula.
- `--description`: opcional.
- `--featured`: opcional, `true` para destacar a lista.
- `--order`: opcional, ordem de exibição.

## Exemplo

```bash
npx ts-node prisma/create-movie-list.ts --title="Feriado Corpus Christi" --slug=feriado-corpus-christi --movies=novitiate,dark-habits,holy-camp,benedetta,the-little-hours --featured=true --order=1
```

Obs: rodar de novo com o mesmo slug atualiza os dados da lista e adiciona os filmes informados, sem remover os que já estavam lá.
