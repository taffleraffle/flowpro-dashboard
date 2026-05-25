// Extended mock data for sub-pages
window.FLOWPRO_DATA_EXT = (function() {
  // ===== Customer roster =====
  const customers = [
    { id: 'C-0042', name: 'Howe Family', type: 'Residential', suburb: 'Red Beach',    since: '2019', jobs: 8, lifetimeValue: 21400, lastJob: '6d ago', avgRating: 5.0, status: 'active', source: 'Referral' },
    { id: 'C-0089', name: 'Westfield F&B',type: 'Commercial',  suburb: 'Albany',       since: '2021', jobs: 14,lifetimeValue: 38200, lastJob: '3d ago', avgRating: 4.9, status: 'vip',    source: 'Google Organic' },
    { id: 'C-0124', name: 'Coastal Build Ltd',type: 'Trade',   suburb: 'Whangaparāoa', since: '2018', jobs: 31,lifetimeValue: 84600, lastJob: 'Today',  avgRating: 4.8, status: 'vip',    source: 'Direct Call' },
    { id: 'C-0203', name: 'Mark Pearse',  type: 'Residential', suburb: 'Silverdale',   since: '2022', jobs: 5, lifetimeValue: 8800,  lastJob: '12d ago',avgRating: 4.7, source: 'Google Ads' },
    { id: 'C-0234', name: 'KFC Albany',   type: 'Commercial',  suburb: 'Albany',       since: '2023', jobs: 9, lifetimeValue: 24800, lastJob: '8d ago', avgRating: 4.6, status: 'overdue', source: 'Referral' },
    { id: 'C-0287', name: 'S. McKenzie',  type: 'Residential', suburb: 'Silverdale',   since: '2024', jobs: 3, lifetimeValue: 5400,  lastJob: 'Yesterday', avgRating: 5.0, source: 'Google Ads' },
    { id: 'C-0301', name: 'R. Patel',     type: 'Residential', suburb: 'Orewa',        since: '2025', jobs: 1, lifetimeValue: 480,   lastJob: 'Today',  avgRating: null, status: 'new', source: 'Google Ads' },
    { id: 'C-0312', name: 'D. Liu',       type: 'Residential', suburb: 'Albany',       since: '2025', jobs: 1, lifetimeValue: 780,   lastJob: 'Today',  avgRating: null, status: 'new', source: 'Facebook' },
    { id: 'C-0156', name: 'Mrs. Karaitiana',type:'Residential',suburb: 'Orewa',        since: '2020', jobs: 6, lifetimeValue: 4200,  lastJob: 'Today',  avgRating: 4.9, source: 'Repeat' },
    { id: 'C-0099', name: 'Walters',      type: 'Residential', suburb: 'Orewa',        since: '2019', jobs: 7, lifetimeValue: 12400, lastJob: 'Today',  avgRating: 5.0, source: 'Referral' },
    { id: 'C-0178', name: 'Hema Taituha', type: 'Residential', suburb: 'Silverdale',   since: '2021', jobs: 4, lifetimeValue: 6800,  lastJob: 'Today',  avgRating: 4.8, source: 'Repeat' },
    { id: 'C-0218', name: 'B. Walker',    type: 'Residential', suburb: 'Dairy Flat',   since: '2022', jobs: 3, lifetimeValue: 7200,  lastJob: '14d ago', avgRating: 5.0, source: 'Google Organic' },
    { id: 'C-0266', name: 'D. Brookes',   type: 'Residential', suburb: 'Red Beach',    since: '2023', jobs: 2, lifetimeValue: 3100,  lastJob: '9d ago', avgRating: 5.0, source: 'Google Ads' },
    { id: 'C-0091', name: 'C. Nguyen',    type: 'Residential', suburb: 'Dairy Flat',   since: '2020', jobs: 4, lifetimeValue: 2900,  lastJob: 'Today',  avgRating: 4.7, source: 'Yellow Pages' },
  ];

  // ===== Quotes =====
  const quotes = [
    { id: 'Q-2241', customer: 'R. Patel',         created: '14 May',  amount: 480,   status: 'open',     suburb: 'Orewa',       type: 'Plumbing',   rep: 'MP', expires: '21 May' },
    { id: 'Q-2240', customer: 'S. McKenzie',      created: '14 May',  amount: 2400,  status: 'accepted', suburb: 'Silverdale',  type: 'Hot Water',  rep: 'AT', expires: '—' },
    { id: 'Q-2239', customer: 'D. Liu',           created: '14 May',  amount: 780,   status: 'open',     suburb: 'Albany',      type: 'Gasfitting', rep: 'JK', expires: '21 May' },
    { id: 'Q-2237', customer: 'Howe family',      created: '13 May',  amount: 8200,  status: 'accepted', suburb: 'Red Beach',   type: 'Plumbing',   rep: 'MP', expires: '—' },
    { id: 'Q-2236', customer: 'Coastal Build Ltd',created: '12 May',  amount: 6400,  status: 'sent',     suburb: 'Whangaparāoa',type: 'Commercial', rep: 'JK', expires: '19 May' },
    { id: 'Q-2235', customer: 'B. Thompson',      created: '11 May',  amount: 320,   status: 'sent',     suburb: 'Stanmore Bay',type: 'Gasfitting', rep: 'JK', expires: '18 May' },
    { id: 'Q-2233', customer: 'C. Nguyen',        created: '10 May',  amount: 540,   status: 'sent',     suburb: 'Dairy Flat',  type: 'Drainage',   rep: 'HW', expires: '17 May' },
    { id: 'Q-2228', customer: 'P. Andrews',       created: '8 May',   amount: 1200,  status: 'declined', suburb: 'Albany',      type: 'Plumbing',   rep: 'ST', expires: '—' },
    { id: 'Q-2225', customer: 'Marsden Cove HOA', created: '6 May',   amount: 14800, status: 'open',     suburb: 'Whangaparāoa',type: 'Commercial', rep: 'MP', expires: '20 May' },
    { id: 'Q-2222', customer: 'J. Singh',         created: '5 May',   amount: 920,   status: 'expired',  suburb: 'Orewa',       type: 'Hot Water',  rep: 'AT', expires: 'Expired' },
  ];

  // ===== Campaigns =====
  const campaigns = [
    { name: 'Google Search · Plumber Orewa',  channel: 'Google Ads', status: 'active', spend: 1840, impressions: 24800, clicks: 612, leads: 58, won: 32, revenue: 19400, cpa: 57 },
    { name: 'Google Search · Gasfitter',      channel: 'Google Ads', status: 'active', spend: 1240, impressions: 18200, clicks: 412, leads: 42, won: 26, revenue: 16800, cpa: 48 },
    { name: 'Performance Max · HW Cylinders', channel: 'Google Ads', status: 'active', spend: 1200, impressions: 32400, clicks: 320, leads: 28, won: 14, revenue: 11200, cpa: 86 },
    { name: 'Local Service Ads',              channel: 'Google Ads', status: 'paused', spend: 0,    impressions: 0,     clicks: 0,   leads: 14, won: 6,  revenue: 3800,  cpa: 0 },
    { name: 'Autumn Cylinder Swap · Boosted', channel: 'Facebook',   status: 'active', spend: 540,  impressions: 41800, clicks: 312, leads: 28, won: 8,  revenue: 4800,  cpa: 67 },
    { name: 'Emergency Plumber · Retargeting',channel: 'Facebook',   status: 'active', spend: 380,  impressions: 18400, clicks: 184, leads: 13, won: 3,  revenue: 2040,  cpa: 127 },
    { name: 'SEO · Service pages',            channel: 'Organic',    status: 'active', spend: 540,  impressions: 84200, clicks: 1840, leads: 96, won: 56, revenue: 38400, cpa: 9.6 },
  ];

  // ===== Keywords =====
  const keywords = [
    { term: 'plumber orewa',          imp: 8420, clicks: 412, ctr: 0.049, conv: 0.092, cpc: 2.40, jobs: 22 },
    { term: 'gas fitter silverdale',  imp: 4200, clicks: 218, ctr: 0.052, conv: 0.114, cpc: 3.10, jobs: 14 },
    { term: 'hot water cylinder repair',imp: 6800,clicks: 320, ctr: 0.047, conv: 0.078, cpc: 2.80, jobs: 12 },
    { term: 'emergency plumber auckland',imp:18400,clicks: 612,ctr: 0.033, conv: 0.061, cpc: 4.20, jobs: 11 },
    { term: 'plumber whangaparaoa',   imp: 3200, clicks: 184, ctr: 0.058, conv: 0.087, cpc: 2.10, jobs: 8 },
    { term: 'blocked drain',          imp: 5600, clicks: 218, ctr: 0.039, conv: 0.052, cpc: 3.40, jobs: 6 },
    { term: 'gas hob installation',   imp: 2400, clicks: 124, ctr: 0.052, conv: 0.073, cpc: 2.70, jobs: 5 },
    { term: 'siteWise plumber',       imp: 800,  clicks: 64,  ctr: 0.080, conv: 0.156, cpc: 1.80, jobs: 4 },
  ];

  // ===== Daily revenue/job by category (28d, for sales page) =====
  // 12-week revenue trend (longer)
  const weeklyTrend = Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`,
    revenue: 32000 + Math.sin(i * 0.7) * 5000 + i * 800 + (Math.random() * 4000),
    profit: 6800 + Math.sin(i * 0.5) * 1200 + i * 200,
    jobs: Math.round(50 + Math.sin(i * 0.6) * 8 + i * 0.8),
  })).map(w => ({ ...w, revenue: Math.round(w.revenue), profit: Math.round(w.profit) }));

  // ===== Tech weekly utilization (gantt-ish weekday hours) =====
  const techWeekHours = [
    { name: 'Mark Pearse',   tech: 'MP', days: [8.2, 8.5, 8.8, 8.0, 7.5, 5, 0] },
    { name: 'Jaden Komene',  tech: 'JK', days: [8.0, 7.8, 8.2, 8.5, 8.0, 4, 0] },
    { name: 'Sione Tupou',   tech: 'ST', days: [7.5, 8.0, 8.2, 7.8, 7.0, 0, 0] },
    { name: 'Aroha Tane',    tech: 'AT', days: [7.2, 7.8, 7.5, 8.0, 7.2, 0, 0] },
    { name: 'Liam Foster',   tech: 'LF', days: [6.8, 7.0, 7.2, 7.0, 6.5, 0, 0] },
    { name: 'Hemi Williams', tech: 'HW', days: [0, 0, 0, 0, 0, 0, 0] },
  ];

  // ===== Hour-of-day load (jobs by hour) =====
  const hourlyLoad = [
    { hour: '6a', jobs: 1 }, { hour: '7a', jobs: 4 }, { hour: '8a', jobs: 12 },
    { hour: '9a', jobs: 18 }, { hour: '10a', jobs: 16 }, { hour: '11a', jobs: 14 },
    { hour: '12p', jobs: 8 }, { hour: '1p', jobs: 13 }, { hour: '2p', jobs: 17 },
    { hour: '3p', jobs: 14 }, { hour: '4p', jobs: 10 }, { hour: '5p', jobs: 6 },
    { hour: '6p', jobs: 3 }, { hour: '7p+', jobs: 4 },
  ];

  // ===== Weekday load =====
  const weekdayLoad = [
    { day: 'Mon', jobs: 38, revenue: 24200 },
    { day: 'Tue', jobs: 44, revenue: 28800 },
    { day: 'Wed', jobs: 48, revenue: 31600 },
    { day: 'Thu', jobs: 42, revenue: 27900 },
    { day: 'Fri', jobs: 36, revenue: 23400 },
    { day: 'Sat', jobs: 18, revenue: 14200 },
    { day: 'Sun', jobs: 8,  revenue: 7800 },
  ];

  // ===== Job types frequency =====
  const jobTypeStats = [
    { type: 'Blocked drain / unblock',  count: 38, avgDur: 78,  avgValue: 380,  margin: 0.42 },
    { type: 'Tap / mixer replacement',  count: 32, avgDur: 52,  avgValue: 240,  margin: 0.46 },
    { type: 'Hot water cylinder',       count: 28, avgDur: 184, avgValue: 1160, margin: 0.31 },
    { type: 'Burst / leak repair',      count: 24, avgDur: 96,  avgValue: 540,  margin: 0.38 },
    { type: 'Gas appliance install',    count: 19, avgDur: 142, avgValue: 780,  margin: 0.34 },
    { type: 'Toilet repair',            count: 17, avgDur: 64,  avgValue: 320,  margin: 0.44 },
    { type: 'Commercial maintenance',   count: 11, avgDur: 268, avgValue: 2080, margin: 0.41 },
    { type: 'Renovation / bath reno',   count: 8,  avgDur: 540, avgValue: 6200, margin: 0.28 },
    { type: 'Drainage CCTV / inspect',  count: 9,  avgDur: 86,  avgValue: 480,  margin: 0.52 },
  ];

  // ===== Job durations vs value scatter =====
  // synthetic: 80 jobs
  const scatter = Array.from({ length: 80 }, (_, i) => {
    const dur = 30 + Math.random() * 480;
    const baseRate = 220 + Math.random() * 80;
    const value = (dur / 60) * baseRate + (Math.random() - 0.3) * 1200;
    return {
      dur: Math.round(dur),
      value: Math.max(100, Math.round(value)),
      type: ['Plumbing','Gasfitting','Hot Water','Commercial','Drainage','Emergency'][Math.floor(Math.random()*6)],
    };
  });

  // ===== Customer growth =====
  const customerGrowth = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'][i],
    newCust: Math.round(18 + Math.sin(i * 0.6) * 6 + i * 0.5),
    repeat:  Math.round(28 + Math.cos(i * 0.5) * 4 + i * 0.3),
  }));

  // ===== Top customer revenue =====
  // already in customers, but sorted

  // ===== Inventory snapshot =====
  const inventory = [
    { item: 'Hot water cylinders (180L)', stock: 4, min: 2, reorder: false, unitCost: 1240 },
    { item: 'Hot water cylinders (250L)', stock: 2, min: 2, reorder: true,  unitCost: 1480 },
    { item: 'PEX pipe (16mm, 50m)',       stock: 8, min: 4, reorder: false, unitCost: 86 },
    { item: 'Copper pipe (15mm, 3m)',     stock: 22,min: 10,reorder: false, unitCost: 32 },
    { item: 'Gas regulator kits',         stock: 3, min: 4, reorder: true,  unitCost: 184 },
    { item: 'Tap mixer (kitchen)',        stock: 12,min: 6, reorder: false, unitCost: 220 },
    { item: 'Toilet flush valve',         stock: 14,min: 8, reorder: false, unitCost: 48 },
  ];

  // ===== Vans =====
  const fleet = [
    { rego: 'FLP-001', driver: 'Mark Pearse',   wofExp: 'Aug 2026', km: 84200, status: 'on job', currentJob: 'J-1815 Orewa' },
    { rego: 'FLP-002', driver: 'Jaden Komene',  wofExp: 'Jun 2026', km: 92800, status: 'on job', currentJob: 'J-1825 Albany' },
    { rego: 'FLP-003', driver: 'Sione Tupou',   wofExp: 'Nov 2026', km: 64100, status: 'idle',   currentJob: '—' },
    { rego: 'FLP-004', driver: 'Aroha Tane',    wofExp: 'Apr 2026', km: 41600, status: 'on job', currentJob: 'J-1828 Orewa', alert: 'WOF due 30d' },
    { rego: 'FLP-005', driver: 'Liam Foster',   wofExp: 'Dec 2026', km: 28400, status: 'depot',  currentJob: '—' },
    { rego: 'FLP-006', driver: 'Hemi Williams', wofExp: 'Sep 2026', km: 71200, status: 'parked', currentJob: 'On leave' },
  ];

  // ===== Customer segments =====
  const segments = [
    { name: 'Residential — Repeat',   count: 184, revenue: 78400, color: '#1BA8D4' },
    { name: 'Residential — New',      count: 96,  revenue: 32200, color: '#7DD3E8' },
    { name: 'Commercial — Repeat',    count: 18,  revenue: 48600, color: '#0D3556' },
    { name: 'Commercial — New',       count: 7,   revenue: 16400, color: '#134268' },
    { name: 'Trade / Builders',       count: 14,  revenue: 38900, color: '#15A36A' },
  ];

  // ===== Daily marketing tracker (last 60 days) =====
  const mktThresholds = {
    cpl: 65,        // < good
    leadToQuote: 0.75, // > good
    cpq: 85,        // < good
    closeRate: 0.50, // > good
    cpj: 173.55,    // < good
    roas: 4.0,      // > good
  };

  // Synthesize 60 days of marketing data (newest first not — generate then sort)
  function randn() { return (Math.random() + Math.random() + Math.random()) / 3; }
  const mktDays = [];
  const today = new Date('2026-05-14');
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;

    // Spend higher on weekdays
    const adspend = Math.round(160 + randn() * 200 + (weekend ? -60 : 30) + Math.sin(i*0.3) * 40);
    // Leads tied to spend with noise
    const leads = Math.max(1, Math.round(adspend / (40 + randn() * 30) + randn() * 4));
    const qualifiedQuotes = Math.max(0, Math.round(leads * (0.78 + (randn() - 0.5) * 0.25)));
    const quotableValue = qualifiedQuotes * (450 + Math.round(randn() * 700));
    const avgQuoteValue = qualifiedQuotes ? Math.round(quotableValue / qualifiedQuotes) : 0;
    const closeRate = qualifiedQuotes ? (0.42 + (randn() - 0.5) * 0.4) : 0;
    const jobsClosed = Math.max(0, Math.round(qualifiedQuotes * closeRate));
    const contractedRevenue = jobsClosed * Math.round(avgQuoteValue * (0.85 + randn() * 0.3));
    const cpl = leads ? adspend / leads : 0;
    const cpq = qualifiedQuotes ? adspend / qualifiedQuotes : 0;
    const leadToQuote = leads ? qualifiedQuotes / leads : 0;
    const closeRateActual = qualifiedQuotes ? jobsClosed / qualifiedQuotes : 0;
    const cpj = jobsClosed ? adspend / jobsClosed : 0;
    const roas = adspend ? contractedRevenue / adspend : 0;
    const revPerLead = leads ? contractedRevenue / leads : 0;
    const revPerQuote = qualifiedQuotes ? contractedRevenue / qualifiedQuotes : 0;

    mktDays.push({
      date: d,
      adspend, leads, cpl, qualifiedQuotes, leadToQuote, cpq,
      quotableValue, avgQuoteValue, jobsClosed, closeRate: closeRateActual,
      cpj, contractedRevenue, roas, revPerLead, revPerQuote,
    });
  }

  function rollUp(daysSlice) {
    const sum = (k) => daysSlice.reduce((s, d) => s + d[k], 0);
    const adspend = sum('adspend');
    const leads = sum('leads');
    const qualifiedQuotes = sum('qualifiedQuotes');
    const quotableValue = sum('quotableValue');
    const jobsClosed = sum('jobsClosed');
    const contractedRevenue = sum('contractedRevenue');
    return {
      adspend, leads, qualifiedQuotes, quotableValue, jobsClosed, contractedRevenue,
      cpl: leads ? adspend / leads : 0,
      leadToQuote: leads ? qualifiedQuotes / leads : 0,
      cpq: qualifiedQuotes ? adspend / qualifiedQuotes : 0,
      avgQuoteValue: qualifiedQuotes ? quotableValue / qualifiedQuotes : 0,
      closeRate: qualifiedQuotes ? jobsClosed / qualifiedQuotes : 0,
      cpj: jobsClosed ? adspend / jobsClosed : 0,
      roas: adspend ? contractedRevenue / adspend : 0,
      revPerLead: leads ? contractedRevenue / leads : 0,
      revPerQuote: qualifiedQuotes ? contractedRevenue / qualifiedQuotes : 0,
    };
  }

  // MTD = May 1 → today
  const monthStart = new Date(today); monthStart.setDate(1);
  const mtd = mktDays.filter(d => d.date >= monthStart);

  const mktRolling = {
    d4:  rollUp(mktDays.slice(0, 4)),
    d7:  rollUp(mktDays.slice(0, 7)),
    d30: rollUp(mktDays.slice(0, 30)),
    mtd: rollUp(mtd),
  };

  // ===== Lead source detail (refined) =====
  const leadSourcesDetail = [
    { source: 'Google Ads · Search',  channel: 'paid',    leads: 98,  spend: 3120, quotes: 81, jobs: 56, revenue: 36800, cpl: 31.84, color: '#1BA8D4' },
    { source: 'Google Ads · LSA',     channel: 'paid',    leads: 44,  spend: 1160, quotes: 38, jobs: 22, revenue: 14400, cpl: 26.36, color: '#2BBDE6' },
    { source: 'Google Organic / SEO', channel: 'organic', leads: 96,  spend: 540,  quotes: 78, jobs: 56, revenue: 38400, cpl: 5.63,  color: '#0D3556' },
    { source: 'Direct / Brand',       channel: 'organic', leads: 32,  spend: 0,    quotes: 28, jobs: 22, revenue: 14200, cpl: 0,     color: '#134268' },
    { source: 'Facebook · Boosted',   channel: 'paid',    leads: 28,  spend: 540,  quotes: 16, jobs: 6,  revenue: 3800,  cpl: 19.29, color: '#7DD3E8' },
    { source: 'Facebook · Retarget',  channel: 'paid',    leads: 13,  spend: 380,  quotes: 8,  jobs: 3,  revenue: 2040,  cpl: 29.23, color: '#C8EAF3' },
    { source: 'Referrals',            channel: 'word',    leads: 51,  spend: 0,    quotes: 49, jobs: 44, revenue: 32800, cpl: 0,     color: '#15A36A' },
    { source: 'Repeat Customer',      channel: 'word',    leads: 37,  spend: 0,    quotes: 36, jobs: 35, revenue: 24300, cpl: 0,     color: '#5BD9A0' },
    { source: 'Yellow Pages',         channel: 'paid',    leads: 14,  spend: 240,  quotes: 9,  jobs: 5,  revenue: 3400,  cpl: 17.14, color: '#93A1AE' },
  ];

  // ===== SEO performance (organic + branded) =====
  const seoMetrics = {
    organicLeads:   96 + 32,
    organicRevenue: 38400 + 14200,
    impressions:    84200,
    clicks:         1840,
    ctr:            0.0218,
    avgPosition:    3.4,
    topPages: [
      { page: '/services/plumber-orewa',         clicks: 412, impressions: 8420, position: 2.1, leads: 22 },
      { page: '/services/gasfitter-silverdale',  clicks: 218, impressions: 4200, position: 1.8, leads: 14 },
      { page: '/',                               clicks: 312, impressions: 18400, position: 4.2, leads: 9 },
      { page: '/services/hot-water-cylinder',    clicks: 184, impressions: 6800, position: 3.4, leads: 12 },
      { page: '/locations/whangaparaoa',         clicks: 124, impressions: 3200, position: 2.6, leads: 8 },
      { page: '/services/emergency-plumber',     clicks: 248, impressions: 18400, position: 5.1, leads: 11 },
      { page: '/blog/winter-plumbing-checklist', clicks: 96,  impressions: 5400, position: 6.3, leads: 4 },
    ],
  };

  return {
    customers, quotes, campaigns, keywords, weeklyTrend,
    techWeekHours, hourlyLoad, weekdayLoad, jobTypeStats,
    scatter, customerGrowth, inventory, fleet, segments,
    mktDays, mktRolling, mktThresholds, leadSourcesDetail, seoMetrics,
  };
})();
