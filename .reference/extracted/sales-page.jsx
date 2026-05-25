// ============== SALES PAGE ==============
const D = window.FLOWPRO_DATA;
const E = window.FLOWPRO_DATA_EXT;

function SalesKPIs() {
  const k = D.kpis;
  const totalQuotes = E.quotes.length;
  const accepted = E.quotes.filter(q => q.status === 'accepted').length;
  return (
    <div className="row kpi-strip">
      <KPI feature icon="cash" label="Gross Revenue"
           value={fmt(k.revenue.value / 1000, { decimals: 1 })} unit="k"
           delta={k.revenue.delta} sub="30 day total"
           sparkData={D.revenue.slice(-14)} />
      <KPI icon="trend" label="Gross Profit"
           value={fmt(k.profit.value / 1000, { decimals: 1 })} unit="k"
           delta={k.profit.delta} sub={`${fmt(k.margin.value,{pct:true,decimals:1})} margin`}
           sparkData={D.profit.slice(-14)} />
      <KPI icon="receipt" label="Avg Ticket"
           value={fmt(k.avgTicket.value, { currency: true, decimals: 0 })}
           delta={k.avgTicket.delta} sub="per completed job" />
      <KPI icon="target" label="Quote Win Rate"
           value={fmt(accepted/totalQuotes, {pct:true,decimals:0})}
           delta={0.061} sub={`${accepted} of ${totalQuotes} quotes`} />
      <KPI icon="user" label="Repeat Revenue"
           value={fmt(57100, { currency: true, compact: true })}
           delta={0.142} sub="32% of total revenue" />
      <KPI icon="up" label="MoM Growth"
           value="+14.2" unit="%" delta={0.034} sub="vs Apr 2026" />
    </div>
  );
}

function SalesTrend12Wk() {
  const labels = E.weeklyTrend.map(w => w.week);
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">12-week trend</span>
          <h3 className="card-title">Revenue, Profit & Volume</h3>
          <div className="card-sub">Quarterly view · weekly buckets</div>
        </div>
        <div className="legend">
          <span className="item"><span className="swatch" style={{background:'#1BA8D4'}}></span>Revenue</span>
          <span className="item"><span className="swatch" style={{background:'#0D3556'}}></span>Profit</span>
          <span className="item"><span className="swatch" style={{background:'#E8A93C'}}></span>Jobs</span>
        </div>
      </div>
      <div className="card-b">
        <AreaChart
          height={280}
          currency
          labels={labels}
          series={[
            { name: 'Revenue', color: '#1BA8D4', values: E.weeklyTrend.map(w=>w.revenue), areaOpacity: 0.16 },
            { name: 'Profit',  color: '#0D3556', values: E.weeklyTrend.map(w=>w.profit),  areaOpacity: 0.10 },
            { name: 'JobsX100',color: '#E8A93C', values: E.weeklyTrend.map(w=>w.jobs*120),areaOpacity: 0 },
          ]}
        />
      </div>
    </div>
  );
}

