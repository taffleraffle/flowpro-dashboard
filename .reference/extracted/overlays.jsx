// === Interactive overlays: drawers, popups, toasts, tooltips ===
const D = window.FLOWPRO_DATA;
const E = window.FLOWPRO_DATA_EXT;

// === Global UI state with simple event bus ===
window.UI = (function() {
  const listeners = new Set();
  let state = { drawer: null, toast: null, popup: null };
  function set(patch) {
    state = { ...state, ...patch };
    listeners.forEach(l => l(state));
  }
  function get() { return state; }
  function sub(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  return {
    openJob:      (id) => set({ drawer: { kind: 'job', id } }),
    openCustomer: (id) => set({ drawer: { kind: 'customer', id } }),
    openQuote:    (id) => set({ drawer: { kind: 'quote', id } }),
    openNotifs:   () => set({ popup: 'notifs' }),
    closeAll:     () => set({ drawer: null, popup: null }),
    toast:        (msg) => { set({ toast: msg }); setTimeout(() => set({ toast: null }), 2400); },
    get, sub,
  };
})();

function useUI() {
  const [s, setS] = useState(window.UI.get());
  useEffect(() => window.UI.sub(setS), []);
  return s;
}

// === Drawer shell ===
function Drawer({ open, onClose, children, width = 560 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`drawer ${open ? 'open' : ''}`} style={{ width }}>
        {open && children}
      </aside>
    </>
  );
}

