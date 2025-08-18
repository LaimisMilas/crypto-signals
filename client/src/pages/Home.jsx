import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
const stripePromise = loadStripe('pk_test_placeholder'); // replaced by Stripe when you deploy via env + proxy if needed

export default function Home(){
  const [loading, setLoading] = useState(false);
  const url = new URL(window.location.href);
  const isSuccess = !!url.searchParams.get('success');
  const isCanceled = !!url.searchParams.get('canceled');
  const [status, setStatus] = useState(isSuccess ? 'Success! Thank you for subscribing.' : (isCanceled ? 'Payment canceled.' : ''));
  const [email, setEmail] = useState('');
  const [invite, setInvite] = useState(null);

  async function subscribe(){
    try{
      setLoading(true);
      const res = await fetch('/api/checkout-session', { method: 'POST' });
      const j = await res.json();
      if (j.url) window.location.href = j.url;
      else setStatus('Failed to create checkout session.');
    }catch(e){
      console.error(e); setStatus('Network error.');
    }finally{
      setLoading(false);
    }
  }

  async function getInvite(){
    try{
      setLoading(true);
      const q = new URLSearchParams({ email });
      const res = await fetch(`/api/telegram-invite?${q.toString()}`);
      const j = await res.json();
      if (j.invite) {
        setInvite(j.invite);
        setStatus('Invite generated. Click the link below to join.');
      } else {
        setStatus(j.error || 'Invite failed');
      }
    }catch(e){
      console.error(e); setStatus('Network error.');
    }finally{
      setLoading(false);
    }
  }

  return (
      <div style={{fontFamily:'Inter, system-ui, Arial', padding:'2rem', maxWidth:900, margin:'0 auto'}}>

        {/* Header ir Hero kaip buvo */}

        <section style={{marginTop:'2rem', padding:'1.5rem', border:'1px solid #eee', borderRadius:12}}>
          <h3>Pricing</h3>
          <p><strong>€20/month</strong> – access to private Telegram signals (full details, TP/SL)</p>
          <button onClick={subscribe} disabled={loading} style={{padding:'0.8rem 1.2rem', borderRadius:10, border:'none', cursor:'pointer'}}>
            {loading ? 'Redirecting…' : 'Subscribe with Stripe'}
          </button>
          {status && <p style={{marginTop:'1rem'}}>{status}</p>}

          {isSuccess && (
              <div style={{marginTop:'1rem'}}>
                <h4>Join private Telegram</h4>
                <p>Enter the same email you used at checkout to get a one-time invite link.</p>
                <div style={{display:'flex', gap:8}}>
                  <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email"
                         style={{flex:1, padding:'0.6rem', border:'1px solid #ddd', borderRadius:8}} />
                  <button onClick={getInvite} disabled={loading || !email}
                          style={{padding:'0.6rem 1rem', borderRadius:8, border:'none', cursor:'pointer'}}>
                    {loading ? 'Generating…' : 'Get Invite'}
                  </button>
                </div>
                {invite && (
                    <p style={{marginTop:'0.8rem'}}>
                      <a href={invite} target="_blank" rel="noreferrer">Click to join private channel →</a>
                    </p>
                )}
              </div>
          )}
        </section>

        <footer style={{marginTop:'3rem', color:'#777'}}>© {new Date().getFullYear()} Crypto Signals MVP</footer>
      </div>
  )
}
