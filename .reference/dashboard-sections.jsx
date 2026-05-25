// === Dashboard section components ===
const D = window.FLOWPRO_DATA;

// ===================================================================
// KPI STRIP — top-of-page metrics
// ===================================================================
function KPIStrip() {
  const k = D.kpis;
  // small spark series derived from real data
  const revSpark    = D.revenue.slice(-14);
  const profitSpark = D.profit.slice(-14);
  const jobSpark    = D.jobs.slice(-14);

  return (
    <div className="row kpi-strip">
      <KPI
        feature
        icon="cash"
        label="Revenue·30d"
        value={fmt(k.revenue.value / 1000, { decimals: 1 })}
        unit="k NZD"
        delta={k.revenue.delta}
        sub={`vs $${fmt(k.revenue.prev / 1000, { decimals: 1 })}k prev.`}
        sparkData={revSpark}
      />
      <KPI
        icon="trend"
        label="Profit·30d"
        value={fmt(k.profit.value / 1000, { decimals: 1 })}
        unit="k"
        delta={k.profit.delta}
        sub={`${fmt(k.margin.value, { pct: true, decimals: 1 })} margin`}
        sparkData={profitSpark}
      />
      <KPI
        icon="wrench"
        label="Jobs Done"
        value={fmt(k.jobsDone.value)}
        delta={k.jobsDone.delta}
        sub={`vs ${k.jobsDone.prev} last period`}
        sparkData={jobSpark}
      />
      <KPI
        icon="receipt"
        label="Avg Ticket"
        value={fmt(k.avgTicket.value, { currency: true, decimals: 0 })}
        delta={k.avgTicket.delta}
        sub="per completed job"
      />
      <KPI
        icon="map"
        label="Avg Distance"
        value={fmt(k.avgDistKm.value, { decimals: 1 })}
        unit="km"
        delta={k.avgDistKm.delta}
        sub="from depot"
      />
      <KPI
        icon="target"
        label="Quote→Job"
        value={fmt(k.convRate.value, { pct: true, decimals: 1 })}
        delta={k.convRate.delta}
        sub="industry avg 41%"
      />
    </div>
  );
}
window.KPIStrip = KPIStrip;

// ===================================================================
// REVENUE & PROFIT chart card
// ===================================================================
function RevenueTrend() {
  const labels = D.dates.map((d, i) => {
    return (i % 5 === 0 || i === D.dates.length - 1)
      ? `${d.getDate()}/${d.getMonth() + 1}`
      : '';
  });
  const series = [
    { name: 'Revenue', color: '#1BA8D4', values: D.revenue, areaOpacity: 0.18 },
    { name: 'Profit',  color: '#0D3556', values: D.profit,  areaOpacity: 0.10 },
  ];
  const totalRev = D.revenue.reduce((a,b)=>a+b, 0);
  const totalProf = D.profit.reduce((a,b)=>a+b, 0);

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Sales performance</div>
          <h3 className="card-title">Revenue & Profit · 30 days</h3>
        </div>
        <div className="stack-h">
          <div className="legend">
            <span className="item"><span className="swatch" style={{background:'#1BA8D4'}}></span> Revenue <b>{fmt(totalRev, { currency: true, compact: true })}</b></span>
            <span className="item"><span className="swatch" style={{background:'#0D3556'}}></span> Profit <b>{fmt(totalProf, { currency: true, compact: true })}</b></span>
          </div>
          <button className="btn"><Icon name="download" size={13} /> Export</button>
        </div>
      </div>
      <div className="card-b">
        <AreaChart series={series} labels={labels} height={260} currency />
      </div>
    </div>
  );
}
window.RevenueTrend = RevenueTrend;

