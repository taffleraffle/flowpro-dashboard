'use client';

import { useState, useTransition } from 'react';
import { sendBookingLink } from '@/lib/send-link-action';

export function SendBookingLink() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'booking' | 'quote'>('booking');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!phone.trim()) return;
    setMsg(null);
    start(async () => {
      try {
        const r = await sendBookingLink({ phone, name, type });
        setMsg({ ok: r.ok, text: r.message });
        if (r.ok) { setPhone(''); setName(''); }
      } catch {
        setMsg({ ok: false, text: 'Something went wrong sending the text. Please try again.' });
      }
    });
  }

  const input: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)',
    borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', width: '100%',
  };

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Send booking link</div>
          <h3 className="card-title">Text a customer the booking form</h3>
          <div className="card-sub">
            Enter their mobile and we’ll send a link to the online form. Send the quote version if
            they’re only after a price: it opens with no call-out fee attached.
          </div>
        </div>
      </div>
      <div className="card-b">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 150px' }}>
            <div className="tiny muted" style={{ marginBottom: 4 }}>Send them</div>
            <select
              style={input}
              value={type}
              onChange={(e) => setType(e.target.value as 'booking' | 'quote')}
            >
              <option value="booking">Booking form</option>
              <option value="quote">Quote request form</option>
            </select>
          </label>
          <label style={{ flex: '1 1 160px' }}>
            <div className="tiny muted" style={{ marginBottom: 4 }}>First name (optional)</div>
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah" />
          </label>
          <label style={{ flex: '1 1 180px' }}>
            <div className="tiny muted" style={{ marginBottom: 4 }}>Mobile number</div>
            <input
              style={input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="021 234 5678"
              inputMode="tel"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending || !phone.trim()}
            onClick={submit}
            style={{ flex: '0 0 auto', minWidth: 130 }}
          >
            {pending ? 'Sending…' : 'Send link'}
          </button>
        </div>
        {msg && (
          <div className={`badge ${msg.ok ? 'green' : 'red'}`} style={{ display: 'inline-block', marginTop: 12, padding: '6px 10px', fontSize: 12 }}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
