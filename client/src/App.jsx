import { Link, Routes, Route, Navigate } from 'react-router-dom';
import Backtests from './pages/Backtests.jsx';
import Analytics from './pages/Analytics.jsx';

function Home() {
  return (
    <div style={{padding:16}}>
      <h1>Crypto Signals</h1>
      <p>Sveikas! Pasirink puslapį viršuje.</p>
    </div>
  );
}

export default function App() {
  const linkStyle = { textDecoration:'none', padding:'6px 8px', borderRadius:6 };
  const navStyle = { display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:'1px solid #eee' };

  return (
    <div style={{fontFamily:'system-ui, Arial', minHeight:'100vh'}}>
      <header style={navStyle}>
        <Link to="/" style={{...linkStyle, fontWeight:700}}>Home</Link>
        <Link to="/backtests" style={linkStyle}>Backtests</Link>
        <Link to="/analytics" style={linkStyle}>Analytics</Link>
      </header>

      <main style={{padding:'16px'}}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/backtests" element={<Backtests />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

