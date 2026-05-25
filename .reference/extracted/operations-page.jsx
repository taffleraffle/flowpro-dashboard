// ============== OPERATIONS PAGE ==============
const D = window.FLOWPRO_DATA;
const E = window.FLOWPRO_DATA_EXT;

function OpsKPIs() {
  const o = D.ops;
  return (
    <div className="row kpi-strip">
      <KPI feature icon="clock" label="Avg Response"
           value={o.avgResponseMin} unit="min" delta={-0.082} sub="phone → on the way" />
      <KPI icon="check" label="First-Time Fix"
           value={fmt(o.firstTimeFix,{pct:true,decimals:0})} delta={0.024} sub="no callback" />
      <KPI icon="users" label="Tech Utilisation"
           value={fmt(o.techUtil,{pct:true,decimals:0})} delta={0.038} sub="6 techs deployed" />
      <KPI icon="truck" label="Avg Travel"
           value={o.avgTravelMin} unit="min" delta={-0.048} sub="between jobs" />
      <KPI icon="target" label="On-Time Arrival"
           value={fmt(o.onTimeArrival,{pct:true,decimals:0})} delta={0.014} sub="within ±15 min" />
      <KPI icon="wrench" label="Avg Job Time"
           value={o.avgJobMinutes} unit="min" delta={-0.022} sub="excluding travel" />
    </div>
  );
}

