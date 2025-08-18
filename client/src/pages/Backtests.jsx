import { useEffect, useState } from 'react';

export default function Backtests() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetch('/walkforward-summary.json').then(r=>r.ok?r.json():null).then(setSummary).catch(()=>{});
    fetch('/walkforward.csv')
      .then(r=>r.text())
      .then(t => {
        const lines = t.trim().split('\n');
        const header = lines.shift().split(',');
        const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
        const out = lines.map(line => {
          const c = line.split(',');
          return {
            trainStart: c[idx.trainStart],
            trainEnd: c[idx.trainEnd],
            testStart: c[idx.testStart],
            testEnd: c[idx.testEnd],
            rsiBuy: c[idx.rsiBuy],
            rsiSell: c[idx.rsiSell],
            atrMult: c[idx.atrMult],
            adxMin: c[idx.adxMin],
            trades: c[idx.trades],
            closedTrades: c[idx.closedTrades],
            winRate: c[idx.winRate],
            pnl: c[idx.pnl],
            maxDrawdown: c[idx.maxDrawdown],
            score: c[idx.score],
          };
        });
        setRows(out);
      })
      .catch(()=>{});
  }, []);

  return (
    <div style={{padding:'16px', maxWidth: 1200, margin: '0 auto', fontFamily:'system-ui, Arial'}}>
      <h1>Backtests</h1>

      {summary && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, margin:'12px 0'}}>
          <Card title="Folds" value={summary.folds}/>
          <Card title="Avg PnL" value={summary.avgPnL}/>
          <Card title="Avg WinRate (%)" value={summary.avgWinRate}/>
          <Card title="Avg MaxDD" value={summary.avgMaxDD}/>
        </div>
      )}

      <div style={{margin:'12px 0'}}>
        <a href="/wf.html" target="_blank" rel="noreferrer">
          <button style={{padding:'8px 12px'}}>Atidaryti grafikus</button>
        </a>
      </div>

      <div style={{overflowX:'auto'}}>
        <table cellPadding="6" cellSpacing="0" style={{borderCollapse:'collapse', width:'100%'}}>
          <thead>
            <tr>
              {['trainStart','trainEnd','testStart','testEnd','rsiBuy','rsiSell','atrMult','adxMin','trades','closedTrades','winRate','pnl','maxDrawdown','score'].map(h=>(
                <th key={h} style={{borderBottom:'1px solid #ddd', textAlign:'left'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #f0f0f0'}}>
                <td>{r.trainStart}</td><td>{r.trainEnd}</td><td>{r.testStart}</td><td>{r.testEnd}</td>
                <td>{r.rsiBuy}</td><td>{r.rsiSell}</td><td>{r.atrMult}</td><td>{r.adxMin}</td>
                <td>{r.trades}</td><td>{r.closedTrades}</td><td>{r.winRate}</td><td>{r.pnl}</td><td>{r.maxDrawdown}</td><td>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({title, value}) {
  return (
    <div style={{padding:12, border:'1px solid #eee', borderRadius:8, boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
      <div style={{fontSize:12, color:'#666'}}>{title}</div>
      <div style={{fontSize:20, fontWeight:700}}>{value}</div>
    </div>
  );
}
