# Lokal udviklingsworkflow for DeepSeek Harness

Dette er den anbefalede workflow for den lokale Web UI med `dsh-cost-peak`.
Den vigtige detalje er, at både plugin-bundlen og runtime-profilen skal komme
fra dette checkout.

## Start den lokale UI

Åbn en ny shell og kør:

```sh
source /Users/christian/.zshrc
dsh-local --no-open
```

Åbn derefter <http://127.0.0.1:3098>.

`dsh-local` gør følgende:

1. Skifter til `/Users/christian/Documents/dev/deepseek-harness`.
2. Sætter `DSH_HOME=/Users/christian/.dsh`.
3. Bygger `dsh-cost-peak`-pluginet.
4. Starter Web UI med `--profile web` på port `3098`.

Hvis funktionen ikke findes i shellen, skal den først genindlæses med
`source /Users/christian/.zshrc`. Den nuværende funktion er defineret dér.

## Profilen skal pege på checkoutet

Kør dette én gang, hvis profilen ikke allerede har pluginet registreret:

```sh
cd /Users/christian/Documents/dev/deepseek-harness
DSH_HOME=/Users/christian/.dsh \
  pnpm dsh plugin --profile web add \
  /Users/christian/Documents/dev/deepseek-harness/packages/extensions/dsh-cost-peak
```

Kontrollér eventuelt at profilen bruger den lokale pakke:

```sh
ls -l /Users/christian/.dsh/profiles/web/node_modules/dsh-cost-peak
rg -n 'dsh-cost-peak' /Users/christian/.dsh/profiles/web/package.json
```

Undgå at starte med en nøgen `pnpm dsh --profile web`, hvis `DSH_HOME` ikke er
sat. Den kan bruge en anden profil under `.codex2/.dsh` og dermed vise en gammel
plugin-bundle, selv om kildekoden i checkoutet er opdateret.

## Når kildekoden ændres

For ændringer i `packages/extensions/dsh-cost-peak`:

```sh
cd /Users/christian/Documents/dev/deepseek-harness
pnpm --filter dsh-cost-peak bundle
```

For ændringer i klientpakker som `packages/client/ui-conversation` skal hele
builden køres, så de genererede `lib/`-filer også er opdaterede:

```sh
pnpm run build
```

Genindlæs derefter browseren. Hvis den kørende proces stadig serverer den gamle
bundle, stop den med `Ctrl-C` og start `dsh-local --no-open` igen. Plugin-moduler
indlæses ved processtart; en browser-refresh alene kan derfor ikke altid hente
en ny plugin-bundle.

## Relevante checks

Kør de målrettede tests under arbejdet:

```sh
pnpm exec vitest run \
  packages/client/ui-conversation/tests/chat-stats.client.spec.tsx \
  packages/extensions/dsh-cost-peak/tests/CostPeakHeader.spec.tsx
```

Før aflevering:

```sh
pnpm run typecheck
pnpm run build
git diff --check
git status --short --branch
```

Commit kun de tilsigtede ændringer, og kontrollér efterfølgende at checkoutet
stadig bruger samme branch og working tree som den lokale `dsh-local`-proces.
