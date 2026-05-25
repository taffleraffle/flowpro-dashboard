// ============== MARKETING PAGE — daily tracker style ==============
const D = window.FLOWPRO_DATA;
const E = window.FLOWPRO_DATA_EXT;
const TH = E.mktThresholds;

// Threshold cell helper: pass actual + target + direction ('below' means lower is better)
function thresholdClass(value, target, direction = 'below', tolerance = 0.05) {
  if (value == null || isNaN(value)) return '';
  const ok = direction === 'below' ? value <= target : value >= target;
  const near = direction === 'below'
    ? value <= target * (1 + tolerance)
    : value >= target * (1 - tolerance);
  if (ok)   return 'cell-good';
  if (near) return 'cell-warn';
  return 'cell-bad';
}

// ===== KPI strip (rolling 30d, with threshold context) =====
function MarketingKPIs() {
  const r = E.mktRolling.d30;
  return (
    <div className="row kpi-strip">
      <KPI feature icon="cash" label="Adspend"
           value={fmt(r.adspend, { currency: true, decimals: 0 })}
           sub="30d · paid channels" />
      <KPI icon="users" label="Leads"
           value={fmt(r.leads)}
           sub={`${r.qualifiedQuotes} qualified quotes`} />
      <KPI icon="receipt" label="Cost / Lead"
           value={fmt(r.cpl, { currency: true, decimals: 2 })}
           sub={`Target < $${TH.cpl}`}
           delta={(TH.cpl - r.cpl) / TH.cpl} />
      <KPI icon="target" label="Lead → Quote"
           value={fmt(r.leadToQuote, { pct: true, decimals: 1 })}
           sub={`Target > ${(TH.leadToQuote*100).toFixed(0)}%`}
           delta={(r.leadToQuote - TH.leadToQuote)} />
      <KPI icon="check" label="Close Rate"
           value={fmt(r.closeRate, { pct: true, decimals: 1 })}
           sub={`Target > ${(TH.closeRate*100).toFixed(0)}%`}
           delta={(r.closeRate - TH.closeRate)} />
      <KPI icon="trend" label="ROAS"
           value={r.roas.toFixed(2) + 'x'}
           sub={`Target > ${TH.roas}x · ${fmt(r.contractedRevenue, { currency: true, compact: true })} rev.`}
           delta={(r.roas - TH.roas) / TH.roas} />
    </div>
  );
}