// ===================================================================
// REVENUE BY CATEGORY (donut + bar list)
// ===================================================================
function RevenueByCategory() {
  const totalRev = D.categories.reduce((s, c) => s + c.revenue, 0);
  const totalJobs = D.categories.reduce((s, c) => s + c.jobs, 0);
  const donutData = D.categories.map(c => ({ label: c.label, value: c.revenue, color: c.color }));
  const top = D.categories[0];

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Primary job value</div>
          <h3 className="card-title">Revenue by Service</h3>
          <div className="card-sub">{totalJobs} jobs · {fmt(totalRev, { currency: true, compact: true })}</div>
        </div>
        <span className="badge cyan">Top: {top.label}</span>
      </div>
      <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 20, alignItems: 'center' }}>
        <Donut data={donutData} centerLabel="Top svc." centerValue={fmt(top.revenue/1000,{decimals:0}) + 'k'} />
        <div className="stack-v" style={{ gap: 10 }}>
          {D.categories.map(c => (
            <div key={c.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'baseline', gap: 8 }}>
                <div className="stack-h" style={{ minWidth: 0, flexWrap: 'nowrap', overflow: 'hidden' }}>
                  <span className="swatch" style={{ background: c.color, flexShrink: 0 }}></span>
                  <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{c.label}</span>
                  <span className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{c.jobs} jobs · ${c.avgTicket} avg</span>
                </div>
                <div className="stack-h" style={{ gap: 10, flexShrink: 0 }}>
                  <span className="num" style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(c.revenue, { currency: true, compact: true })}</span>
                  <span className="tiny muted num" style={{ width: 36, textAlign: 'right' }}>{fmt(c.revenue/totalRev,{pct:true,decimals:0})}</span>
                </div>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(c.revenue/totalRev) * 100}%`, background: c.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.RevenueByCategory = RevenueByCategory;

// ===================================================================
// LEAD SOURCES — where jobs are coming from
// ===================================================================
function LeadSources() {
  const totalLeads = D.leadSources.reduce((s, l) => s + l.leads, 0);
  const totalRev   = D.leadSources.reduce((s, l) => s + l.revenue, 0);

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Acquisition</div>
          <h3 className="card-title">Where jobs come from</h3>
          <div className="card-sub">{totalLeads} leads · {fmt(totalRev, { currency: true, compact: true })} attributed</div>
        </div>
        <div className="period-tabs">
          <button className="active">By Revenue</button>
          <button>By Volume</button>
          <button>By ROI</button>
        </div>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr>
              <th>Source</th>
              <th className="num">Leads</th>
              <th className="num">Won</th>
              <th>Conv.</th>
              <th className="num">Revenue</th>
              <th className="num">Spend</th>
              <th className="num">ROAS</th>
              <th className="num">CPA</th>
            </tr>
          </thead>
          <tbody>
            {D.leadSources.map((l, i) => {
              const conv = l.won / l.leads;
              const roas = l.spend > 0 ? l.revenue / l.spend : null;
              const cpa  = l.spend > 0 ? l.spend / l.won : null;
              return (
                <tr key={i}>
                  <td>
                    <div className="stack-h">
                      <span className="swatch" style={{ background: l.color, width: 12, height: 12 }}></span>
                      <span style={{ fontWeight: 600 }}>{l.name}</span>
                    </div>
                  </td>
                  <td className="num">{l.leads}</td>
                  <td className="num">{l.won}</td>
                  <td>
                    <div className="stack-h">
                      <div className="bar-track" style={{ width: 70 }}>
                        <div className="bar-fill" style={{ width: `${conv*100}%`, background: l.color }}/>
                      </div>
                      <span className="num tiny" style={{ width: 32 }}>{fmt(conv, { pct: true, decimals: 0 })}</span>
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(l.revenue, { currency: true, compact: true })}</td>
                  <td className="num muted">{l.spend > 0 ? fmt(l.spend, { currency: true }) : '—'}</td>
                  <td className="num">
                    {roas ? (
                      <span className={`badge ${roas >= 5 ? 'green' : roas >= 3 ? 'cyan' : 'amber'}`}>{roas.toFixed(1)}x</span>
                    ) : <span className="badge green">∞</span>}
                  </td>
                  <td className="num muted">{cpa ? fmt(cpa, { currency: true, decimals: 0 }) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.LeadSources = LeadSources;

// ===================================================================
// ACQUISITION FUNNEL
// ===================================================================
function AcquisitionFunnel() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Marketing</div>
          <h3 className="card-title">Acquisition Funnel</h3>
          <div className="card-sub">Impression → repeat customer</div>
        </div>
      </div>
      <div className="card-b">
        <Funnel stages={D.funnel} />
        <div className="divider-h"></div>
        <div className="row cols-3" style={{ gap: 12 }}>
          <div>
            <div className="eyebrow">Cost / lead</div>
            <div className="display num" style={{ fontSize: 22, marginTop: 4 }}>$15.92</div>
            <div className="tiny"><span className="delta down"><Icon name="down" size={9}/>8.4%</span></div>
          </div>
          <div>
            <div className="eyebrow">Cost / acq.</div>
            <div className="display num" style={{ fontSize: 22, marginTop: 4 }}>$26.40</div>
            <div className="tiny"><span className="delta down"><Icon name="down" size={9}/>4.2%</span></div>
          </div>
          <div>
            <div className="eyebrow">Repeat rate</div>
            <div className="display num" style={{ fontSize: 22, marginTop: 4 }}>36%</div>
            <div className="tiny"><span className="delta up"><Icon name="up" size={9}/>3.1%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.AcquisitionFunnel = AcquisitionFunnel;

// ===================================================================
// AUCKLAND JOB MAP — geographic distribution
// ===================================================================
function JobMap() {
  const [hover, setHover] = useState(null);
  const maxJobs = Math.max(...D.suburbs.map(s => s.jobs));
  const totalJobs = D.suburbs.reduce((s, x) => s + x.jobs, 0);
  const wAvg = D.suburbs.reduce((s, x) => s + x.distKm * x.jobs, 0) / totalJobs;
  const closeCount = D.suburbs.filter(s => s.distKm <= 10).reduce((a, b) => a + b.jobs, 0);

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Job geography</div>
          <h3 className="card-title">Where jobs happen</h3>
          <div className="card-sub">Hub: Silverdale depot · {totalJobs} jobs · {wAvg.toFixed(1)}km weighted avg</div>
        </div>
        <div className="stack-h">
          <span className="badge cyan"><Icon name="pin" size={11}/> {closeCount} jobs within 10km</span>
        </div>
      </div>
      <div className="card-b" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 16 }}>
        <div className="map-wrap">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            {/* faux coastline */}
            <defs>
              <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(13,53,86,.05)" strokeWidth="0.2"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
            {/* land mass */}
            <path d="M 5,2 Q 30,5 45,3 Q 60,1 78,8 L 95,12 Q 90,40 88,60 Q 85,80 75,95 L 25,98 Q 10,90 5,70 Q 2,40 5,2 Z"
                  fill="rgba(255,255,255,.55)" stroke="rgba(13,53,86,.12)" strokeWidth=".4" />
            {/* harbour cut */}
            <path d="M 38,55 Q 50,60 55,72 Q 50,80 38,75 Z" fill="rgba(27,168,212,.10)" />
            {/* radius rings from depot (Silverdale ~ 50,18) */}
            {[10, 22, 35, 50].map((r, i) => (
              <circle key={i} cx="50" cy="18" r={r} fill="none" stroke="rgba(27,168,212,.18)" strokeWidth="0.25" strokeDasharray="0.8 0.6"/>
            ))}
            {/* depot marker */}
            <circle cx="50" cy="18" r="1.2" fill="#0D3556" />
            <circle cx="50" cy="18" r="2" fill="none" stroke="#0D3556" strokeWidth=".3" />

            {/* suburb pins */}
            {D.suburbs.map((s, i) => {
              const r = 0.8 + (s.jobs / maxJobs) * 2.6;
              return (
                <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{cursor:'pointer'}}>
                  <circle cx={s.x} cy={s.y} r={r + 0.5} fill="rgba(27,168,212,.18)" />
                  <circle cx={s.x} cy={s.y} r={r} fill="#1BA8D4" stroke="#fff" strokeWidth="0.3" />
                </g>
              );
            })}
          </svg>
          {/* labels overlay */}
          {D.suburbs.slice(0, 8).map((s, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
              transform: 'translate(8px, -50%)',
              fontSize: 10, fontWeight: 600, color: 'var(--navy-800)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 2px rgba(255,255,255,.9), 0 0 4px rgba(255,255,255,.6)',
            }}>
              {s.name}{s.primary && <span style={{color:'var(--cyan-700)'}}> ★</span>}
            </div>
          ))}
          {/* hover card */}
          {hover != null && (
            <div style={{
              position: 'absolute',
              left: `${D.suburbs[hover].x}%`,
              top: `${D.suburbs[hover].y}%`,
              transform: 'translate(-50%, -120%)',
              background: 'var(--navy-800)',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 11,
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 10,
            }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{D.suburbs[hover].name}</div>
              <div style={{ opacity: .8 }}>{D.suburbs[hover].jobs} jobs · {D.suburbs[hover].distKm}km · {fmt(D.suburbs[hover].revenue, { currency: true, compact: true })}</div>
            </div>
          )}
          {/* scale legend */}
          <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 10, color: 'var(--muted)' }}>
            <div className="stack-h"><span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'#0D3556'}}></span> Silverdale depot</div>
            <div className="stack-h"><span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'#1BA8D4'}}></span> Job density · radius</div>
          </div>
        </div>

        <div className="stack-v">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="eyebrow">Top suburbs</span>
            <span className="tiny muted">By job count</span>
          </div>
          <div className="stack-v" style={{ gap: 8, maxHeight: 360, overflowY: 'auto', overflowX: 'hidden', paddingRight: 6 }}>
            {D.suburbs.sort((a,b)=>b.jobs-a.jobs).slice(0, 10).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1fr) auto', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6 }}>
                <span className="num" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--muted)' }}>{i+1}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  <div className="tiny muted" style={{ whiteSpace: 'nowrap' }}>{s.distKm}km · {fmt(s.revenue, { currency: true, compact: true })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 700, fontSize: 14 }}>{s.jobs}</div>
                  <div className="tiny muted">jobs</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
window.JobMap = JobMap;

// ===================================================================
// JOB PIPELINE KANBAN
// ===================================================================
function JobPipeline() {
  const cols = [
    { key: 'inquiry',   label: 'Inquiry',   tint: '#93A1AE' },
    { key: 'quoted',    label: 'Quoted',    tint: '#7DD3E8' },
    { key: 'scheduled', label: 'Scheduled', tint: '#1BA8D4' },
    { key: 'onsite',    label: 'On Site',   tint: '#E8A93C' },
    { key: 'invoiced',  label: 'Invoiced',  tint: '#0D3556' },
    { key: 'paid',      label: 'Paid',      tint: '#15A36A' },
  ];
  const urgencyClass = { high: 'red', med: 'amber', low: 'navy' };
  const totalValue = Object.values(D.pipeline).flat().reduce((s, j) => s + j.price, 0);

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Operations</div>
          <h3 className="card-title">Job Pipeline</h3>
          <div className="card-sub">{Object.values(D.pipeline).flat().length} active · {fmt(totalValue, { currency: true, compact: true })} pipeline value</div>
        </div>
        <div className="stack-h">
          <button className="btn"><Icon name="filter" size={13}/> Filter</button>
          <button className="btn btn-primary"><Icon name="plus" size={13}/> New Job</button>
        </div>
      </div>
      <div className="card-b">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 10, overflowX: 'auto' }}>
          {cols.map(col => {
            const items = D.pipeline[col.key] || [];
            const value = items.reduce((s, i) => s + i.price, 0);
            return (
              <div className="pipe-col" key={col.key}>
                <div className="pipe-col-h">
                  <div className="stack-h">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.tint }}></span>
                    {col.label}
                  </div>
                  <span className="count">{items.length}</span>
                </div>
                <div className="tiny muted num" style={{ marginTop: -4, marginBottom: 4 }}>{fmt(value, { currency: true, compact: true })}</div>
                {items.map(j => (
                  <div className="pipe-card" key={j.id}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span className="tiny muted">{j.id}</span>
                      <span className={`badge ${urgencyClass[j.urgency]}`} style={{ fontSize: 9 }}>{j.urgency.toUpperCase()}</span>
                    </div>
                    <div className="title">{j.title}</div>
                    <div className="meta">
                      <span><Icon name="user" size={10}/> {j.customer}</span>
                    </div>
                    <div className="meta">
                      <span><Icon name="pin" size={10}/> {j.suburb}</span>
                      <span className="tiny" style={{
                        color: j.age.includes('OVERDUE') ? 'var(--danger)' : 'var(--muted)',
                        fontWeight: j.age.includes('OVERDUE') ? 700 : 400
                      }}>{j.age}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 2 }}>
                      <span className="tiny muted">{j.type}</span>
                      <span className="price num">${j.price.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
window.JobPipeline = JobPipeline;

// ===================================================================
// TODAY'S SCHEDULE
// ===================================================================
function TodaySchedule() {
  const techColors = { MP:'#1BA8D4', JK:'#0D3556', ST:'#7DD3E8', LF:'#E8A93C', HW:'#134268', AT:'#15A36A' };
  const statusBadge = { done: 'green', onsite: 'amber', scheduled: 'navy' };

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Live operations</div>
          <h3 className="card-title">Today's Schedule</h3>
          <div className="card-sub">Thu 14 May · 8 jobs · 6 techs deployed</div>
        </div>
        <span className="badge solid-cyan"><Icon name="clock" size={11}/> Live</span>
      </div>
      <div className="card-b flush">
        <div className="stack-v">
          {D.schedule.map((s, i) => (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'78px 32px 1fr auto', gap: 14, alignItems:'center',
              padding: '12px 20px',
              borderTop: i === 0 ? 0 : '1px solid var(--divider)',
              background: s.status === 'onsite' ? 'rgba(232,169,60,.05)' : 'transparent',
            }}>
              <div>
                <div className="num display" style={{ fontSize: 16 }}>{s.time}</div>
                <div className="tiny muted">{s.end}</div>
              </div>
              <div className="av" style={{ background: techColors[s.tech] }}>{s.tech}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.job}</div>
                <div className="tiny muted">{s.customer} · {s.suburb} · {s.type}</div>
              </div>
              <span className={`badge ${statusBadge[s.status]}`}>
                {s.status === 'onsite' && <span style={{display:'inline-block', width:5, height:5, borderRadius:'50%', background:'currentColor', marginRight:4, animation:'pulse 1.6s ease-in-out infinite'}}></span>}
                {s.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.TodaySchedule = TodaySchedule;

// ===================================================================
// CREW LEADERBOARD
// ===================================================================
function CrewLeaderboard() {
  const techColors = { MP:'#1BA8D4', JK:'#0D3556', ST:'#7DD3E8', LF:'#E8A93C', HW:'#134268', AT:'#15A36A' };
  const maxRev = Math.max(...D.crew.map(c => c.revenue));
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Team performance</div>
          <h3 className="card-title">Crew Leaderboard · This Week</h3>
        </div>
        <span className="badge cyan">6 techs</span>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr>
              <th>Technician</th>
              <th className="num">Jobs</th>
              <th>Revenue</th>
              <th className="num">Rating</th>
              <th className="num">On time</th>
              <th className="num">Util.</th>
            </tr>
          </thead>
          <tbody>
            {D.crew.sort((a,b)=>b.revenue-a.revenue).map((c, i) => (
              <tr key={i}>
                <td>
                  <div className="stack-h">
                    <div className="av" style={{ background: techColors[c.initials] }}>{c.initials}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}{i===0 && <span className="badge solid-cyan" style={{ marginLeft:6, fontSize:9 }}>TOP</span>}</div>
                      <div className="tiny muted">{c.role}{c.status==='leave' && <span style={{color:'var(--warn)'}}> · on leave</span>}</div>
                    </div>
                  </div>
                </td>
                <td className="num">{c.jobsWeek}</td>
                <td>
                  <div className="stack-h">
                    <div className="bar-track" style={{ width: 100 }}>
                      <div className="bar-fill" style={{ width: `${(c.revenue/maxRev)*100}%`, background: techColors[c.initials] }}/>
                    </div>
                    <span className="num small" style={{ fontWeight:600, minWidth:50 }}>${(c.revenue/1000).toFixed(1)}k</span>
                  </div>
                </td>
                <td className="num">
                  <div className="stack-h" style={{justifyContent:'flex-end'}}>
                    <Stars value={c.rating} size={10}/>
                    <span style={{fontWeight:600}}>{c.rating.toFixed(2)}</span>
                  </div>
                </td>
                <td className="num">{fmt(c.onTime, { pct: true, decimals: 0 })}</td>
                <td className="num">{fmt(c.util, { pct: true, decimals: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.CrewLeaderboard = CrewLeaderboard;

// ===================================================================
// AR AGING & CASH FLOW
// ===================================================================
function CashFlow() {
  const total = D.arAging.reduce((s, b) => s + b.amount, 0);
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Cash flow</div>
          <h3 className="card-title">Accounts Receivable</h3>
          <div className="card-sub">{fmt(total, { currency: true, compact: true })} outstanding · 39 invoices</div>
        </div>
        <span className="badge red">3 overdue 60d+</span>
      </div>
      <div className="card-b">
        <div style={{
          display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden',
          marginBottom: 14, border: '1px solid var(--divider)'
        }}>
          {D.arAging.map((b, i) => (
            <div key={i} style={{
              flex: b.amount,
              background: b.color,
              display: 'grid', placeItems: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700
            }}>{fmt(b.amount/total, { pct: true, decimals: 0 })}</div>
          ))}
        </div>
        <div className="stack-v" style={{ gap: 8 }}>
          {D.arAging.map((b, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize: 13, gap: 8 }}>
              <div className="stack-h" style={{ minWidth: 0 }}>
                <span className="swatch" style={{ background: b.color, flexShrink: 0 }}></span>
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{b.bucket}</span>
                <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>{b.count} inv.</span>
              </div>
              <span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(b.amount, { currency: true })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.CashFlow = CashFlow;

// ===================================================================
// BEST QUALITY JOBS
// ===================================================================
function BestQualityJobs() {
  const techColors = { MP:'#1BA8D4', JK:'#0D3556', ST:'#7DD3E8', LF:'#E8A93C', HW:'#134268', AT:'#15A36A' };
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Quality</div>
          <h3 className="card-title">Best Quality Jobs</h3>
          <div className="card-sub">Composite score · margin × rating × on-time</div>
        </div>
        <div className="period-tabs">
          <button className="active">30 days</button>
          <button>90 days</button>
        </div>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr>
              <th>Score</th>
              <th>Job</th>
              <th className="num">Value</th>
              <th className="num">Margin</th>
              <th className="num">Rating</th>
              <th>Tech</th>
            </tr>
          </thead>
          <tbody>
            {D.bestJobs.map((j, i) => (
              <tr key={j.id}>
                <td>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `linear-gradient(135deg, var(--cyan-50), var(--cyan-100))`,
                    color: 'var(--navy-700)',
                    display: 'grid', placeItems: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16
                  }}>{j.score}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{j.title}</div>
                  <div className="tiny muted">{j.id} · {j.customer} · {j.suburb} · {j.type}</div>
                </td>
                <td className="num" style={{ fontWeight: 700 }}>{fmt(j.value, { currency: true })}</td>
                <td className="num"><span className="badge green">{fmt(j.margin, { pct: true, decimals: 0 })}</span></td>
                <td className="num">
                  <div className="stack-h" style={{ justifyContent:'flex-end' }}>
                    <Stars value={j.rating} size={10}/>
                    <span style={{ fontWeight: 600 }}>{j.rating.toFixed(1)}</span>
                  </div>
                </td>
                <td>
                  <div className="av s" style={{ background: techColors[j.tech] }}>{j.tech}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
window.BestQualityJobs = BestQualityJobs;

// ===================================================================
// REVIEWS
// ===================================================================
function ReviewsCard() {
  const r = D.reviews;
  const maxStar = Math.max(...r.starDist.map(s => s.count));
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Reputation</div>
          <h3 className="card-title">Customer Reviews</h3>
          <div className="card-sub">Across Google, Facebook, NoCowboys</div>
        </div>
      </div>
      <div className="card-b">
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{
            background: 'var(--cyan-50)', borderRadius: 10, padding: 16, textAlign:'center'
          }}>
            <div className="display num" style={{ fontSize: 44, color: 'var(--navy-700)' }}>{r.avg}</div>
            <div style={{ margin: '4px 0 6px' }}><Stars value={r.avg} size={14}/></div>
            <div className="tiny muted">{r.count} reviews</div>
            <div className="tiny" style={{ color:'var(--success)', marginTop: 6, fontWeight: 600 }}>+{r.delta30d} in 30d</div>
          </div>
          <div className="stack-v" style={{ gap: 6, justifyContent: 'center' }}>
            {r.starDist.map(s => (
              <div key={s.stars} style={{ display:'grid', gridTemplateColumns:'18px 1fr 32px', gap: 8, alignItems:'center', fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{s.stars}★</span>
                <div className="bar-track" style={{ height: 6 }}>
                  <div className="bar-fill" style={{ width: `${(s.count/maxStar)*100}%`, background: s.stars >= 4 ? 'var(--cyan-600)' : s.stars === 3 ? 'var(--warn)' : 'var(--danger)' }}/>
                </div>
                <span className="num tiny muted" style={{ textAlign:'right' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="stack-v" style={{ gap: 10 }}>
          {r.recent.map((rv, i) => (
            <div key={i} style={{ borderTop: '1px solid var(--divider)', paddingTop: 10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4, gap: 8 }}>
                <div className="stack-h" style={{ minWidth: 0, flexWrap: 'nowrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{rv.name}</span>
                  <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>· {rv.suburb}</span>
                  <Stars value={rv.stars} size={10}/>
                </div>
                <span className="tiny muted" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{rv.date}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>"{rv.text}"</div>
              <div className="tiny muted" style={{ marginTop: 4 }}>Tech: {rv.tech}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.ReviewsCard = ReviewsCard;

// ===================================================================
// OPERATIONS METRICS
// ===================================================================
function OperationsMetrics() {
  const o = D.ops;
  const metrics = [
    { label: 'Response time', value: o.avgResponseMin + ' min', sub: 'phone → on the way', pct: 0.78, target: '< 45min' },
    { label: 'First-time fix', value: fmt(o.firstTimeFix,{pct:true,decimals:0}), sub: 'no callback', pct: o.firstTimeFix, target: '> 88%' },
    { label: 'Callback rate', value: fmt(o.callbackRate,{pct:true,decimals:0}), sub: 'within 7 days', pct: 1 - (o.callbackRate * 8), target: '< 5%', invert: true },
    { label: 'Tech utilisation', value: fmt(o.techUtil,{pct:true,decimals:0}), sub: 'billable / available', pct: o.techUtil, target: '> 75%' },
    { label: 'On-time arrival', value: fmt(o.onTimeArrival,{pct:true,decimals:0}), sub: 'within ±15 min', pct: o.onTimeArrival, target: '> 90%' },
    { label: 'Avg job time', value: o.avgJobMinutes + ' min', sub: o.avgTravelMin + ' min travel', pct: 0.65, target: '< 120 min' },
  ];

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="eyebrow">Operations performance</div>
          <h3 className="card-title">Field Efficiency</h3>
          <div className="card-sub">Last 30 days · against targets</div>
        </div>
      </div>
      <div className="card-b">
        <div className="row cols-3" style={{ gap: 16 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ borderTop: i >= 3 ? '1px solid var(--divider)' : 0, paddingTop: i >= 3 ? 14 : 0 }}>
              <div className="eyebrow">{m.label}</div>
              <div className="display num" style={{ fontSize: 24, marginTop: 4 }}>{m.value}</div>
              <div className="tiny muted" style={{ marginBottom: 6 }}>{m.sub}</div>
              <div className="bar-track" style={{ height: 4 }}>
                <div className="bar-fill" style={{ width: `${m.pct*100}%`, background: m.pct > 0.7 ? 'var(--success)' : m.pct > 0.5 ? 'var(--cyan-600)' : 'var(--warn)' }}/>
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>Target: {m.target}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.OperationsMetrics = OperationsMetrics;

// ===================================================================
// INSIGHTS / ALERTS
// ===================================================================
function Insights() {
  const iconMap = { warn: 'alert', good: 'trend', info: 'sparkle' };
  const tintMap = { warn: 'amber', good: 'green', info: 'cyan' };
  return (
    <div className="card tinted-navy">
      <div className="card-h">
        <div>
          <div className="eyebrow" style={{color:'rgba(255,255,255,.6)'}}>Insights</div>
          <h3 className="card-title" style={{color:'#fff'}}>What's changed this week</h3>
        </div>
        <Icon name="sparkle" size={18} className="" />
      </div>
      <div className="card-b">
        <div className="stack-v" style={{ gap: 10 }}>
          {D.insights.map((it, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start',
              padding: 10, background: 'rgba(255,255,255,.06)', borderRadius: 8,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: it.type === 'warn' ? 'rgba(232,169,60,.18)' : it.type === 'good' ? 'rgba(91,217,160,.16)' : 'rgba(125,211,232,.16)',
                color: it.type === 'warn' ? '#FFC871' : it.type === 'good' ? '#5BD9A0' : '#7DD3E8',
                display: 'grid', placeItems: 'center'
              }}>
                <Icon name={iconMap[it.type]} size={14} />
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{it.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.Insights = Insights;
