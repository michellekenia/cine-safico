# Adicionar link alternativo a um filme

Adiciona um link de streaming alternativo (Drive, YouTube, Twitter, etc.) a um filme e já conecta a plataforma correspondente.

## Comando

```bash
npx ts-node prisma/add-alternative-link.ts --slug=<slug-do-filme> --service=<nome> --link=<url> --platform=<slug-da-plataforma>
```

- `--slug`: slug do filme (aparece na URL do site).
- `--service`: nome do serviço (ex: `YouTube`, `Drive`).
- `--link`: URL do link.
- `--platform`: slug de uma plataforma já cadastrada (ex: `youtube`, `drive`, `outros`).

## Exemplo

```bash
npx ts-node prisma/add-alternative-link.ts --slug=the-sermon --service="YouTube" --link="https://www.youtube.com/watch?v=GeUW01Ufgro" --platform=youtube
```

Obs: cada execução cria um novo link — rodar o mesmo comando duas vezes duplica o registro.
