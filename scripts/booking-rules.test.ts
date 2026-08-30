// Exercises the booking form's two new rules: which call-out rate applies
// (src/lib/callout.ts) and the migration-008 insert fallback
// (src/lib/bookings.ts). Run with: npm run test:booking
import { resolveCallout } from '../src/lib/callout';
import { isMissingBookingColumn } from '../src/lib/bookings';

let pass = 0;
let fail = 0;
function check(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}

const rate = (t: Parameters<typeof resolveCallout>[0]) => {
  const c = resolveCallout(t);
  return { afterHours: c.afterHours, rate: c.rate };
};

// --- Pick a date: judged on the chosen date/time, not "now" ---
// 2026-09-02 is a Wednesday, 2026-09-05 a Saturday, 2026-09-06 a Sunday.
check('Wed morning', rate({ urgency: 'Pick a date', preferredDate: '2026-09-02', preferredTime: 'Morning' }), { afterHours: false, rate: 199 });
check('Wed afternoon', rate({ urgency: 'Pick a date', preferredDate: '2026-09-02', preferredTime: 'Afternoon' }), { afterHours: false, rate: 199 });
check('Wed evening', rate({ urgency: 'Pick a date', preferredDate: '2026-09-02', preferredTime: 'Evening' }), { afterHours: true, rate: 379 });
check('Wed anytime', rate({ urgency: 'Pick a date', preferredDate: '2026-09-02', preferredTime: 'Anytime' }), { afterHours: false, rate: 199 });
check('Sat morning', rate({ urgency: 'Pick a date', preferredDate: '2026-09-05', preferredTime: 'Morning' }), { afterHours: true, rate: 379 });
check('Sun afternoon', rate({ urgency: 'Pick a date', preferredDate: '2026-09-06', preferredTime: 'Afternoon' }), { afterHours: true, rate: 379 });
check('Sat evening', rate({ urgency: 'Pick a date', preferredDate: '2026-09-05', preferredTime: 'Evening' }), { afterHours: true, rate: 379 });
check('Pick a date, none chosen yet', rate({ urgency: 'Pick a date', preferredTime: 'Morning' }), { afterHours: false, rate: 199 });

// --- This week: always business hours, whatever time the form is filled in ---
check('This week', rate({ urgency: 'This week' }), { afterHours: false, rate: 199 });

// --- Weekend flag ---
check('Sat flagged weekend', resolveCallout({ urgency: 'Pick a date', preferredDate: '2026-09-05', preferredTime: 'Morning' }).weekend, true);
check('Wed not weekend', resolveCallout({ urgency: 'Pick a date', preferredDate: '2026-09-02', preferredTime: 'Morning' }).weekend, false);

// --- ASAP: judged on the current NZ time. Assert the boundary rules hold
//     rather than the clock, so the test isn't time-of-day flaky. ---
const asap = resolveCallout({ urgency: 'ASAP' });
console.log(`INFO  ASAP right now -> ${asap.label} $${asap.rate} (weekend=${asap.weekend})`);
check('ASAP rate matches its own afterHours flag', asap.rate, asap.afterHours ? 379 : 199);
check('ASAP label matches', asap.label, asap.afterHours ? 'After-hours call-out' : 'Standard call-out');

// --- Missing/garbage timing falls back to "now", never throws ---
check('no timing at all does not throw', typeof resolveCallout({}).rate, 'number');
check('unknown urgency does not throw', typeof resolveCallout({ urgency: 'whenever' }).rate, 'number');
check('bad date string does not throw', typeof resolveCallout({ urgency: 'Pick a date', preferredDate: 'not-a-date' }).rate, 'number');

// --- Insert fallback: only retry without the 008 columns when that's the fault ---
check('PostgREST schema cache miss',
  isMissingBookingColumn({ code: 'PGRST204', message: "Could not find the 'request_type' column of 'bookings' in the schema cache" }), true);
check('Postgres undefined column',
  isMissingBookingColumn({ code: '42703', message: 'column "callout_rate" of relation "bookings" does not exist' }), true);
check('after_hours undefined column',
  isMissingBookingColumn({ code: '42703', message: 'column "after_hours" of relation "bookings" does not exist' }), true);
check('unrelated constraint violation is not a schema miss',
  isMissingBookingColumn({ code: '23505', message: 'duplicate key value violates unique constraint "bookings_ref_key"' }), false);
check('a different missing column is not ours',
  isMissingBookingColumn({ code: 'PGRST204', message: "Could not find the 'nickname' column of 'bookings' in the schema cache" }), false);
check('no error at all', isMissingBookingColumn(null), false);
check('error with no message', isMissingBookingColumn({ code: 'PGRST204' }), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
