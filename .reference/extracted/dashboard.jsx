// === Flowpro Dashboard — main app ===
const { useState, useEffect, useMemo } = React;

// === Logo ===
const FlowproLogo = ({ light = false }) => (
  <div className="logo">
    <svg width="34" height="34" viewBox="0 0 60 60" fill="none">
      <defs>
        <linearGradient id="dropG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2BBDE6"/>
          <stop offset="100%" stopColor="#0F8CB8"/>
        </linearGradient>
      </defs>
      <path d="M30 6 C 18 22, 10 32, 10 40 a 20 20 0 0 0 40 0 c 0 -8 -8 -18 -20 -34 Z" fill="url(#dropG)"/>
      <path d="M30 14 C 22 26, 16 33, 16 39" stroke="rgba(255,255,255,.55)" strokeWidth="3" strokeLinecap="round" fill="none"/>
    </svg>
    <div>
      <div className="logo-wordmark">flow<span className="pro">pro</span></div>
      <div className="logo-sub">Plumbers & Gasfitters</div>
    </div>
  </div>
);

// === Top bar ===
function TopBar({ tab, setTab }) {
  const tabs = ['Overview', 'Sales', 'Marketing', 'Operations', 'Jobs', 'Customers'];
  return (
    <div className="topbar">
      <FlowproLogo />
      <nav>
        {tabs.map(t => (
          <a key={t} href="#" className={tab === t ? 'active' : ''}
             onClick={(e) => { e.preventDefault(); setTab(t); }}>{t}</a>
        ))}
      </nav>
      <div className="spacer"></div>
      <div style={{ position: 'relative' }}>
        <input
          placeholder="Search jobs, customers, invoices…"
          style={{
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.12)',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 12px 8px 32px',
            width: 280,
            fontSize: 12,
            outline: 'none',
          }}
        />
        <div style={{ position:'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.5)', pointerEvents: 'none' }}>
          <Icon name="search" size={13} />
        </div>
      </div>
      <button className="iconbtn" onClick={() => window.UI.openNotifs()}><Icon name="bell" size={15} /><span className="dot"></span></button>
      <button className="iconbtn" onClick={() => window.UI.toast('Settings coming soon')}><Icon name="settings" size={15} /></button>
      <div className="user" style={{ cursor: 'pointer' }} onClick={() => window.UI.toast('Profile menu')}>
        <div className="av">PF</div>
        <div className="stack-v" style={{ gap: 0, marginRight: 8 }}>
          <div className="name">Pete Findlay</div>
          <div className="role">Owner</div>
        </div>
      </div>
    </div>
  );
}

// === Sub bar — page header with period filter ===
function SubBar({ period, setPeriod, tab }) {
  const periods = ['7D', '30D', 'QTD', 'YTD'];
  return (
    <div className="subbar">
      <div>
        <div className="crumb">Dashboard · {tab}</div>
        <h1>Good afternoon, Pete</h1>
      </div>
      <div className="spacer"></div>
      <div className="period-tabs">
        {periods.map(p => (
          <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>{p}</button>
        ))}
      </div>
      <button className="btn"><Icon name="calendar" size={13}/>Thu 14 May</button>
      <button className="btn"><Icon name="filter" size={13}/>All services</button>
      <button className="btn btn-navy"><Icon name="download" size={13}/>Export Report</button>
    </div>
  );
}

// === Tweaks defaults ===
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "compactDensity": false,
  "showMap": true,
  "showInsights": true,
  "accent": "#1BA8D4"
}/*EDITMODE-END*/;