function ProfitMarginByService() {
  const data = D.categories.map(c => ({
    label: c.label,
    revenue: c.revenue,
    cost: Math.round(c.revenue * (0.62 + Math.random() * 0.18)),
    color: c.color,
  })).map(d => ({ ...d, profit: d.revenue - d.cost, margin: (d.revenue - d.cost) / d.revenue }));

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Profitability</span>
          <h3 className="card-title">Margin by Service Line</h3>
          <div className="card-sub">Revenue · cost · margin %</div>
        </div>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr>
              <th>Service</th>
              <th className="num">Revenue</th>
              <th className="num">Cost</th>
              <th className="num">Profit</th>
              <th className="num">Margin</th>
              <th>Margin distribution</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr key={d.label}>
                <td>
                  <div className="stack-h">
                    <span className="swatch" style={{background:d.color}}></span>
                    <span style={{fontWeight:600}}>{d.label}</span>
                  </div>
                </td>
                <td className="num" style={{fontWeight:600}}>{fmt(d.revenue, { currency: true })}</td>
                <td className="num muted">{fmt(d.cost, { currency: true })}</td>
                <td className="num" style={{fontWeight:700, color:'var(--success)'}}>{fmt(d.profit, { currency: true })}</td>
                <td className="num">
                  <span className={`badge ${d.margin > 0.35 ? 'green' : d.margin > 0.25 ? 'cyan' : 'amber'}`}>
                    {fmt(d.margin, {pct:true,decimals:0})}
                  </span>
                </td>
                <td>
                  <div className="bar-track" style={{height:6}}>
                    <div className="bar-fill" style={{width:`${d.margin*200}%`, background:d.color}}/>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotesPipelineTable() {
  const statusBadge = { open: 'cyan', accepted: 'green', sent: 'navy', declined: 'red', expired: 'amber' };
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Quotes</span>
          <h3 className="card-title">Active Quotes</h3>
          <div className="card-sub">{E.quotes.length} quotes · ${E.quotes.reduce((s,q)=>s+q.amount,0).toLocaleString()} total value</div>
        </div>
        <button className="btn btn-primary"><Icon name="plus" size={13}/>New Quote</button>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr>
              <th>Quote</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Suburb</th>
              <th>Status</th>
              <th>Rep</th>
              <th className="num">Amount</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {E.quotes.map(q => (
              <tr key={q.id}>
                <td><span style={{fontWeight:600}}>{q.id}</span><div className="tiny muted">{q.created}</div></td>
                <td>{q.customer}</td>
                <td><span className="badge navy">{q.type}</span></td>
                <td>{q.suburb}</td>
                <td><span className={`badge ${statusBadge[q.status]}`}>{q.status.toUpperCase()}</span></td>
                <td><span className="av s" style={{display:'inline-grid'}}>{q.rep}</span></td>
                <td className="num" style={{fontWeight:700}}>${q.amount.toLocaleString()}</td>
                <td className="tiny muted">{q.expires}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RevenueByDayOfWeek() {
  const max = Math.max(...E.weekdayLoad.map(d => d.revenue));
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Patterns</span>
          <h3 className="card-title">Revenue by Day</h3>
          <div className="card-sub">Last 30 days average</div>
        </div>
      </div>
      <div className="card-b">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, marginBottom: 10 }}>
          {E.weekdayLoad.map((d, i) => (
            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div className="num tiny" style={{ fontWeight: 700, marginBottom: 4 }}>${(d.revenue/1000).toFixed(1)}k</div>
              <div style={{
                width: '100%',
                height: `${(d.revenue/max)*100}%`,
                background: i >= 5 ? 'var(--navy-100)' : 'linear-gradient(180deg, var(--cyan-500), var(--cyan-700))',
                borderRadius: '4px 4px 0 0',
                transition: 'height .6s ease',
              }}/>
              <div className="tiny muted" style={{ marginTop: 6 }}>{d.day}</div>
              <div className="tiny" style={{ fontWeight: 600 }}>{d.jobs}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopCustomersBySpend() {
  const top = [...E.customers].sort((a,b)=>b.lifetimeValue-a.lifetimeValue).slice(0, 8);
  const max = top[0].lifetimeValue;
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Top accounts</span>
          <h3 className="card-title">Highest Lifetime Value</h3>
          <div className="card-sub">All time</div>
        </div>
      </div>
      <div className="card-b">
        <div className="stack-v" style={{ gap: 10 }}>
          {top.map((c, i) => (
            <div key={c.id} style={{ display:'grid', gridTemplateColumns:'24px 1fr auto', gap: 10, alignItems:'center' }}>
              <span className="num" style={{fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--muted)'}}>{i+1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{fontWeight:600, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                  {c.name} {c.status==='vip' && <span className="badge solid-cyan" style={{fontSize:9,marginLeft:4}}>VIP</span>}
                </div>
                <div className="bar-track" style={{height:5, marginTop:4}}>
                  <div className="bar-fill" style={{width:`${(c.lifetimeValue/max)*100}%`, background:'var(--cyan-600)'}}/>
                </div>
                <div className="tiny muted" style={{marginTop:3}}>{c.suburb} · {c.jobs} jobs · since {c.since}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="num display" style={{fontSize:16}}>${(c.lifetimeValue/1000).toFixed(1)}k</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SalesPage() {
  return (
    <>
      <SalesKPIs />
      <SalesTrend12Wk />
      <div className="row split-3-2">
        <ProfitMarginByService />
        <RevenueByDayOfWeek />
      </div>
      <QuotesPipelineTable />
      <div className="row split-3-2">
        <RevenueByCategory />
        <TopCustomersBySpend />
      </div>
    </>
  );
}
window.SalesPage = SalesPage;
