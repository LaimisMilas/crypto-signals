# Live modulio specifikacija

## Live Web UI

**Puslapio pasiekimas**
- Atskiras HTML puslapis `client/public/live.html`, pasiekiamas per "Live" meniu nuorodą.
- Naudoja tabuliuotą išdėstymą ir automatiškai užkrauna modulius (navigation, breadcrumbs, tabs, lazy loader).

**Skirtukai ir funkcijos**
1. **Equity** – realaus laiko nuosavybės grafikas iš `GET /live/equity-stream` (SSE) su Chart.js; status juostoje rodomas trace ID.
2. **History** – lentelė su uždarytų sandorių istorija iš `GET /live/history`.
3. **Orders** – paskutinių pavedimų (iki 50) sąrašas, srautiniu būdu gaunamas iš `/live/orders-stream`.
4. **Risk** – dabartinė rizikos konfigūracija ir suvestinės, gaunamos iš `/live/risk`.

**Naudojimo eiga**
1. Atidarykite `http://<server>/live`.
2. Keiskite skirtukus; kiekvienas užkrauna savo modulį ir atnaujina duomenis.
3. Stebėkite grafikus ir lenteles; nutrūkus srautui puslapį galima perkrauti.

## Gyvo prekybos modulio (`src/live.js`) paskirtis
- Valdo popierinius sandorius su rizikos valdymu.
- Kas minutę analizuoja `candles` duomenis, generuoja signalus ir atidaro/uždaro pozicijas pagal konfigūraciją.

## Konfigūracija
- `CFG_DEFAULTS` apima TP, SL, trailing stop, rizikos procentą, maksimalų sandorių skaičių ir kt.
- `getLiveConfig` skaito `config/params.json`, sujungia su numatytaisiais nustatymais.
- `setLiveConfig` atnaujina konfigūraciją, priima tik validžius parametrus.

## Pagrindinė logika
- DB pagalbinės funkcijos tvarko lenteles `paper_state`, `paper_trades` ir `candles`.
- `openPosition` / `closePosition` įrašo sandorius, siunčia Telegram perspėjimus, fiksuoja metriką.
- `applyRiskAndStops` taiko TP/SL/trailing ir prireikus uždaro pozicijas.
- `step` funkcija: 
  1. Perskaito naujausias žvakes (iki 500).
  2. Generuoja signalus su EMA strategija.
  3. Apskaičiuoja pozicijos dydį pagal rizikos procentą ir SL.
  4. Atidaro ar uždaro pozicijas.
  5. Atnaujina `client/public/live-metrics.json` su metrika ir atviromis pozicijomis.

## API ir naudojimas
### Programinis
- `startLive`, `stopLive`, `resetLive`, `getLiveState` valdo ciklą ir leidžia gauti būseną.
- `startBackground` / `stopBackground` paleidžia arba sustabdo modulį fone.

### HTTP
- `GET /live` – grąžina metriką ir atviras pozicijas.
- `POST /live/start` – startuoja ciklą.
- `POST /live/stop` – stabdo ciklą.
- `DELETE /live/trades` – išvalo sandorius ir resetina būseną.
- `GET`/`POST /live/config` – gauna arba atnaujina konfigūraciją.

## Naudojimo žingsniai
1. Konfigūruokite parametrus per `setLiveConfig` arba `POST /live/config`.
2. Paleiskite gyvą režimą (`startLive` arba `POST /live/start`).
3. Stebėkite `GET /live` arba `client/public/live-metrics.json` nuosavybės, PnL ir pozicijų informacijai.

Modulis orientuotas į popierinį testavimą, tačiau pritaikomas realiam vykdymui pakeitus duomenų šaltinius ir vykdymo logiką.