// === Job detail drawer ===
function JobDetailDrawer({ jobId }) {
  // Find job
  let job = null;
  let stage = null;
  Object.entries(D.pipeline).forEach(([s, jobs]) => {
    const found = jobs.find(j => j.id === jobId);
    if (found) { job = found; stage = s; }
  });
  if (!job) return <div style={{padding:20}}>Job not found</div>;

  const techColors = { MP:'#1BA8D4', JK:'#0D3556', ST:'#7DD3E8', LF:'#E8A93C', HW:'#134268', AT:'#15A36A' };
  const techMap = { Plumbing:'ST', Gasfitting:'JK', 'Hot Water':'AT', Commercial:'MP', Drainage:'HW', Emergency:'MP' };
  const tech = techMap[job.type] || 'MP';

  // timeline
  const events = [
    { t: '2h ago', label: 'Customer called', detail: '0980 249 84 · spoke with Pete', icon: 'phone' },
    { t: '1h 52m', label: 'Quote drafted', detail: `${job.type} · $${job.price}`, icon: 'receipt' },
    { t: '1h 45m', label: 'Quote sent to customer', detail: 'Via email', icon: 'check' },
    { t: '38m ago', label: 'Customer accepted', detail: 'Booked for tomorrow 9am', icon: 'check' },
    { t: '30m ago', label: 'Assigned to ' + tech, detail: 'Tech notified, materials check OK', icon: 'user' },
  ];

  return (
    <div className="drawer-body">
      <div className="drawer-h">
        <div>
          <div className="stack-h" style={{marginBottom:6}}>
            <span className="tiny muted num">{job.id}</span>
            <span className={`badge ${{ inquiry: 'navy', quoted: 'cyan', scheduled: 'cyan', onsite: 'amber', invoiced: 'navy', paid: 'green' }[stage]}`}>{stage.toUpperCase()}</span>
            <span className={`badge ${{high:'red',med:'amber',low:'navy'}[job.urgency]}`}>{job.urgency.toUpperCase()}</span>
          </div>
          <h2 className="display" style={{fontSize:24, margin:0, lineHeight:1.1}}>{job.title}</h2>
          <div className="card-sub" style={{marginTop:4}}>{job.type} · {job.suburb}</div>
        </div>
        <button className="iconbtn-close" onClick={() => window.UI.closeAll()}><Icon name="x" size={16}/></button>
      </div>

      <div className="drawer-section">
        <div className="row cols-3" style={{gap:12}}>
          <div className="kpi" style={{minHeight:90}}>
            <div className="kpi-label"><span>Job value</span></div>
            <div className="kpi-value display num" style={{fontSize:26}}>${job.price.toLocaleString()}</div>
          </div>
          <div className="kpi" style={{minHeight:90}}>
            <div className="kpi-label"><span>Margin (est.)</span></div>
            <div className="kpi-value display num" style={{fontSize:26}}>32%</div>
          </div>
          <div className="kpi" style={{minHeight:90}}>
            <div className="kpi-label"><span>Distance</span></div>
            <div className="kpi-value display num" style={{fontSize:26}}>{(D.suburbs.find(s=>s.name===job.suburb)?.distKm || 8).toFixed(1)}<span className="unit">km</span></div>
          </div>
        </div>
      </div>

      <div className="drawer-section">
        <div className="eyebrow">Customer</div>
        <div className="stack-h" style={{marginTop:8}}>
          <div className="av l" style={{background:'var(--cyan-600)'}}>{job.customer.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:15}}>{job.customer}</div>
            <div className="tiny muted">Residential · {job.suburb}</div>
          </div>
          <button className="btn"><Icon name="phone" size={12}/>Call</button>
          <button className="btn"><Icon name="user" size={12}/>Profile</button>
        </div>
      </div>

      <div className="drawer-section">
        <div className="eyebrow">Assigned tech</div>
        <div className="stack-h" style={{marginTop:8}}>
          <div className="av l" style={{background:techColors[tech]}}>{tech}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:15}}>{({MP:'Mark Pearse',JK:'Jaden Komene',ST:'Sione Tupou',LF:'Liam Foster',HW:'Hemi Williams',AT:'Aroha Tane'})[tech]}</div>
            <div className="tiny muted">ETA: <b>{job.age}</b> · Van FLP-00{['MP','JK','ST','AT','LF','HW'].indexOf(tech)+1}</div>
          </div>
          <button className="btn">Reassign</button>
        </div>
      </div>

      <div className="drawer-section">
        <div className="eyebrow">Activity timeline</div>
        <div className="timeline" style={{marginTop:10}}>
          {events.map((e, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-dot"><Icon name={e.icon} size={11}/></div>
              <div>
                <div style={{fontWeight:600, fontSize:13}}>{e.label}</div>
                <div className="tiny muted">{e.detail}</div>
              </div>
              <div className="tiny muted">{e.t}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="drawer-section">
        <div className="eyebrow">Notes</div>
        <textarea placeholder="Add a job note…" rows="3" style={{
          width:'100%', padding:10, border:'1px solid var(--border)',
          borderRadius:8, fontFamily:'inherit', fontSize:13, resize:'vertical', marginTop:6
        }}></textarea>
      </div>

      <div className="drawer-foot">
        <button className="btn" onClick={() => { window.UI.closeAll(); window.UI.toast('Job ' + job.id + ' updated'); }}>Mark complete</button>
        <button className="btn btn-primary" onClick={() => { window.UI.closeAll(); window.UI.toast('Invoice sent'); }}>Send invoice</button>
      </div>
    </div>
  );
}

// === Customer detail drawer ===
function CustomerDetailDrawer({ customerId }) {
  const c = E.customers.find(x => x.id === customerId);
  if (!c) return <div style={{padding:20}}>Customer not found</div>;

  return (
    <div className="drawer-body">
      <div className="drawer-h">
        <div>
          <div className="stack-h" style={{marginBottom:6}}>
            <span className="tiny muted num">{c.id}</span>
            <span className="badge navy">{c.type}</span>
            {c.status==='vip' && <span className="badge solid-cyan">VIP</span>}
          </div>
          <h2 className="display" style={{fontSize:24, margin:0, lineHeight:1.1}}>{c.name}</h2>
          <div className="card-sub" style={{marginTop:4}}>{c.suburb} · customer since {c.since}</div>
        </div>
        <button className="iconbtn-close" onClick={() => window.UI.closeAll()}><Icon name="x" size={16}/></button>
      </div>

      <div className="drawer-section">
        <div className="row cols-3" style={{gap:12}}>
          <div className="kpi" style={{minHeight:90}}>
            <div className="kpi-label"><span>Lifetime $</span></div>
            <div className="kpi-value display num" style={{fontSize:26}}>${(c.lifetimeValue/1000).toFixed(1)}k</div>
          </div>
          <div className="kpi" style={{minHeight:90}}>
            <div className="kpi-label"><span>Jobs</span></div>
            <div className="kpi-value display num" style={{fontSize:26}}>{c.jobs}</div>
          </div>
          <div className="kpi" style={{minHeight:90}}>
            <div className="kpi-label"><span>Avg rating</span></div>
            <div className="kpi-value display num" style={{fontSize:26}}>{c.avgRating ? c.avgRating.toFixed(1) : '—'}</div>
            {c.avgRating && <Stars value={c.avgRating} size={11}/>}
          </div>
        </div>
      </div>

      <div className="drawer-section">
        <div className="eyebrow">Source</div>
        <div className="stack-h" style={{marginTop:8}}>
          <span className="badge cyan">{c.source}</span>
          <span className="tiny muted">Last job: {c.lastJob}</span>
        </div>
      </div>

      <div className="drawer-section">
        <div className="eyebrow">Recent jobs</div>
        <div className="stack-v" style={{gap:8, marginTop:8}}>
          {Array.from({length:Math.min(c.jobs,4)},(_,i)=>({
            id: 'J-1' + (700 + i*7),
            title: ['HW cylinder replace','Tap repair','Drain unblock','Burst pipe'][i%4],
            date: ['Today','2 weeks ago','3 months ago','6 months ago'][i],
            value: 240 + i*340,
          })).map(j => (
            <div key={j.id} style={{display:'flex',justifyContent:'space-between', padding:'8px 10px', background:'var(--surface-2)', borderRadius:6}}>
              <div>
                <div style={{fontWeight:600, fontSize:13}}>{j.title}</div>
                <div className="tiny muted">{j.id} · {j.date}</div>
              </div>
              <div className="num" style={{fontWeight:700}}>${j.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="drawer-foot">
        <button className="btn"><Icon name="phone" size={12}/>Call</button>
        <button className="btn"><Icon name="receipt" size={12}/>New quote</button>
        <button className="btn btn-primary"><Icon name="plus" size={12}/>New job</button>
      </div>
    </div>
  );
}

// === Notifications popup ===
function NotificationsPopup() {
  const items = [
    { type: 'urgent', text: 'Emergency burst pipe — Mrs. Karaitiana, Orewa', when: '12m ago', icon: 'alert' },
    { type: 'info',   text: 'KFC Albany invoice 60+ days overdue ($2,240)', when: '2h ago', icon: 'cash' },
    { type: 'good',   text: 'New 5★ review from Sarah M.', when: '5h ago', icon: 'star' },
    { type: 'info',   text: 'Aroha Tane completed 5 jobs today', when: '6h ago', icon: 'check' },
    { type: 'urgent', text: 'WOF expires in 30 days · FLP-004', when: '1d ago', icon: 'truck' },
    { type: 'info',   text: 'Google Ads budget 80% used', when: '1d ago', icon: 'trend' },
  ];
  const tint = { urgent: '#D14543', info: '#1BA8D4', good: '#15A36A' };
  return (
    <div className="popup popup-notifs">
      <div className="popup-h">
        <div style={{fontWeight:700, fontSize:14}}>Notifications</div>
        <button className="tiny" style={{border:0, background:'transparent', color:'var(--cyan-700)', fontWeight:600, cursor:'pointer'}}>Mark all read</button>
      </div>
      <div className="popup-list">
        {items.map((it,i) => (
          <div key={i} className="popup-item">
            <div className="popup-ic" style={{background: tint[it.type] + '22', color: tint[it.type]}}>
              <Icon name={it.icon} size={14}/>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:13, lineHeight:1.35}}>{it.text}</div>
              <div className="tiny muted" style={{marginTop:2}}>{it.when}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="popup-f"><a href="#" style={{color:'var(--cyan-700)', fontSize:12, fontWeight:600}}>See all activity →</a></div>
    </div>
  );
}

// === Toast ===
function Toast({ message }) {
  return <div className="toast">{message}</div>;
}

// === Overlay root ===
function OverlayRoot() {
  const ui = useUI();
  const close = () => window.UI.closeAll();

  // Wire row click delegation
  useEffect(() => {
    const onClick = (e) => {
      const jobRow = e.target.closest('[data-job-id]');
      const custRow = e.target.closest('[data-customer-id]');
      const pipeCard = e.target.closest('.pipe-card');
      if (pipeCard) {
        const id = pipeCard.querySelector('.tiny.muted')?.textContent?.trim();
        if (id) window.UI.openJob(id);
        return;
      }
      if (jobRow) {
        window.UI.openJob(jobRow.dataset.jobId);
        return;
      }
      if (custRow) {
        window.UI.openCustomer(custRow.dataset.customerId);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <>
      <Drawer open={!!ui.drawer} onClose={close}>
        {ui.drawer?.kind === 'job'      && <JobDetailDrawer jobId={ui.drawer.id} />}
        {ui.drawer?.kind === 'customer' && <CustomerDetailDrawer customerId={ui.drawer.id} />}
      </Drawer>
      {ui.popup === 'notifs' && <><div className="popup-scrim" onClick={close}/><NotificationsPopup/></>}
      {ui.toast && <Toast message={ui.toast}/>}
    </>
  );
}
window.OverlayRoot = OverlayRoot;
window.useUI = useUI;
