# Backtest job specifikacija

## Paskirtis
`backtest` job paleidžia pasirinktą strategiją su duotais parametrais ir po kelių imitacinių žingsnių
sugeneruoja artefaktus analizei. Dabartinėje pavyzdinėje implementacijoje reali prekybos logika dar
neįgyvendinta – failai užpildomi minimaliu turiniu.

Generuojami artefaktai:
- `trades.csv` – sandorių sąrašas
- `stats.json` – suvestinė statistika
- (tik sename `jobRunner.js` variante) `equity.csv` – nuosavo kapitalo kreivė

## Job sukūrimas
### Analytics puslapis (`analytics.html`)
1. Vartotojas pasirenka `symbol`, `interval` ir strategiją.
2. Paspaudus „Backtest (quick)“ frontendas suformuoja JSON:
   ```json
   { "type": "backtest", "params": { ... }, "priority": 0 }
   ```
3. Užklausa `POST /jobs` įrašo darbą į `jobs` lentelę su būsena `queued`.

### Jobs puslapis (`jobs.html`)
1. Vartotojas formoje parenka tipą `backtest`, įveda parametrus ir prioritetą.
2. JavaScript `POST /jobs` siunčia tokį patį objektą kaip aukščiau.

## Vykdymas
### Worker
- Fono procesas `src/jobs/worker.js` periodiškai pasiima `queued` darbus, pažymi `running` ir
  paleidžia atitinkamą runnerį.
- Tikrinamas atšaukimo signalas, loguojamas progresas, žingsniai transliuojami per SSE.

### Runner
- `src/jobs/runners/backtest.js` vykdo 5 žingsnių ciklą, kiekviename atnaujina progresą ir logina
  `step i`.
- Baigus ciklą sukuriami artefaktai (`trades.csv`, `stats.json`) per `writeCSV` ir `writeJSON`.
- Gali būti nutrauktas jei `AbortController.signal` pažymėtas `aborted`.

### Užbaigimas
- Įvykdžius runnerį įrašomas rezultatas, statusas nustatomas į `succeeded` (arba `failed`/`canceled`).
- Artefaktai įrašomi į `job_artifacts` ir pateikiami atsisiųsti per `/jobs/:id/artifacts`.

## UI stebėjimas
- `analytics.html` periodiškai užklausia `/analytics/jobs` ir rodo būseną.
- `jobs.html` naudoja `EventSource` į `/jobs/stream` – matomas progresas ir logai.

## Pastabos
- Dabartinis `backtest` runneris yra demonstracinis; realūs skaičiavimai (strategija, PnL) turės
  pakeisti stubinius žingsnius ateityje.
