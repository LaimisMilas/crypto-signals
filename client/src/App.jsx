import React, { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe('pk_test_placeholder') // replaced by Stripe when you deploy via env + proxy if needed

export default function App(){
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('success')) return 'Success! Thank you for subscribing.'
    if (url.searchParams.get('canceled')) return 'Payment canceled.'
    return ''
  })

  async function subscribe(){
    try{
      setLoading(true)
      const res = await fetch('/api/checkout-session', { method: 'POST' })
      const j = await res.json()
      if (j.url) {
        window.location.href = j.url
        return
      }
      setStatus('Failed to create checkout session.')
    }catch(e){
      console.error(e)
      setStatus('Network error.')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div style={{fontFamily:'Inter, system-ui, Arial', padding:'2rem', maxWidth:900, margin:'0 auto'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>Crypto Signals</h1>
        <a href="https://t.me/" target="_blank">Telegram</a>
      </header>
      <section style={{marginTop:'2rem'}}>
        <h2>Real-time crypto signals</h2>
        <ul>
          <li>Strategy: Trend + RSI14 + ATR TP/SL + Engulfing patterns</li>
          <li>Symbols: configurable (default SOL/USDT)</li>
          <li>Delivery: Telegram public + private channel</li>
        </ul>
      </section>
      <section style={{marginTop:'2rem', padding:'1.5rem', border:'1px solid #eee', borderRadius:12}}>
        <h3>Pricing</h3>
        <p><strong>€20/month</strong> – access to private Telegram signals (full details, TP/SL)</p>
        <button onClick={subscribe} disabled={loading} style={{padding:'0.8rem 1.2rem', borderRadius:10, border:'none', cursor:'pointer'}}>
          {loading ? 'Redirecting…' : 'Subscribe with Stripe'}
        </button>
        {status && <p style={{marginTop:'1rem'}}>{status}</p>}
      </section>
      <footer style={{marginTop:'3rem', color:'#777'}}>© {new Date().getFullYear()} Crypto Signals MVP</footer>
    </div>
  )
}
