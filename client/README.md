# Frontend klientas

Šiame kataloge yra paprasta React naudotojo sąsaja, kurią generuoja Vite.

## Komponentai
- **`App.jsx`** – apibrėžia viršutinės navigacijos juostą ir maršrutizavimo logiką.
- **`main.jsx`** – įkelia `App` į DOM, apgaubdamas `BrowserRouter`.
- **`pages/Home.jsx`** – prenumeratos ir Telegram kvietimo puslapis.
- **`pages/Backtests.jsx`** – rodo `walkforward.csv` ir suvestinės duomenis apie testus.
- **`pages/Analytics.jsx`** – krauna įvairius CSV rezultatus ir generuoja grafikus su D3.

## Maršrutai
Maršrutizavimui naudojamas `react-router-dom`.

| Kelias        | Komponentas         | Paskirtis |
|--------------|--------------------|-----------|
| `/`          | `Home`             | Pradinė informacija ir Stripe prenumerata. |
| `/backtests` | `Backtests`        | Atvaizduoja atgalinių testų rezultatus. |
| `/analytics` | `Analytics`        | Parodo analitinius grafikus iš CSV failų. |

## State management
Šiuo metu globali būsena nenaudojama. Komponentai naudoja React `useState` ir `useEffect`
vietinei būsenai. Jei ateityje prireiks bendros būsenos, galima integruoti biblioteką
kaip `Zustand` arba `Redux`.
