import { Link, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Backtests from './pages/Backtests.jsx';

export default function App() {
  return (
    <div style={{fontFamily:'system-ui, Arial', minHeight:'100vh'}}>
      <header style={{
        display:'flex', alignItems:'center', gap:16,
        padding:'12px 16px', borderBottom:'1px solid #eee'
      }}>
        <Link to="/" style={{fontWeight:700, textDecoration:'none'}}>Home</Link>
        <Link to="/backtests" style={{textDecoration:'none'}}>Backtests</Link>
      </header>

      <main style={{padding:'16px'}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/backtests" element={<Backtests />} />
          {/* Bet koks nežinomas kelias -> į Home (arba gali nukreipti į /backtests) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