function TechWeekGrid() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const techColors = { MP:'#1BA8D4', JK:'#0D3556', ST:'#7DD3E8', LF:'#E8A93C', HW:'#134268', AT:'#15A36A' };
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Utilisation grid</span>
          <h3 className="card-title">Tech Week · billable hours</h3>
          <div className="card-sub">Target: 6.4 hrs/day · 32 hrs/week</div>
        </div>
        <span className="badge cyan">Week 20 · May 11-17</span>
      </div>
      <div className="card-b">
        <div style={{ display:'grid', gridTemplateColumns:'160px repeat(7, minmax(0,1fr)) 80px', gap:8, alignItems:'center' }}>
          <div></div>
          {days.map(d => <div key={d} className="eyebrow" style={{textAlign:'center', marginBottom:0}}>{d}</div>)}
          <div className="eyebrow" style={{textAlign:'right', marginBottom:0}}>Total</div>
          {E.techWeekHours.map(t => {
            const total = t.days.reduce((a,b)=>a+b,0);
            return (
              <React.Fragment key={t.tech}>
                <div className="stack-h">
                  <div className="av s" style={{background:techColors[t.tech]}}>{t.tech}</div>
                  <span style={{fontWeight:600, fontSize:13}}>{t.name}</span>
                </div>
                {t.days.map((h, i) => {
                  const pct = Math.min(h/9, 1);
                  return (
                    <div key={i} style={{
                      height: 38,
                      background: h > 0 ? `linear-gradient(180deg, ${techColors[t.tech]}, ${techColors[t.tech]}cc)` : 'var(--bg)',
                      opacity: h > 0 ? (0.35 + pct * 0.65) : 1,
                      borderRadius: 4,
                      display: 'grid',
                      placeItems: 'center',
                      color: h > 0 ? '#fff' : 'var(--muted-2)',
                      fontSize: 11,
                      fontWeight: 700,
                    }}>{h > 0 ? h.toFixed(1) : '—'}</div>
                  );
                })}
                <div className="num display" style={{textAlign:'right', fontSize:18}}>{total.toFixed(1)}h</div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HourlyLoadChart() {
  const max = Math.max(...E.hourlyLoad.map(h => h.jobs));
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Demand pattern</span>
          <h3 className="card-title">Jobs by Hour of Day</h3>
          <div className="card-sub">Last 30 days · peak 9-10am</div>
        </div>
      </div>
      <div className="card-b">
        <div style={{display:'flex', alignItems:'flex-end', gap:6, height:140}}>
          {E.hourlyLoad.map(h => (
            <div key={h.hour} title={`${h.hour}: ${h.jobs} jobs`}
                 style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end', cursor:'pointer'}}>
              <div className="tiny" style={{fontWeight:600, marginBottom:4, opacity: h.jobs / max > 0.5 ? 1 : 0.5}}>{h.jobs}</div>
              <div style={{
                width:'100%',
                height: `${(h.jobs/max)*100}%`,
                background: h.jobs / max > 0.7 ? 'var(--cyan-600)' : h.jobs / max > 0.4 ? 'var(--cyan-300)' : 'var(--navy-100)',
                borderRadius: '4px 4px 0 0',
                transition: 'all .2s',
              }}/>
              <div className="tiny muted" style={{marginTop:4}}>{h.hour}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SLATracker() {
  const slas = [
    { name: 'Emergency response < 60 min', met: 47, total: 49, target: 0.95 },
    { name: 'Standard response < 4 hours', met: 184, total: 188, target: 0.90 },
    { name: 'Quote sent < 24 hours',       met: 91,  total: 97,  target: 0.95 },
    { name: 'Invoice sent < 48 hours',     met: 198, total: 211, target: 0.90 },
    { name: 'Follow-up call < 7 days',     met: 152, total: 188, target: 0.80 },
  ];
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Service levels</span>
          <h3 className="card-title">SLA Compliance</h3>
        </div>
      </div>
      <div className="card-b">
        <div className="stack-v" style={{gap:14}}>
          {slas.map(s => {
            const rate = s.met / s.total;
            const meets = rate >= s.target;
            return (
              <div key={s.name}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5, alignItems:'baseline'}}>
                  <span style={{fontSize:12, fontWeight:600}}>{s.name}</span>
                  <span className="num small" style={{fontWeight:700, color: meets ? 'var(--success)' : 'var(--warn)'}}>
                    {fmt(rate,{pct:true,decimals:1})} <span className="muted tiny">of {fmt(s.target,{pct:true,decimals:0})}</span>
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{width:`${rate*100}%`, background: meets ? 'var(--success)' : 'var(--warn)'}}/>
                  <div style={{position:'absolute', left:`${s.target*100}%`, top:-2, bottom:-2, width:1.5, background:'var(--ink)'}}/>
                </div>
                <div className="tiny muted" style={{marginTop:3}}>{s.met} of {s.total} met</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FleetCard() {
  const statusBadge = { 'on job': 'cyan', idle: 'amber', depot: 'navy', parked: 'red' };
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Fleet</span>
          <h3 className="card-title">Vehicles · 6 vans</h3>
        </div>
        <button className="btn"><Icon name="plus" size={12}/>Service log</button>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr><th>Rego</th><th>Driver</th><th>Status</th><th>Current</th><th className="num">Odo</th><th>WOF</th></tr>
          </thead>
          <tbody>
            {E.fleet.map(v => (
              <tr key={v.rego}>
                <td><span className="num" style={{fontWeight:700}}>{v.rego}</span></td>
                <td>{v.driver}</td>
                <td><span className={`badge ${statusBadge[v.status]}`}>{v.status.toUpperCase()}</span></td>
                <td className="small muted">{v.currentJob}</td>
                <td className="num muted">{v.km.toLocaleString()} km</td>
                <td className="small">{v.wofExp}{v.alert && <div className="tiny" style={{color:'var(--danger)', fontWeight:600}}>{v.alert}</div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryCard() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Stock</span>
          <h3 className="card-title">Inventory · van + warehouse</h3>
        </div>
        <span className="badge red">2 reorder</span>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr><th>Item</th><th className="num">Stock</th><th className="num">Min</th><th className="num">Unit cost</th><th>Status</th></tr>
          </thead>
          <tbody>
            {E.inventory.map(i => (
              <tr key={i.item}>
                <td style={{fontWeight:600}}>{i.item}</td>
                <td className="num" style={{fontWeight:700, color: i.reorder ? 'var(--danger)' : 'var(--ink)'}}>{i.stock}</td>
                <td className="num muted">{i.min}</td>
                <td className="num muted">${i.unitCost}</td>
                <td>{i.reorder ? <span className="badge red">REORDER</span> : <span className="badge green">OK</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OperationsPage() {
  return (
    <>
      <OpsKPIs />
      <TodaySchedule />
      <TechWeekGrid />
      <div className="row split-2-1">
        <HourlyLoadChart />
        <SLATracker />
      </div>
      <OperationsMetrics />
      <div className="row split-3-2">
        <FleetCard />
        <InventoryCard />
      </div>
      <CrewLeaderboard />
    </>
  );
}
window.OperationsPage = OperationsPage;
