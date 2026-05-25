// ============== CUSTOMERS PAGE ==============
const D = window.FLOWPRO_DATA;
const E = window.FLOWPRO_DATA_EXT;

function CustomersKPIs() {
  const c = E.customers;
  const totalLTV = c.reduce((s,x)=>s+x.lifetimeValue,0);
  const avgLTV = totalLTV / c.length;
  const newCount = c.filter(x=>x.status==='new').length;
  return (
    <div className="row kpi-strip">
      <KPI feature icon="users" label="Active Customers"
           value={319} delta={0.142} sub="customers in last 12 mo" />
      <KPI icon="plus" label="New This Month"
           value={24} delta={0.182} sub={`${newCount} this week`} />
      <KPI icon="trend" label="Repeat Rate"
           value="36" unit="%" delta={0.031} sub="multi-job customers" />
      <KPI icon="cash" label="Avg Lifetime Value"
           value={fmt(avgLTV,{currency:true,decimals:0})}
           delta={0.082} sub="across all customers" />
      <KPI icon="star" label="NPS"
           value={68} delta={0.062} sub="excellent zone" />
      <KPI icon="alert" label="Churned · 90d"
           value={11} delta={-0.024} sub="no job 12+ months" />
    </div>
  );
}

function CustomerGrowthChart() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Growth</span>
          <h3 className="card-title">New & Repeat Customers</h3>
          <div className="card-sub">Last 12 months</div>
        </div>
        <div className="legend">
          <span className="item"><span className="swatch" style={{background:'#1BA8D4'}}></span>New</span>
          <span className="item"><span className="swatch" style={{background:'#0D3556'}}></span>Repeat</span>
        </div>
      </div>
      <div className="card-b">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 200 }}>
          {E.customerGrowth.map(m => {
            const total = m.newCust + m.repeat;
            const max = 60;
            return (
              <div key={m.month} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end'}}>
                <div className="tiny" style={{fontWeight:700, marginBottom:4}}>{total}</div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: `${(total/max)*100}%`, transition:'height .4s' }}>
                  <div style={{ flex: m.repeat, background:'var(--navy-700)', borderRadius:'4px 4px 0 0' }}/>
                  <div style={{ flex: m.newCust, background:'var(--cyan-600)' }}/>
                </div>
                <div className="tiny muted" style={{marginTop:6}}>{m.month}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CustomerSegmentsCard() {
  const total = E.segments.reduce((s,x)=>s+x.revenue,0);
  const donutData = E.segments.map(s => ({ label: s.name, value: s.revenue, color: s.color }));
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Segments</span>
          <h3 className="card-title">Revenue by Segment</h3>
          <div className="card-sub">{fmt(total,{currency:true,compact:true})} across {E.segments.reduce((s,x)=>s+x.count,0)} customers</div>
        </div>
      </div>
      <div className="card-b" style={{display:'grid', gridTemplateColumns:'180px 1fr', gap:18, alignItems:'center'}}>
        <Donut data={donutData} centerLabel="Customers" centerValue={E.segments.reduce((s,x)=>s+x.count,0)} />
        <div className="stack-v" style={{gap:10}}>
          {E.segments.map(s => (
            <div key={s.name}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4, gap:8}}>
                <div className="stack-h" style={{minWidth:0}}>
                  <span className="swatch" style={{background:s.color, flexShrink:0}}></span>
                  <span style={{fontWeight:600, fontSize:13, whiteSpace:'nowrap'}}>{s.name}</span>
                </div>
                <div className="stack-h" style={{gap:12, flexShrink:0}}>
                  <span className="tiny muted">{s.count}</span>
                  <span className="num small" style={{fontWeight:700}}>{fmt(s.revenue,{currency:true,compact:true})}</span>
                </div>
              </div>
              <div className="bar-track" style={{height:5}}>
                <div className="bar-fill" style={{width:`${(s.revenue/total)*100}%`, background:s.color}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomerTable() {
  const statusBadge = { vip: 'solid-cyan', active: 'green', new: 'cyan', overdue: 'red' };
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Customer roster</span>
          <h3 className="card-title">All Customers</h3>
          <div className="card-sub">{E.customers.length} shown · click for profile</div>
        </div>
        <div className="stack-h">
          <button className="btn"><Icon name="filter" size={12}/>Filter</button>
          <button className="btn btn-primary"><Icon name="plus" size={12}/>Add</button>
        </div>
      </div>
      <div className="card-b flush">
        <table className="flow clickable-rows">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Type</th>
              <th>Suburb</th>
              <th className="num">Jobs</th>
              <th className="num">Lifetime $</th>
              <th>Last Job</th>
              <th>Source</th>
              <th>Rating</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {E.customers.sort((a,b)=>b.lifetimeValue-a.lifetimeValue).map(c => (
              <tr key={c.id} data-customer-id={c.id} className="row-customer">
                <td>
                  <div style={{fontWeight:600}}>{c.name}</div>
                  <div className="tiny muted">{c.id} · since {c.since}</div>
                </td>
                <td><span className="badge navy">{c.type}</span></td>
                <td>{c.suburb}</td>
                <td className="num">{c.jobs}</td>
                <td className="num" style={{fontWeight:700}}>${c.lifetimeValue.toLocaleString()}</td>
                <td className="small muted">{c.lastJob}</td>
                <td><span className="badge cyan">{c.source}</span></td>
                <td>{c.avgRating ? <div className="stack-h" style={{justifyContent:'flex-start'}}><Stars value={c.avgRating} size={10}/><span style={{fontWeight:600, fontSize:12}}>{c.avgRating.toFixed(1)}</span></div> : <span className="tiny muted">—</span>}</td>
                <td>{c.status ? <span className={`badge ${statusBadge[c.status]}`}>{c.status.toUpperCase()}</span> : <span className="tiny muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomersPage() {
  return (
    <>
      <CustomersKPIs />
      <div className="row split-3-2">
        <CustomerGrowthChart />
        <CustomerSegmentsCard />
      </div>
      <CustomerTable />
      <div className="row split-3-2">
        <ReviewsCard />
        <TopCustomersBySpend />
      </div>
    </>
  );
}
window.CustomersPage = CustomersPage;