// ===== Rolling summary table (4D, 7D, 30D, MTD) =====
function RollingSummaryTable() {
  const rows = [
    { label: '4 Days',  data: E.mktRolling.d4 },
    { label: '7 Days',  data: E.mktRolling.d7 },
    { label: '30 Days', data: E.mktRolling.d30 },
    { label: 'MTD',     data: E.mktRolling.mtd },
  ];
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Trailing performance</span>
          <h3 className="card-title">Rolling Marketing KPIs</h3>
          <div className="card-sub">Aggregated · color coded vs targets</div>
        </div>
        <div className="legend">
          <span className="item"><span className="swatch" style={{background:'#15A36A'}}></span>Meeting target</span>
          <span className="item"><span className="swatch" style={{background:'#E8A93C'}}></span>Within 5%</span>
          <span className="item"><span className="swatch" style={{background:'#D14543'}}></span>Below target</span>
        </div>
      </div>
      <div className="card-b flush">
        <div style={{ overflowX: 'auto' }}>
          <table className="flow tracker">
            <thead>
              <tr>
                <th style={{minWidth:90}}>Trailing</th>
                <th className="num">Adspend</th>
                <th className="num">Leads</th>
                <th className="num th-target">CPL<div className="th-sub">&lt; ${TH.cpl}</div></th>
                <th className="num">Quotes</th>
                <th className="num th-target">L→Q %<div className="th-sub">&gt; {TH.leadToQuote*100}%</div></th>
                <th className="num th-target">CPQ<div className="th-sub">&lt; ${TH.cpq}</div></th>
                <th className="num">Quotable $</th>
                <th className="num">Avg Quote</th>
                <th className="num">Jobs</th>
                <th className="num th-target">Close %<div className="th-sub">&gt; {TH.closeRate*100}%</div></th>
                <th className="num th-target">Cost/Job<div className="th-sub">&lt; ${TH.cpj}</div></th>
                <th className="num">Contracted $</th>
                <th className="num th-target">ROAS<div className="th-sub">&gt; {TH.roas}x</div></th>
                <th className="num">$/Lead</th>
                <th className="num">$/Quote</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const d = row.data;
                return (
                  <tr key={i} className={i === 3 ? 'row-emph' : ''}>
                    <td><span className="badge solid-navy">{row.label}</span></td>
                    <td className="num">{fmt(d.adspend, { currency: true, decimals: 0 })}</td>
                    <td className="num">{d.leads}</td>
                    <td className={`num ${thresholdClass(d.cpl, TH.cpl, 'below')}`}>{fmt(d.cpl, { currency: true, decimals: 2 })}</td>
                    <td className="num">{d.qualifiedQuotes}</td>
                    <td className={`num ${thresholdClass(d.leadToQuote, TH.leadToQuote, 'above')}`}>{fmt(d.leadToQuote, { pct: true, decimals: 1 })}</td>
                    <td className={`num ${thresholdClass(d.cpq, TH.cpq, 'below')}`}>{fmt(d.cpq, { currency: true, decimals: 2 })}</td>
                    <td className="num">{fmt(d.quotableValue, { currency: true, decimals: 0 })}</td>
                    <td className="num">{fmt(d.avgQuoteValue, { currency: true, decimals: 0 })}</td>
                    <td className="num">{d.jobsClosed}</td>
                    <td className={`num ${thresholdClass(d.closeRate, TH.closeRate, 'above')}`}>{fmt(d.closeRate, { pct: true, decimals: 1 })}</td>
                    <td className={`num ${thresholdClass(d.cpj, TH.cpj, 'below')}`}>{fmt(d.cpj, { currency: true, decimals: 2 })}</td>
                    <td className="num">{fmt(d.contractedRevenue, { currency: true, decimals: 0 })}</td>
                    <td className={`num ${thresholdClass(d.roas, TH.roas, 'above')}`}>{d.roas.toFixed(2)}x</td>
                    <td className="num">{fmt(d.revPerLead, { currency: true, decimals: 0 })}</td>
                    <td className="num">{fmt(d.revPerQuote, { currency: true, decimals: 0 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== Lead sources — by channel =====
function LeadSourceDetail() {
  const grouped = {
    paid:    E.leadSourcesDetail.filter(s => s.channel === 'paid'),
    organic: E.leadSourcesDetail.filter(s => s.channel === 'organic'),
    word:    E.leadSourcesDetail.filter(s => s.channel === 'word'),
  };
  const channelMeta = {
    paid:    { label: 'Paid Channels',         icon: 'cash',   tint: '#1BA8D4' },
    organic: { label: 'Organic / SEO',         icon: 'sparkle',tint: '#0D3556' },
    word:    { label: 'Word of Mouth',         icon: 'users',  tint: '#15A36A' },
  };
  const totals = (arr) => ({
    leads: arr.reduce((s,x)=>s+x.leads,0),
    spend: arr.reduce((s,x)=>s+x.spend,0),
    jobs:  arr.reduce((s,x)=>s+x.jobs,0),
    revenue:arr.reduce((s,x)=>s+x.revenue,0),
  });
  const grandLeads = E.leadSourcesDetail.reduce((s,x)=>s+x.leads,0);

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Acquisition mix</span>
          <h3 className="card-title">Where Leads Come From</h3>
          <div className="card-sub">{grandLeads} leads · last 30 days · CPL benchmarked against ${TH.cpl} target</div>
        </div>
      </div>
      <div className="card-b flush">
        {Object.entries(grouped).map(([key, sources]) => {
          const t = totals(sources);
          const meta = channelMeta[key];
          const cpl = t.spend ? t.spend / t.leads : 0;
          const roas = t.spend ? t.revenue / t.spend : null;
          const shareLeads = t.leads / grandLeads;
          return (
            <div key={key} style={{ borderTop: '1px solid var(--border)' }}>
              <div style={{
                padding: '14px 20px', display: 'grid',
                gridTemplateColumns: '230px 1fr auto', gap: 18, alignItems: 'center',
                background: 'var(--surface-2)',
              }}>
                <div className="stack-h">
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: meta.tint + '22', color: meta.tint,
                    display: 'grid', placeItems: 'center',
                  }}><Icon name={meta.icon} size={16}/></div>
                  <div>
                    <div style={{fontWeight:700, fontSize:14}}>{meta.label}</div>
                    <div className="tiny muted">{sources.length} source{sources.length>1?'s':''} · {fmt(shareLeads,{pct:true,decimals:0})} of leads</div>
                  </div>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
                  gap: 8, fontSize: 12
                }}>
                  <div>
                    <div className="tiny muted">Leads</div>
                    <div className="num display" style={{fontSize:18}}>{t.leads}</div>
                  </div>
                  <div>
                    <div className="tiny muted">Spend</div>
                    <div className="num display" style={{fontSize:18}}>{t.spend ? '$'+t.spend.toLocaleString() : '$0'}</div>
                  </div>
                  <div>
                    <div className="tiny muted">CPL</div>
                    <div className={`num display ${thresholdClass(cpl || 0.01, TH.cpl, 'below')}`} style={{fontSize:18, padding:'0 6px', borderRadius:4, display:'inline-block'}}>
                      {cpl ? '$'+cpl.toFixed(2) : 'FREE'}
                    </div>
                  </div>
                  <div>
                    <div className="tiny muted">ROAS</div>
                    <div className="num display" style={{fontSize:18, color: roas && roas >= TH.roas ? 'var(--success)' : 'var(--ink)'}}>
                      {roas ? roas.toFixed(1)+'x' : '∞'}
                    </div>
                  </div>
                </div>
                <div style={{ width: 180 }}>
                  <div className="tiny muted" style={{textAlign:'right', marginBottom:4}}>
                    {fmt(t.revenue,{currency:true,compact:true})} revenue
                  </div>
                  <div className="bar-track" style={{height:6}}>
                    <div className="bar-fill" style={{width: `${shareLeads*100}%`, background: meta.tint}}/>
                  </div>
                </div>
              </div>
              <table className="flow" style={{borderTop:'1px solid var(--divider)'}}>
                <tbody>
                  {sources.map(s => {
                    const sRoas = s.spend ? s.revenue / s.spend : null;
                    return (
                      <tr key={s.source}>
                        <td style={{paddingLeft:40, width:280}}>
                          <div className="stack-h">
                            <span className="swatch" style={{background:s.color, flexShrink:0}}></span>
                            <span style={{fontWeight:600, fontSize:13}}>{s.source}</span>
                          </div>
                        </td>
                        <td className="num"><span className="tiny muted">Leads</span> <b>{s.leads}</b></td>
                        <td className="num"><span className="tiny muted">Spend</span> <b>{s.spend ? '$'+s.spend.toLocaleString() : '—'}</b></td>
                        <td className={`num`}>
                          <span className="tiny muted">CPL</span>{' '}
                          {s.spend ? <b className={thresholdClass(s.cpl, TH.cpl, 'below')} style={{padding:'2px 6px', borderRadius:4}}>${s.cpl.toFixed(2)}</b> : <b style={{color:'var(--success)'}}>FREE</b>}
                        </td>
                        <td className="num"><span className="tiny muted">Quotes</span> <b>{s.quotes}</b></td>
                        <td className="num"><span className="tiny muted">Jobs</span> <b>{s.jobs}</b></td>
                        <td className="num"><span className="tiny muted">Revenue</span> <b>${(s.revenue/1000).toFixed(1)}k</b></td>
                        <td className="num">
                          {sRoas ? <span className={`badge ${sRoas >= TH.roas ? 'green' : sRoas >= TH.roas*0.6 ? 'amber' : 'red'}`}>{sRoas.toFixed(1)}x ROAS</span> : <span className="badge green">∞</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== SEO performance card =====
function SEOPerformance() {
  const s = E.seoMetrics;
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Organic search</span>
          <h3 className="card-title">SEO Performance · 30d</h3>
          <div className="card-sub">Google organic + brand</div>
        </div>
        <span className="badge green">FREE traffic · {fmt(s.organicRevenue, { currency: true, compact: true })} revenue</span>
      </div>
      <div className="card-b">
        <div className="row cols-4" style={{ gap: 12, marginBottom: 18 }}>
          <div>
            <div className="eyebrow">Impressions</div>
            <div className="display num" style={{fontSize:24}}>{fmt(s.impressions, { compact: true })}</div>
          </div>
          <div>
            <div className="eyebrow">Clicks</div>
            <div className="display num" style={{fontSize:24}}>{fmt(s.clicks)}</div>
          </div>
          <div>
            <div className="eyebrow">CTR</div>
            <div className="display num" style={{fontSize:24}}>{fmt(s.ctr, { pct: true, decimals: 2 })}</div>
          </div>
          <div>
            <div className="eyebrow">Avg Position</div>
            <div className="display num" style={{fontSize:24}}>{s.avgPosition}</div>
          </div>
        </div>
        <div className="eyebrow" style={{marginBottom:8}}>Top pages by leads</div>
        <table className="flow">
          <thead>
            <tr>
              <th>Page</th>
              <th className="num">Impr.</th>
              <th className="num">Clicks</th>
              <th className="num">Pos.</th>
              <th className="num">Leads</th>
            </tr>
          </thead>
          <tbody>
            {s.topPages.map(p => (
              <tr key={p.page}>
                <td><span style={{fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600}}>{p.page}</span></td>
                <td className="num muted">{fmt(p.impressions, { compact: true })}</td>
                <td className="num">{p.clicks}</td>
                <td className="num"><span className={`badge ${p.position <= 3 ? 'green' : p.position <= 5 ? 'cyan' : 'amber'}`}>{p.position.toFixed(1)}</span></td>
                <td className="num" style={{fontWeight:700}}>{p.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Daily tracker table =====
function DailyTracker() {
  const days = E.mktDays.slice(0, 30); // most recent 30 days
  const monthFmt = { day: '2-digit', month: 'short' };
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Daily log</span>
          <h3 className="card-title">Daily Marketing Tracker</h3>
          <div className="card-sub">Last 30 days · scroll for more · color shows vs target</div>
        </div>
        <div className="stack-h">
          <div className="period-tabs">
            <button className="active">30 days</button>
            <button>60 days</button>
            <button>90 days</button>
          </div>
          <button className="btn"><Icon name="download" size={12}/>CSV</button>
        </div>
      </div>
      <div className="card-b flush">
        <div style={{ maxHeight: 540, overflow: 'auto' }}>
          <table className="flow tracker daily">
            <thead>
              <tr>
                <th style={{position:'sticky', left:0, background:'var(--surface-2)', zIndex:2, minWidth:96}}>Date</th>
                <th className="num">Adspend</th>
                <th className="num">Leads</th>
                <th className="num th-target">CPL</th>
                <th className="num">Quotes</th>
                <th className="num th-target">L→Q %</th>
                <th className="num th-target">CPQ</th>
                <th className="num">Quotable $</th>
                <th className="num">Avg Quote</th>
                <th className="num">Jobs</th>
                <th className="num th-target">Close %</th>
                <th className="num th-target">Cost/Job</th>
                <th className="num">Revenue</th>
                <th className="num th-target">ROAS</th>
                <th className="num">$/Lead</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => {
                const cplCls = thresholdClass(d.cpl, TH.cpl, 'below');
                const lqCls  = thresholdClass(d.leadToQuote, TH.leadToQuote, 'above');
                const cpqCls = thresholdClass(d.cpq, TH.cpq, 'below');
                const crCls  = thresholdClass(d.closeRate, TH.closeRate, 'above');
                const cpjCls = d.jobsClosed ? thresholdClass(d.cpj, TH.cpj, 'below') : '';
                const roasCls= thresholdClass(d.roas, TH.roas, 'above');
                // Pink row if multiple metrics bad
                const badCount = [cplCls, lqCls, cpqCls, crCls, cpjCls, roasCls].filter(c => c === 'cell-bad').length;
                return (
                  <tr key={i} className={badCount >= 3 ? 'row-bad' : ''}>
                    <td style={{position:'sticky', left:0, background:'inherit', zIndex:1, fontWeight:600}}>
                      {d.date.toLocaleDateString('en-NZ', monthFmt)}
                      <div className="tiny muted">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.date.getDay()]}</div>
                    </td>
                    <td className="num">${d.adspend}</td>
                    <td className="num">{d.leads}</td>
                    <td className={`num ${cplCls}`}>${d.cpl.toFixed(2)}</td>
                    <td className="num">{d.qualifiedQuotes}</td>
                    <td className={`num ${lqCls}`}>{fmt(d.leadToQuote,{pct:true,decimals:0})}</td>
                    <td className={`num ${cpqCls}`}>${d.cpq.toFixed(2)}</td>
                    <td className="num">${d.quotableValue.toLocaleString()}</td>
                    <td className="num">${d.avgQuoteValue}</td>
                    <td className="num">{d.jobsClosed}</td>
                    <td className={`num ${crCls}`}>{fmt(d.closeRate,{pct:true,decimals:0})}</td>
                    <td className={`num ${cpjCls}`}>{d.jobsClosed ? '$'+d.cpj.toFixed(2) : '—'}</td>
                    <td className="num">${d.contractedRevenue.toLocaleString()}</td>
                    <td className={`num ${roasCls}`}>{d.roas.toFixed(2)}x</td>
                    <td className="num muted">${d.revPerLead.toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MarketingPage() {
  return (
    <>
      <MarketingKPIs />
      <RollingSummaryTable />
      <LeadSourceDetail />
      <div className="row split-3-2">
        <DailyTracker />
        <SEOPerformance />
      </div>
      <div className="row split-2-1">
        <AcquisitionFunnel />
        <CampaignsTable />
      </div>
      <KeywordsTable />
    </>
  );
}

// Lower-priority campaigns table (kept from before, simplified inline)
function CampaignsTable() {
  const statusBadge = { active: 'green', paused: 'amber', ended: 'red' };
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Campaigns</span>
          <h3 className="card-title">Active Campaigns</h3>
        </div>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th className="num">Spend</th>
              <th className="num">Leads</th>
              <th className="num">CPL</th>
              <th className="num">Won</th>
              <th className="num">Revenue</th>
              <th className="num">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {E.campaigns.map(c => {
              const cpl = c.spend && c.leads ? c.spend / c.leads : 0;
              const roas = c.spend > 0 ? c.revenue / c.spend : null;
              return (
                <tr key={c.name}>
                  <td>
                    <div style={{fontWeight:600}}>{c.name}</div>
                    <div className="tiny muted">{c.channel}</div>
                  </td>
                  <td><span className={`badge ${statusBadge[c.status]}`}>{c.status.toUpperCase()}</span></td>
                  <td className="num">{c.spend > 0 ? '$'+c.spend.toLocaleString() : '—'}</td>
                  <td className="num">{c.leads}</td>
                  <td className={`num ${cpl ? thresholdClass(cpl, TH.cpl, 'below') : ''}`} style={{padding:'8px', borderRadius:4}}>{cpl ? '$'+cpl.toFixed(2) : 'FREE'}</td>
                  <td className="num">{c.won}</td>
                  <td className="num" style={{fontWeight:700}}>${(c.revenue/1000).toFixed(1)}k</td>
                  <td className="num">{roas ? <span className={`badge ${roas >= TH.roas ? 'green' : 'amber'}`}>{roas.toFixed(1)}x</span> : <span className="badge green">∞</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KeywordsTable() {
  return (
    <div className="card">
      <div className="card-h">
        <div>
          <span className="eyebrow">Search terms</span>
          <h3 className="card-title">Top Keywords · paid + organic</h3>
        </div>
      </div>
      <div className="card-b flush">
        <table className="flow">
          <thead>
            <tr>
              <th>Keyword</th>
              <th className="num">Impr.</th>
              <th className="num">Clicks</th>
              <th className="num">CTR</th>
              <th className="num">Conv. Rate</th>
              <th className="num">CPC</th>
              <th className="num">Jobs Won</th>
            </tr>
          </thead>
          <tbody>
            {E.keywords.map(k => (
              <tr key={k.term}>
                <td><span style={{fontWeight:600}}>"{k.term}"</span></td>
                <td className="num">{fmt(k.imp,{compact:true})}</td>
                <td className="num">{k.clicks}</td>
                <td className="num"><span className="badge cyan">{fmt(k.ctr,{pct:true,decimals:1})}</span></td>
                <td className="num">{fmt(k.conv,{pct:true,decimals:1})}</td>
                <td className="num muted">${k.cpc.toFixed(2)}</td>
                <td className="num" style={{fontWeight:700}}>{k.jobs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.MarketingPage = MarketingPage;
