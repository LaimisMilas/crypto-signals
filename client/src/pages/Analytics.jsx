import { useEffect, useRef, useState } from 'react';

// Paprasta D3 injekcija iš CDN be bundler importų
function useD3() {
  const d3Ref = useRef(null);
  useEffect(() => {
    if (!window.d3) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/d3@7';
      s.async = true;
      s.onload = () => { d3Ref.current = window.d3; };
      document.head.appendChild(s);
    } else {
      d3Ref.current = window.d3;
    }
  }, []);
  return () => window.d3 || d3Ref.current;
}

function Section({ title, children }) {
  return (
    <section style={{margin:'24px 0'}}>
      <h2 style={{margin:'0 0 8px'}}>{title}</h2>
      <div style={{border:'1px solid #eee', borderRadius:8, padding:12}}>
        {children}
      </div>
    </section>
  );
}

function ChartContainer({ id, height=320 }) {
  return (
    <svg id={id} style={{width:'100%', height}} />
  );
}

export default function Analytics() {
  const getD3 = useD3();

  const [bt, setBt] = useState([]);           // backtest.csv -> [{ts,equity}]
  const [opt, setOpt] = useState([]);         // optimize.csv -> array of rows
  const [wf, setWf] = useState([]);           // walkforward.csv -> rows
  const [wfAgg, setWfAgg] = useState([]);     // walkforward-agg.csv -> [{idx,equity}]

  useEffect(() => {
    // helper CSV parser
    const parseCSV = (text) => {
      const lines = text.trim().split('\n');
      if (!lines.length) return [];
      const header = lines.shift().split(',');
      return lines.map(line => {
        const cols = line.split(',');
        return Object.fromEntries(header.map((h,i)=>[h, cols[i]]));
      });
    };

    // Load backtest.csv
    fetch('/backtest.csv').then(r => r.ok ? r.text() : '')
      .then(t => {
        if (!t) return;
        const rows = parseCSV(t);
        const data = rows.map(r => ({
          ts: Number(r.ts),
          equity: Number(r.equity),
        }));
        setBt(data);
      }).catch(()=>{});

    // Load optimize.csv
    fetch('/optimize.csv').then(r => r.ok ? r.text() : '')
      .then(t => {
        if (!t) return;
        const rows = parseCSV(t).map(r => ({
          rsiBuy: +r.rsiBuy, rsiSell: +r.rsiSell, atrMult: +r.atrMult, adxMin: +r.adxMin,
          trades: +r.trades, closedTrades: +r.closedTrades, winRate: +r.winRate,
          pnl: +r.pnl, maxDrawdown: +r.maxDrawdown, score: +r.score
        }));
        setOpt(rows);
      }).catch(()=>{});

    // Load walkforward.csv + agg
    fetch('/walkforward.csv').then(r => r.ok ? r.text() : '')
      .then(t => {
        if (!t) return;
        const rows = parseCSV(t).map(r => ({
          trainStart: r.trainStart, trainEnd: r.trainEnd, testStart: r.testStart, testEnd: r.testEnd,
          rsiBuy: +r.rsiBuy, rsiSell: +r.rsiSell, atrMult: +r.atrMult, adxMin: +r.adxMin,
          trades: +r.trades, closedTrades: +r.closedTrades, winRate: +r.winRate,
          pnl: +r.pnl, maxDrawdown: +r.maxDrawdown, score: +r.score,
        }));
        setWf(rows);
      }).catch(()=>{});

    fetch('/walkforward-agg.csv').then(r => r.ok ? r.text() : '')
      .then(t => {
        if (!t) return;
        const rows = parseCSV(t).map(r => ({ idx: +r.idx, equity: +r.equity }));
        setWfAgg(rows);
      }).catch(()=>{});
  }, []);

  // draw charts after data + d3 loaded
  useEffect(() => {
    const d3 = getD3();
    if (!d3) return;

    // Equity (bt)
    if (bt.length) {
      const svg = d3.select('#ch-equity'); svg.selectAll('*').remove();
      const w = svg.node().clientWidth, h = svg.node().clientHeight;
      const m = {top:20,right:20,bottom:30,left:50};
      const iw = w - m.left - m.right, ih = h - m.top - m.bottom;

      const x = d3.scaleUtc()
        .domain(d3.extent(bt, d => new Date(d.ts)))
        .range([0, iw]);

      const y = d3.scaleLinear()
        .domain(d3.extent(bt, d => d.equity)).nice()
        .range([ih, 0]);

      const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x));
      g.append('g').call(d3.axisLeft(y));

      const line = d3.line()
        .x(d => x(new Date(d.ts)))
        .y(d => y(d.equity));

      g.append('path')
        .datum(bt)
        .attr('fill','none')
        .attr('stroke','#1976d2')
        .attr('stroke-width',2)
        .attr('d', line);
    }

    // Optimization (opt) – paprasta „heatmap-like“ lentelė pagal score
    if (opt.length) {
      const container = document.getElementById('opt-table');
      container.innerHTML = '';
      const table = document.createElement('table');
      table.style.borderCollapse = 'collapse';
      table.style.width = '100%';

      const headers = ['rsiBuy','rsiSell','atrMult','adxMin','trades','closedTrades','winRate','pnl','maxDrawdown','score'];
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        th.style.textAlign = 'left';
        th.style.borderBottom = '1px solid #ddd';
        th.style.padding = '6px';
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);

      const maxScore = d3.max(opt, d => d.score)||1;
      const minScore = d3.min(opt, d => d.score)||0;

      const tbody = document.createElement('tbody');
      opt
        .slice()
        .sort((a,b)=>b.score-a.score)
        .forEach(row => {
          const tr = document.createElement('tr');
          headers.forEach(h => {
            const td = document.createElement('td');
            const val = row[h];
            td.textContent = typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(2)) : val;
            td.style.padding = '6px';
            td.style.borderBottom = '1px solid #f5f5f5';
            if (h === 'score') {
              const t = (val - minScore) / (maxScore - minScore || 1);
              // žalios intensyvumas pagal score
              td.style.background = `rgba(76,175,80,${0.15 + 0.5*t})`;
            }
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
      table.appendChild(tbody);
      container.appendChild(table);
    }

    // Walk-forward charts
    if (wf.length) {
      // bars of pnl
      const svg = d3.select('#ch-wf-bars'); svg.selectAll('*').remove();
      const w = svg.node().clientWidth, h = svg.node().clientHeight;
      const m = {top:20,right:20,bottom:30,left:50};
      const iw = w - m.left - m.right, ih = h - m.top - m.bottom;

      const data = wf.map((r,i)=>({ idx: i+1, pnl: r.pnl }));
      const x = d3.scaleBand().domain(data.map(d=>d.idx)).range([0, iw]).padding(0.2);
      const y = d3.scaleLinear().domain([d3.min(data,d=>d.pnl), d3.max(data,d=>d.pnl)]).nice().range([ih,0]);

      const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x));
      g.append('g').call(d3.axisLeft(y));

      g.selectAll('rect').data(data).enter().append('rect')
        .attr('x', d=>x(d.idx))
        .attr('y', d=>y(Math.max(0,d.pnl)))
        .attr('width', x.bandwidth())
        .attr('height', d=>Math.abs(y(d.pnl)-y(0)))
        .attr('fill', d=>d.pnl>=0 ? '#4caf50' : '#f44336');
    }

    if (wfAgg.length) {
      // aggregated equity line
      const svg = d3.select('#ch-wf-line'); svg.selectAll('*').remove();
      const w = svg.node().clientWidth, h = svg.node().clientHeight;
      const m = {top:20,right:20,bottom:30,left:50};
      const iw = w - m.left - m.right, ih = h - m.top - m.bottom;

      const x = d3.scaleLinear().domain([1, d3.max(wfAgg, d=>d.idx)]).range([0, iw]);
      const y = d3.scaleLinear().domain(d3.extent(wfAgg, d=>d.equity)).nice().range([ih,0]);

      const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
      g.append('g').attr('transform', `translate(0,${ih})`).call(d3.axisBottom(x));
      g.append('g').call(d3.axisLeft(y));

      const line = d3.line().x(d=>x(d.idx)).y(d=>y(d.equity));
      g.append('path')
        .datum(wfAgg)
        .attr('fill','none')
        .attr('stroke','#2196f3')
        .attr('stroke-width',2)
        .attr('d', line);
    }
  }, [bt, opt, wf, wfAgg, getD3]);

  return (
    <div style={{padding:'16px', maxWidth:1200, margin:'0 auto', fontFamily:'system-ui, Arial'}}>
      <h1>Analytics</h1>

      <Section title="Backtest Equity (from backtest.csv)">
        <ChartContainer id="ch-equity" />
        {!bt.length && <div style={{color:'#777', marginTop:8}}>Nerasta backtest.csv – paleisk <code>npm run bt</code>.</div>}
      </Section>

      <Section title="Optimization Results (from optimize.csv)">
        <div id="opt-table" />
        {!opt.length && <div style={{color:'#777', marginTop:8}}>Nerasta optimize.csv – paleisk <code>npm run opt -- &lt;start&gt; &lt;end&gt;</code>.</div>}
      </Section>

      <Section title="Walk-Forward (from walkforward.csv / walkforward-agg.csv)">
        <ChartContainer id="ch-wf-bars" />
        <div style={{height:12}} />
        <ChartContainer id="ch-wf-line" />
        {(!wf.length || !wfAgg.length) && (
          <div style={{color:'#777', marginTop:8}}>
            Nerasta WF failų – paleisk:
            <div><code>node scripts/walkforward.js 2024-01-01 2024-07-01 --train 60 --test 30</code></div>
            <div><code>npm run wf:summary</code></div>
          </div>
        )}
      </Section>
    </div>
  );
}

