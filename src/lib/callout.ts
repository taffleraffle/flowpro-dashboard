// Call-out pricing rules for the public booking form (public/book.html).
//
// Standard hours are Mon–Fri 7am–5pm NZ time. Anything outside that (early
// mornings, evenings and weekends) is an after-hours call-out. Both rates are
// a minimum charge that includes the first hour on site plus travel.
//
// NOTE: public/book.html carries a plain-JS copy of these rules so the customer
// sees the rate live as they fill the form. This module is the source of truth:
// whatever the browser showed, what gets stored and pushed to SimPro is computed
// here, in NZ time, from the timing the customer actually chose.

export const STANDARD_CALLOUT = 199; // + GST, Mon–Fri 7am–5pm
export const AFTER_HOURS_CALLOUT = 379; // + GST, evenings, early mornings, weekends

export type RequestType = 'booking' | 'quote';

export type CalloutTiming = {
  urgency?: string | null;
  preferredDate?: string | null; // 'YYYY-MM-DD'
  preferredTime?: string | null; // Morning | Afternoon | Evening | Anytime
};

export type Callout = {
  afterHours: boolean;
  weekend: boolean;
  rate: number;
  label: string;
};

// Day-of-week and hour in Pacific/Auckland, independent of the server's timezone.
function nowInNZ(): { day: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '9');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days.indexOf(weekday.slice(0, 3));
  return { day: day < 0 ? 1 : day, hour: hour === 24 ? 0 : hour };
}

export function resolveCallout(t: CalloutTiming): Callout {
  const nz = nowInNZ();
  let day = nz.day;
  let hour = nz.hour;

  const urgency = (t.urgency ?? '').toLowerCase();
  if (urgency === 'pick a date') {
    // Judge the date/time they picked, not the moment they filled the form.
    // No date chosen yet (or an unparseable one) means we'd book them into
    // normal business hours. Never inherit today's day, which would quote an
    // after-hours rate for a weekday visit just because it's the weekend now.
    const d = t.preferredDate ? new Date(`${t.preferredDate}T00:00:00`) : null;
    day = d && !Number.isNaN(d.getTime()) ? d.getDay() : 1;
    const time = (t.preferredTime ?? '').toLowerCase();
    hour = time === 'evening' ? 18 : time === 'afternoon' ? 14 : 9; // morning / anytime → business hours
  } else if (urgency === 'this week') {
    // Not urgent: we'd attend in normal business hours, whatever time they ask.
    day = 1;
    hour = 9;
  }
  // 'ASAP' (and anything unrecognised) is judged on the current NZ time.

  const weekend = day === 0 || day === 6;
  const afterHours = weekend || hour >= 17 || hour < 7;

  return {
    afterHours,
    weekend,
    rate: afterHours ? AFTER_HOURS_CALLOUT : STANDARD_CALLOUT,
    label: afterHours ? 'After-hours call-out' : 'Standard call-out',
  };
}
