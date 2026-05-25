// Flowpro mock data — realistic small/mid Auckland plumber
window.FLOWPRO_DATA = (function () {
  // === Time series (last 30 days) ===
  const days = 30;
  const today = new Date('2026-05-14');
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }

  // Mildly seasonal, weekend dips
  function rev(i) {
    const day = dates[i].getDay();
    const base = 5200 + Math.sin(i * 0.5) * 1100 + i * 60;
    const weekendFactor = (day === 0 || day === 6) ? 0.45 : 1;
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * 500;
    return Math.round((base + noise) * weekendFactor);
  }
  const revenue = dates.map((_, i) => rev(i));
  const profit  = revenue.map((r, i) => Math.round(r * (0.22 + Math.sin(i * 0.4) * 0.04)));
  const jobs    = revenue.map((r, i) => Math.max(2, Math.round(r / (650 + Math.sin(i) * 70))));

  // === KPIs ===
  const totals = {
    revenue: revenue.reduce((a, b) => a + b, 0),
    profit:  profit.reduce((a, b) => a + b, 0),
    jobs:    jobs.reduce((a, b) => a + b, 0),
  };
  const kpis = {
    revenue:    { value: totals.revenue, prev: 152840, delta: +0.142 },
    profit:     { value: totals.profit,  prev: 33420,  delta: +0.181 },
    margin:     { value: totals.profit / totals.revenue, prev: 0.215, delta: +0.012 },
    jobsDone:   { value: totals.jobs,    prev: 226,    delta: +0.106 },
    avgTicket:  { value: totals.revenue / totals.jobs, prev: 676, delta: +0.038 },
    avgDistKm:  { value: 12.4,           prev: 14.1,   delta: -0.121 },
    convRate:   { value: 0.673,          prev: 0.612,  delta: +0.061 },
    custSat:    { value: 4.82,           prev: 4.79,   delta: +0.006 },
  };

  // === Revenue by service category ===
  const categories = [
    { key: 'plumbing',   label: 'Plumbing',         revenue: 71240, jobs: 132, color: '#1BA8D4', avgTicket: 540 },
    { key: 'gasfitting', label: 'Gasfitting',       revenue: 38150, jobs: 41,  color: '#0D3556', avgTicket: 931 },
    { key: 'hotwater',   label: 'Hot Water',        revenue: 32480, jobs: 28,  color: '#7DD3E8', avgTicket: 1160 },
    { key: 'commercial', label: 'Commercial',       revenue: 22900, jobs: 11,  color: '#134268', avgTicket: 2082 },
    { key: 'drainage',   label: 'Drainage',         revenue: 8120,  jobs: 19,  color: '#2BBDE6', avgTicket: 427 },
    { key: 'emergency',  label: 'Emergency / 24hr', revenue: 5680,  jobs: 19,  color: '#E8A93C', avgTicket: 299 },
  ];

  // === Lead sources ===
  const leadSources = [
    { name: 'Google Ads',        leads: 142, quoted: 119, won: 78, revenue: 51200, spend: 4280, color: '#1BA8D4' },
    { name: 'Google Organic',    leads: 96,  quoted: 78,  won: 56, revenue: 38400, spend: 1100, color: '#0D3556' },
    { name: 'Referrals',         leads: 51,  quoted: 49,  won: 44, revenue: 32800, spend: 0,    color: '#15A36A' },
    { name: 'Repeat Customer',   leads: 37,  quoted: 36,  won: 35, revenue: 24300, spend: 0,    color: '#7DD3E8' },
    { name: 'Facebook',          leads: 41,  quoted: 24,  won: 11, revenue: 6840,  spend: 920,  color: '#134268' },
    { name: 'Direct Call',       leads: 28,  quoted: 23,  won: 18, revenue: 12200, spend: 0,    color: '#2BBDE6' },
    { name: 'Yellow Pages / Listings', leads: 14, quoted: 9, won: 5, revenue: 3400,  spend: 240, color: '#93A1AE' },
  ];

  // === Auckland suburbs & job geo distribution ===
  // Coords are PERCENT inside a faux Auckland tile, not real lat/lng.
  const suburbs = [
    { name: 'Silverdale',  x: 50, y: 18, jobs: 47, revenue: 28100, distKm: 0.5,  primary: true },
    { name: 'Orewa',       x: 56, y: 12, jobs: 39, revenue: 22600, distKm: 4.2 },
    { name: 'Whangaparāoa',x: 64, y: 18, jobs: 28, revenue: 17200, distKm: 7.5 },
    { name: 'Albany',      x: 47, y: 32, jobs: 26, revenue: 19800, distKm: 14.1 },
    { name: 'Red Beach',   x: 60, y: 17, jobs: 22, revenue: 11400, distKm: 3.8 },
    { name: 'Dairy Flat',  x: 40, y: 28, jobs: 18, revenue: 12100, distKm: 9.7 },
    { name: 'Stanmore Bay',x: 62, y: 20, jobs: 15, revenue: 7900,  distKm: 5.2 },
    { name: 'Wainui',      x: 42, y: 22, jobs: 12, revenue: 8400,  distKm: 8.1 },
    { name: 'Browns Bay',  x: 53, y: 40, jobs: 11, revenue: 7600,  distKm: 17.6 },
    { name: 'Takapuna',    x: 49, y: 53, jobs: 9,  revenue: 7100,  distKm: 24.8 },
    { name: 'North Shore CBD', x: 51, y: 58, jobs: 7, revenue: 5300, distKm: 27.4 },
    { name: 'Auckland CBD', x: 48, y: 70, jobs: 5, revenue: 6800,  distKm: 32.1 },
    { name: 'Helensville', x: 22, y: 38, jobs: 3,  revenue: 2700,  distKm: 36.8 },
    { name: 'Warkworth',   x: 48, y: 5,  jobs: 8,  revenue: 5400,  distKm: 28.2 },
  ];

  // === Crew / technicians ===
  const crew = [
    { name: 'Mark Pearse',     initials: 'MP', role: 'Master Plumber',  jobsWeek: 18, revenue: 11240, rating: 4.94, onTime: 0.96, util: 0.88, status: 'active' },
    { name: 'Jaden Komene',    initials: 'JK', role: 'Senior Gasfitter',jobsWeek: 14, revenue: 13860, rating: 4.91, onTime: 0.93, util: 0.84, status: 'active' },
    { name: 'Sione Tupou',     initials: 'ST', role: 'Plumber',         jobsWeek: 16, revenue: 8420,  rating: 4.79, onTime: 0.91, util: 0.81, status: 'active' },
    { name: 'Liam Foster',     initials: 'LF', role: 'Apprentice',      jobsWeek: 12, revenue: 4180,  rating: 4.71, onTime: 0.88, util: 0.74, status: 'active' },
    { name: 'Hemi Williams',   initials: 'HW', role: 'Drainlayer',      jobsWeek: 9,  revenue: 5240,  rating: 4.83, onTime: 0.94, util: 0.79, status: 'leave' },
    { name: 'Aroha Tane',      initials: 'AT', role: 'Plumber',         jobsWeek: 11, revenue: 6120,  rating: 4.88, onTime: 0.92, util: 0.77, status: 'active' },
  ];

  // === Job pipeline ===
  const pipeline = {
    inquiry: [
      { id: 'J-1842', title: 'Burst pipe under kitchen sink', customer: 'R. Patel',     suburb: 'Orewa',       price: 480, type: 'Plumbing', urgency: 'high', age: '2h' },
      { id: 'J-1841', title: 'Hot water cylinder replace',    customer: 'S. McKenzie',  suburb: 'Silverdale',  price: 2400, type: 'Hot Water', urgency: 'med', age: '5h' },
      { id: 'J-1840', title: 'Gas hob installation',          customer: 'D. Liu',       suburb: 'Albany',      price: 780, type: 'Gasfitting', urgency: 'low', age: '8h' },
      { id: 'J-1839', title: 'Repipe — 3 bath, 1980s home',   customer: 'Howe family',  suburb: 'Red Beach',   price: 8200,type: 'Plumbing',   urgency: 'med', age: '1d' },
    ],
    quoted: [
      { id: 'J-1835', title: 'Bathroom reno fixtures',        customer: 'Coastal Build Ltd', suburb: 'Whangaparāoa', price: 6400, type: 'Commercial', urgency: 'med', age: '2d' },
      { id: 'J-1833', title: 'Gas appliance certify',         customer: 'B. Thompson',  suburb: 'Stanmore Bay',price: 320, type: 'Gasfitting', urgency: 'low', age: '3d' },
      { id: 'J-1830', title: 'Drainage CCTV inspection',      customer: 'C. Nguyen',    suburb: 'Dairy Flat',  price: 540, type: 'Drainage',   urgency: 'low', age: '4d' },
    ],
    scheduled: [
      { id: 'J-1828', title: 'Hot water cylinder install',    customer: 'Walters',      suburb: 'Orewa',       price: 2680, type: 'Hot Water', urgency: 'med', age: 'Tomorrow' },
      { id: 'J-1826', title: 'Mainline water repair',         customer: 'Hema Taituha', suburb: 'Silverdale',  price: 1240, type: 'Plumbing',  urgency: 'high', age: 'Today 2pm' },
      { id: 'J-1825', title: 'LPG hob install + cert',        customer: 'A. Park',      suburb: 'Albany',      price: 920,  type: 'Gasfitting',urgency: 'low', age: 'Fri 9am' },
      { id: 'J-1820', title: 'Commercial gas service',        customer: 'Westfield F&B',suburb: 'Albany',      price: 3800, type: 'Commercial',urgency: 'med', age: 'Sat 7am' },
    ],
    onsite: [
      { id: 'J-1815', title: 'Emergency burst pipe',          customer: 'Mrs. Karaitiana',suburb: 'Orewa',     price: 760,  type: 'Emergency', urgency: 'high', age: 'Now' },
      { id: 'J-1813', title: 'Pipe repair + replace',         customer: 'K. Singh',     suburb: 'Silverdale',  price: 1180, type: 'Plumbing',  urgency: 'med',  age: '2h in' },
    ],
    invoiced: [
      { id: 'J-1809', title: 'Hot water cylinder replace',    customer: 'D. Brookes',   suburb: 'Red Beach',   price: 2480, type: 'Hot Water', urgency: 'low', age: 'Due 5d' },
      { id: 'J-1807', title: 'Drain unblock',                 customer: 'V. Hassan',    suburb: 'Whangaparāoa',price: 380,  type: 'Drainage', urgency: 'low', age: 'Due 8d' },
      { id: 'J-1805', title: 'Commercial plumbing repair',    customer: 'KFC Albany',   suburb: 'Albany',      price: 2240, type: 'Commercial', urgency: 'med', age: 'OVERDUE' },
    ],
    paid: [
      { id: 'J-1798', title: 'Bathroom reno final',           customer: 'Howe family',  suburb: 'Red Beach',   price: 8200, type: 'Plumbing', urgency: 'low', age: 'Paid' },
      { id: 'J-1795', title: 'Repipe',                        customer: 'B. Walker',    suburb: 'Dairy Flat',  price: 4600, type: 'Plumbing', urgency: 'low', age: 'Paid' },
    ],
  };

  // === Today's schedule ===
  const schedule = [
    { time: '7:30',  end: '9:00',  job: 'Hot water cylinder install',  customer: 'Walters',       suburb: 'Orewa',       tech: 'MP', type: 'Hot Water',   status: 'done' },
    { time: '9:15',  end: '10:30', job: 'Mainline water repair',       customer: 'Hema Taituha',  suburb: 'Silverdale',  tech: 'ST', type: 'Plumbing',    status: 'done' },
    { time: '10:30', end: '12:00', job: 'Emergency burst pipe',        customer: 'Mrs. Karaitiana', suburb: 'Orewa',     tech: 'MP', type: 'Emergency',   status: 'onsite' },
    { time: '11:00', end: '13:00', job: 'LPG hob install + cert',      customer: 'A. Park',       suburb: 'Albany',      tech: 'JK', type: 'Gasfitting',  status: 'onsite' },
    { time: '13:30', end: '15:00', job: 'Pipe repair + replace',       customer: 'K. Singh',      suburb: 'Silverdale',  tech: 'ST', type: 'Plumbing',    status: 'scheduled' },
    { time: '14:00', end: '15:30', job: 'Gas appliance certify',       customer: 'B. Thompson',   suburb: 'Stanmore Bay',tech: 'JK', type: 'Gasfitting',  status: 'scheduled' },
    { time: '15:30', end: '17:00', job: 'Drainage CCTV inspection',    customer: 'C. Nguyen',     suburb: 'Dairy Flat',  tech: 'HW', type: 'Drainage',    status: 'scheduled' },
    { time: '16:00', end: '17:30', job: 'Apprentice ride-along',       customer: 'Training',      suburb: 'Albany',      tech: 'LF', type: 'Plumbing',    status: 'scheduled' },
  ];

  // === Best quality jobs (composite: margin + rating + on-time + value) ===
  const bestJobs = [
    { id: 'J-1798', title: 'Bathroom reno final',     customer: 'Howe family',  suburb: 'Red Beach',     value: 8200, margin: 0.34, rating: 5, score: 96, tech: 'MP', type: 'Plumbing' },
    { id: 'J-1820', title: 'Commercial gas service',  customer: 'Westfield F&B',suburb: 'Albany',        value: 3800, margin: 0.41, rating: 5, score: 95, tech: 'JK', type: 'Commercial' },
    { id: 'J-1795', title: 'Repipe — single story',   customer: 'B. Walker',    suburb: 'Dairy Flat',    value: 4600, margin: 0.29, rating: 5, score: 91, tech: 'MP', type: 'Plumbing' },
    { id: 'J-1809', title: 'Hot water cylinder',      customer: 'D. Brookes',   suburb: 'Red Beach',     value: 2480, margin: 0.33, rating: 5, score: 89, tech: 'AT', type: 'Hot Water' },
    { id: 'J-1828', title: 'HW cylinder install',     customer: 'Walters',      suburb: 'Orewa',         value: 2680, margin: 0.31, rating: 5, score: 88, tech: 'MP', type: 'Hot Water' },
    { id: 'J-1841', title: 'HW cylinder replace',     customer: 'S. McKenzie',  suburb: 'Silverdale',    value: 2400, margin: 0.30, rating: 4.9, score: 86, tech: 'AT', type: 'Hot Water' },
  ];

  // === AR aging (unpaid invoices) ===
  const arAging = [
    { bucket: 'Current (0–14d)', amount: 18400, count: 24, color: '#15A36A' },
    { bucket: '15–30 days',      amount: 7820,  count: 9,  color: '#1BA8D4' },
    { bucket: '31–60 days',      amount: 4120,  count: 4,  color: '#E8A93C' },
    { bucket: '60+ days',        amount: 2240,  count: 2,  color: '#D14543' },
  ];

  // === Reviews ===
  const reviews = {
    avg: 4.82,
    count: 312,
    delta30d: +7,
    starDist: [
      { stars: 5, count: 268 },
      { stars: 4, count: 32 },
      { stars: 3, count: 8 },
      { stars: 2, count: 3 },
      { stars: 1, count: 1 },
    ],
    recent: [
      { name: 'Sarah M.', stars: 5, suburb: 'Orewa', tech: 'MP', text: 'Mark fixed our burst pipe at 9pm on a Sunday. Calm, clean, and explained everything. Saved our kitchen floor.', date: '2d' },
      { name: 'Daniel K.', stars: 5, suburb: 'Silverdale', tech: 'JK', text: 'Quick gas hob install, certified same day. Pricing was upfront and exactly what was quoted.', date: '4d' },
      { name: 'Heidi R.', stars: 4, suburb: 'Whangaparāoa', tech: 'ST', text: 'Good work overall. Had to come back to tighten a fitting, but no extra charge and very polite.', date: '6d' },
    ],
  };

  // === Marketing funnel & spend ===
  const funnel = [
    { stage: 'Impressions', value: 142800 },
    { stage: 'Leads',       value: 409 },
    { stage: 'Quotes Sent', value: 338 },
    { stage: 'Quotes Won',  value: 247 },
    { stage: 'Repeat (90d)',value: 89 },
  ];

  // === Operations metrics ===
  const ops = {
    avgResponseMin: 38,
    firstTimeFix:   0.91,
    callbackRate:   0.04,
    techUtil:       0.81,
    onTimeArrival:  0.93,
    avgJobMinutes:  104,
    avgTravelMin:   23,
  };

  // === Alerts / insights ===
  const insights = [
    { type: 'warn',   icon: 'alert', text: '3 invoices are 60+ days overdue ($2,240). Consider sending statement.' },
    { type: 'good',   icon: 'trend', text: 'Hot water jobs trending +28% MoM — driven by autumn cylinder swaps.' },
    { type: 'info',   icon: 'spark', text: 'Facebook ROI down 41% — pause spend or refresh creative.' },
    { type: 'good',   icon: 'star',  text: 'Mark Pearse hit 4.94★ across 18 jobs this week.' },
  ];

  return {
    dates, revenue, profit, jobs,
    kpis, categories, leadSources, suburbs, crew, pipeline,
    schedule, bestJobs, arAging, reviews, funnel, ops, insights,
  };
})();