// === Main App ===
function App() {
  const printMode = !!window.__PRINT_MODE;
  const [tab, setTab] = useState(printMode ? 'Overview' : 'Overview');
  const [period, setPeriod] = useState('30D');
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply accent live
  useEffect(() => {
    document.documentElement.style.setProperty('--cyan-600', t.accent);
  }, [t.accent]);

  // Density
  useEffect(() => {
    document.body.style.fontSize = t.compactDensity ? '13px' : '14px';
  }, [t.compactDensity]);

  if (printMode) {
    return (
      <div className="print-doc">
        <TopBar tab={'Overview'} setTab={() => {}} />
        <SubBar period={period} setPeriod={setPeriod} tab={'Overview'} />
        <div className="page print-section"><h2 className="print-h2">Overview</h2>
          <KPIStrip />
          <div className="row split-3-2"><RevenueTrend /><RevenueByCategory /></div>
          <div className="row split-2-1"><LeadSources /><AcquisitionFunnel /></div>
          <div className="row split-3-2"><JobMap /><div className="stack-v" style={{gap:20}}><Insights /><CashFlow /></div></div>
          <JobPipeline />
          <div className="row split-1-2"><TodaySchedule /><CrewLeaderboard /></div>
          <div className="row split-3-2"><BestQualityJobs /><ReviewsCard /></div>
          <OperationsMetrics />
        </div>
        <div className="page print-section"><h2 className="print-h2">Sales</h2><SalesPage /></div>
        <div className="page print-section"><h2 className="print-h2">Marketing</h2><MarketingPage /></div>
        <div className="page print-section"><h2 className="print-h2">Operations</h2><OperationsPage /></div>
        <div className="page print-section"><h2 className="print-h2">Jobs</h2><JobsPage /></div>
        <div className="page print-section"><h2 className="print-h2">Customers</h2><CustomersPage /></div>
      </div>
    );
  }

  return (
    <div>
      <TopBar tab={tab} setTab={setTab} />
      <SubBar period={period} setPeriod={setPeriod} tab={tab} />

      <div className="page">
        {tab === 'Overview' && (
          <>
            <KPIStrip />
            <div className="row split-3-2">
              <RevenueTrend />
              <RevenueByCategory />
            </div>
            <div className="row split-2-1">
              <LeadSources />
              <AcquisitionFunnel />
            </div>
            {t.showMap && (
              <div className="row split-3-2">
                <JobMap />
                <div className="stack-v" style={{ gap: 20 }}>
                  {t.showInsights && <Insights />}
                  <CashFlow />
                </div>
              </div>
            )}
            <JobPipeline />
            <div className="row split-1-2">
              <TodaySchedule />
              <CrewLeaderboard />
            </div>
            <div className="row split-3-2">
              <BestQualityJobs />
              <ReviewsCard />
            </div>
            <OperationsMetrics />
          </>
        )}
        {tab === 'Sales'      && <SalesPage />}
        {tab === 'Marketing'  && <MarketingPage />}
        {tab === 'Operations' && <OperationsPage />}
        {tab === 'Jobs'       && <JobsPage />}
        {tab === 'Customers'  && <CustomersPage />}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 4px 32px', color: 'var(--muted)', fontSize: 12 }}>
          <div className="stack-h"><FlowproLogoSmall /> <span>Flowpro Plumbers & Gasfitters · Silverdale, Auckland</span></div>
          <div>Last sync · {new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      <OverlayRoot />

      <TweaksPanel>
        <TweakSection label="Layout" />
        <TweakToggle label="Compact density" value={t.compactDensity} onChange={(v) => setTweak('compactDensity', v)} />
        <TweakToggle label="Show map" value={t.showMap} onChange={(v) => setTweak('showMap', v)} />
        <TweakToggle label="Show insights" value={t.showInsights} onChange={(v) => setTweak('showInsights', v)} />
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent} options={['#1BA8D4', '#0D3556', '#15A36A', '#E8A93C']}
                    onChange={(v) => setTweak('accent', v)} />
      </TweaksPanel>
    </div>
  );
}

const FlowproLogoSmall = () => (
  <svg width="18" height="18" viewBox="0 0 60 60" fill="none">
    <path d="M30 6 C 18 22, 10 32, 10 40 a 20 20 0 0 0 40 0 c 0 -8 -8 -18 -20 -34 Z" fill="#1BA8D4"/>
  </svg>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
