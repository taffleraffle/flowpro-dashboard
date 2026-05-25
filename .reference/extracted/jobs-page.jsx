// ============== JOBS PAGE ==============
const D = window.FLOWPRO_DATA;
const E = window.FLOWPRO_DATA_EXT;

function JobsKPIs() {
  const all = Object.values(D.pipeline).flat();
  const open = all.filter(j => !['paid'].includes(j.status));
  const totalValue = all.reduce((s,j)=>s+j.price,0);
  return (
    <div className="row kpi-strip">
      <KPI feature icon="wrench" label="Active Jobs"
           value={all.length} delta={0.084} sub={fmt(totalValue,{currency:true,compact:true}) + ' value'} />
      <KPI icon="clock" label="Scheduled Today"
           value={8} delta={0.143} sub="6 techs out" />
      <KPI icon="check" label="Completed · 30d"
           value={D.kpis.jobsDone.value} delta={0.106} sub="across all services" />
      <KPI icon="alert" label="Open · High Urgency"
           value={4} sub="2 callbacks pending" />
      <KPI icon="receipt" label="Avg Job Value"
           value={fmt(D.kpis.avgTicket.value,{currency:true,decimals:0})}
           delta={0.038} sub="per completed" />
      <KPI icon="target" label="On-Time %"
           value={fmt(D.ops.onTimeArrival,{pct:true,decimals:0})}
           delta={0.014} sub="within 15min" />
    </div>
  );
}

function JobTypesTable() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Service breakdown</span>
          <h3 className="card-title">Most Common Job Types</h3>
          <div className="card-sub">Last 90 days · duration & margin</div>
        </div>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr>
              <th>Job Type</th>
              <th className="num">Count</th>
              <th className="num">Avg Time</th>
              <th className="num">Avg Value</th>
              <th className="num">Total Rev.</th>
              <th className="num">Margin</th>
              <th>Frequency</th>
            </tr>
          </thead>
          <tbody>
            {E.jobTypeStats.map(j => {
              const max = Math.max(...E.jobTypeStats.map(x=>x.count));
              return (
                <tr key={j.type}>
                  <td style={{fontWeight:600}}>{j.type}</td>
                  <td className="num">{j.count}</td>
                  <td className="num muted">{j.avgDur} min</td>
                  <td className="num">${j.avgValue.toLocaleString()}</td>
                  <td className="num" style={{fontWeight:700}}>${(j.count * j.avgValue).toLocaleString()}</td>
                  <td className="num"><span className={`badge ${j.margin > 0.4 ? 'green' : j.margin > 0.3 ? 'cyan' : 'amber'}`}>{fmt(j.margin,{pct:true,decimals:0})}</span></td>
                  <td>
                    <div className="bar-track" style={{height:6}}>
                      <div className="bar-fill" style={{width:`${(j.count/max)*100}%`, background:'var(--cyan-600)'}}/>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DurationValueScatter() {
  const W = 800, H = 280, pad = { l: 50, r: 16, t: 16, b: 36 };
  const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
  const maxDur = 600, maxVal = 8500;
  const x = d => pad.l + (d / maxDur) * innerW;
  const y = v => pad.t + innerH - (v / maxVal) * innerH;
  const typeColors = { Plumbing:'#1BA8D4', Gasfitting:'#0D3556', 'Hot Water':'#7DD3E8', Commercial:'#134268', Drainage:'#2BBDE6', Emergency:'#E8A93C' };

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Distribution</span>
          <h3 className="card-title">Duration vs Value</h3>
          <div className="card-sub">Each dot = 1 job · last 90d</div>
        </div>
        <div className="legend">
          {Object.entries(typeColors).map(([k,c]) => (
            <span key={k} className="item"><span className="swatch" style={{background:c}}></span>{k}</span>
          ))}
        </div>
      </div>
      <div className="card-b">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
          {/* y grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => {
            const v = maxVal * p;
            const yp = y(v);
            return (
              <g key={p}>
                <line x1={pad.l} x2={W-pad.r} y1={yp} y2={yp} stroke="#ECF0F3"/>
                <text x={pad.l-8} y={yp+4} fontSize="10" fill="#93A1AE" textAnchor="end">${fmt(v,{compact:true})}</text>
              </g>
            );
          })}
          {/* x ticks */}
          {[0,120,240,360,480,600].map(d => (
            <g key={d}>
              <line x1={x(d)} x2={x(d)} y1={pad.t} y2={H-pad.b} stroke="#ECF0F3" strokeDasharray="2 3" opacity={d===0?0:1}/>
              <text x={x(d)} y={H-pad.b+16} fontSize="10" fill="#93A1AE" textAnchor="middle">{d}m</text>
            </g>
          ))}
          {/* dots */}
          {E.scatter.map((p, i) => (
            <circle key={i} cx={x(p.dur)} cy={y(p.value)} r="4"
                    fill={typeColors[p.type]} opacity="0.65"
                    stroke="#fff" strokeWidth="0.6" />
          ))}
          <text x={W/2} y={H-4} fontSize="10" fill="#6B7A88" textAnchor="middle" fontWeight="600">Duration (min)</text>
        </svg>
      </div>
    </div>
  );
}

function AllJobsTable() {
  // Flatten all pipeline jobs
  const allJobs = [];
  Object.entries(D.pipeline).forEach(([stage, jobs]) => {
    jobs.forEach(j => allJobs.push({ ...j, stage }));
  });
  const stageBadge = { inquiry: 'navy', quoted: 'cyan', scheduled: 'cyan', onsite: 'amber', invoiced: 'navy', paid: 'green' };
  const urgencyBadge = { high: 'red', med: 'amber', low: 'navy' };
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">All jobs</span>
          <h3 className="card-title">Job Log · 30 days</h3>
          <div className="card-sub">{allJobs.length} shown · click row to view</div>
        </div>
        <div className="stack-h">
          <button className="btn"><Icon name="filter" size={12}/>Filter</button>
          <button className="btn"><Icon name="download" size={12}/>Export</button>
          <button className="btn btn-primary"><Icon name="plus" size={12}/>New Job</button>
        </div>
      </div>
      <div className="card-b flush">
        <table className="flow clickable-rows">
          <thead>
            <tr>
              <th>Job</th>
              <th>Title</th>
              <th>Customer</th>
              <th>Suburb</th>
              <th>Type</th>
              <th>Stage</th>
              <th>Urgency</th>
              <th className="num">Value</th>
            </tr>
          </thead>
          <tbody>
            {allJobs.map(j => (
              <tr key={j.id} data-job-id={j.id} className="row-job">
                <td><span style={{fontWeight:600, fontFamily:'var(--font-mono)'}}>{j.id}</span></td>
                <td style={{fontWeight:600}}>{j.title}</td>
                <td>{j.customer}</td>
                <td>{j.suburb}</td>
                <td><span className="badge navy">{j.type}</span></td>
                <td><span className={`badge ${stageBadge[j.stage]}`}>{j.stage.toUpperCase()}</span></td>
                <td><span className={`badge ${urgencyBadge[j.urgency]}`}>{j.urgency.toUpperCase()}</span></td>
                <td className="num" style={{fontWeight:700}}>${j.price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobsPage() {
  return (
    <>
      <JobsKPIs />
      <JobPipeline />
      <div className="row split-3-2">
        <JobTypesTable />
        <BestQualityJobs />
      </div>
      <DurationValueScatter />
      <AllJobsTable />
    </>
  );
}
window.JobsPage = JobsPage;
