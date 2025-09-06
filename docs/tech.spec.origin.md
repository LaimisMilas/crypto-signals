# Crypto Signals MVP – Projekto specifikacija

## 🎯 Pagrindinė idėja
Sukurti įrankį, kuris generuoja, testuoja ir rodo prekybos signalus, o vėliau leidžia automatizuotai prekiauti.  
Trumpai: **viena sistema signalams → testavimui → vizualizacijai → automatinei prekybai**.

---

## 🔑 Esminiai elementai

### 1. Signalų generavimas
- Indikatoriai: RSI, ATR, Aroon, Bollinger Bands.
- Trend analizė: HH/LL struktūra, palaikymo/pasipriešinimo lygiai.
- Pattern atpažinimas (candlestick, bullish/bearish formacijos).
- AI modeliai (ML/DL prognozės).

### 2. Backtest + optimizacija
- Strategijų testavimas su istoriniais duomenimis.
- Parametrų tuningas (automatizuotas grid / random search).
- Walk-forward testai.

### 3. Live monitoring (paper trading)
- Realių rinkos duomenų srautai (pvz., Binance, RevolutX).
- Sandorių simuliacija be rizikos kapitalo.
- Signalų validacija „gyvai“.

### 4. Analytics dashboard
- Equity kreivė (balanso kitimo grafikas).
- P&L (pelno ir nuostolio analizė).
- Sandorių lentelė (atviri/uždaryti).
- Multi-strategy palaikymas (portfeliai).

### 5. Automatinė prekyba (ateitis)
- Integracija su biržomis (Binance, RevolutX).
- Stop Loss / Take Profit, trailing stop.
- Rizikos valdymas (max drawdown, capital allocation).

### 6. SaaS kelias
- Stripe prenumeratos.
- Telegram VIP signalų integracija.
- Cloud deployment (Docker, Kubernetes, GCP/AWS).

---

## 🧭 Vizijos kompasas
Prie kiekvieno žingsnio klausiame:
1. Ar tai pagerina signalų generavimą, testavimą ar automatizavimą?
2. Ar tai priartina prie realaus produkto, kurį gali naudoti vartotojas?
3. Ar tai paprasta naudoti ir suprasti (UI, Telegram, dashboard)?
4. Ar tai saugo projekto vientisumą (nedarome per daug šalutinių eksperimentų)?

---

## 📅 Roadmap (supaprastintas)
1. **MVP signalų generavimas** (RSI, ATR, trendai, pattern’ai).
2. **Backtest + optimizacija modulis**.
3. **Analytics dashboard (equity, P&L, trades)**.
4. **Live monitoring / paper trading**.
5. **Automatinė prekyba** (biržų integracija, TP/SL).
6. **SaaS** (Stripe, Telegram, cloud).

---

## 📂 Tech stack
- **Backend**: Node.js, Express.js
- **Frontend**: React.js, Chart.js
- **DB**: PostgreSQL (vėliau GCP SQL), SQLite (lokalūs servisai)
- **Infra**: Docker, Docker Compose, Cloud deployment
- **Integracijos**: Stripe, Telegram, Binance/RevolutX API  
