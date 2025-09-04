# Crypto Signals – Roadmap

## Vizija
Įrankis, kuris generuoja, testuoja ir rodo prekybos signalus, leidžia atlikti backtest, optimizaciją, live monitoring ir (ateityje) automatizuotą prekybą.

---

## Temos ir Statusas

### ✅ Užbaigta
- **UI Navigacija v1.2** – breadcrumbs JSON-LD, tabs prefetch, universalūs loader/skeleton.
- **Client testų CI** – jest coverage threshold, GH Actions workflow.
- **Alertmanager repeat_interval** – išaiškinta, kad vėlavimas buvo dėl konfigūracijos, sistema veikia.

### 🚧 Vyksta
- **Analytics Dashboard**
  - Testai (coverage ~92%, branches ~71%).
  - Overlay jobs (backtest/optimize/walkforward integracija).
  - Real-time equity iš DB.
- **Observability**
  - Alertmanager.yml smoke test.
  - Telegram + email notifikacijų stabilizavimas.
- **DB migracija**
  - PostgreSQL konteinerio paleidimas.
  - Jungiamumas per pgAdmin/IDE.
  - Schema.pg.sql atnaujinimas pagal kodą (trūksta laukų, indexų).

### 🕒 Laukia
- **Multi-strategy palaikymas**
  - Struktūra `strategies/*.js`, kelių strategijų portfolio demo.
- **Live monitoring išplėtimas**
  - `/live/history` route (uždaryti sandoriai iš DB).
  - Real-time grafikas + sandorių overlay.
- **Tikra trading integracija (ateities etapas)**
  - Binance API testnet (account, orders).
  - Stop Loss / Take Profit per biržą.

---

## Sekantis žingsnis
1. Užbaigti **Analytics Dashboard testus** (padengti branch coverage >80%).
2. Tęsti **DB migraciją**: sujungti schema su kodu, pridėti trūkstamus laukus ir indeksus.
3. Padaryti **Alertmanager.yml smoke test** saugų (env kintamiai, int64 chat_id).  
