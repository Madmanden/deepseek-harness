# Lokal udviklingsworkflow for DeepSeek Harness

Dette er den anbefalede workflow for den lokale Web UI med `dsh-cost-peak`. Den vigtige detalje er, at både plugin-bundlen og runtime-profilen skal komme fra dette checkout.

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
3. Kører en komplet initial build.
4. Starter `pnpm run dev:web`, som watcher alle klientbundles med polling.
5. Starter Web UI med `--profile web` på port `3098`.

Det er kombinationen af `pnpm run dev:web` og `dsh web`, der giver live
opdateringer. Watcheren skriver nye bundles, mens Web UI'ens HMR-modtager
opdager dem og genindlæser det berørte plugin i den åbne browser.

Hvis funktionen ikke findes i shellen, skal den først genindlæses med `source /Users/christian/.zshrc`. Den nuværende funktion er defineret dér.

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

Undgå at starte med en nøgen `pnpm dsh --profile web`, hvis `DSH_HOME` ikke er sat. Den kan bruge en anden profil under `.codex2/.dsh` og dermed vise en gammel plugin-bundle, selv om kildekoden i checkoutet er opdateret.

## Når kildekoden ændres

Med `dsh-local` kørende skal du normalt kun gemme filen. Watcheren bygger den ændrede bundle, og HMR opdaterer siden. Browseren behøver kun en manuel refresh, hvis en ændring påvirker shellens statiske Web-build eller hvis HMR rapporterer en fejl.

Hvis processerne startes manuelt i to shells, kør først dette fra repo-roden:

```sh
pnpm run build
pnpm run dev:web
```

Start derefter i en anden shell:

```sh
source /Users/christian/.zshrc
DSH_HOME=/Users/christian/.dsh pnpm dsh --profile web --port 3098 --no-open
```

Stop begge processer med `Ctrl-C`. Kør ikke `pnpm run build` samtidig med `pnpm run dev:web`, da de skriver til de samme `lib/`- og `dist/`-mapper.

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

Commit kun de tilsigtede ændringer, og kontrollér efterfølgende at checkoutet stadig bruger samme branch og working tree som den lokale `dsh-local`-proces.

## Hent nyeste Harness uden at miste pluginet

`origin` er vores fork (`Madmanden/deepseek-harness`), mens `upstream` er det officielle repository (`deepseek-ai/deepseek-harness`). Pluginet er committed i vores fork under `packages/extensions/dsh-cost-peak` og bliver derfor normalt bevaret ved en upstream-merge.

Opdatér lokalt:

```sh
cd /Users/christian/Documents/dev/deepseek-harness
git fetch upstream
git switch master
git merge upstream/master
pnpm install
pnpm run build
git push origin master
```

Hvis upstream har ændret de samme UI-filer som pluginet eller footer-tilpasningen, stopper merge med en konflikt. Løs konflikten, kør tests og build, og afslut derefter med `git add ...`, `git commit` og `git push origin master`. Pluginet bliver ikke automatisk overskrevet af filer, som upstream ikke ændrer.

Efter en opdatering startes live-workflowet igen med `dsh-local --no-open`. Den lokale profil under `$DSH_HOME` peger på checkoutet og bygger derfor den version af Harness, der nu ligger i vores fork, sammen med pluginet.
