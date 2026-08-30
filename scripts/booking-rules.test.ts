// Exercises the booking form's two new rules: which call-out rate applies
// (src/lib/callout.ts) and the migration-008 insert fallback
// (src/lib/bookings.ts). Run with: npm run test:booking
import {
  resolveCallout,
  isAfterHours,
  STANDARD_DAYS,
  STANDARD_START_HOUR,
  STANDARD_END_HOUR,
} from '../src/lib/callout';
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

// --- The trading window, proved across all 168 hours of the week ---------
// Counted independently of the rule itself: 5 weekdays x 10 hours (7am-4pm
// inclusive) = 50 standard hours, and every other hour of the week is
// after-hours. If someone widens the window, this count moves and says so.
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let standardHours = 0;
const wrongly: string[] = [];
for (let day = 0; day < 7; day++) {
  for (let hour = 0; hour < 24; hour++) {
    const after = isAfterHours(day, hour);
    if (!after) standardHours++;
    const shouldBeStandard =
      STANDARD_DAYS.includes(day) && hour >= STANDARD_START_HOUR && hour < STANDARD_END_HOUR;
    if (after === shouldBeStandard) wrongly.push(`${DAY[day]} ${hour}:00`);
  }
}
check('every hour of the week classified', wrongly, []);
check('exactly 50 standard hours in the week', standardHours, 50);

// The transitions, named, so a boundary slip is obvious in the output:
check('Mon 06:00 is after-hours', isAfterHours(1, 6), true);
check('Mon 07:00 opens standard', isAfterHours(1, 7), false);
check('Mon 16:00 (4pm) still standard', isAfterHours(1, 16), false);
check('Mon 17:00 (5pm) is after-hours', isAfterHours(1, 17), true);
check('Fri 16:00 still standard', isAfterHours(5, 16), false);
check('Fri 17:00 is after-hours', isAfterHours(5, 17), true);
check('Sat 09:00 is after-hours', isAfterHours(6, 9), true);
check('Sun 12:00 is after-hours', isAfterHours(0, 12), true);
check('midnight Wed is after-hours', isAfterHours(3, 0), true);

// The form only ever offers Morning / Afternoon / Evening / Anytime, so those
// are the only hours a "Pick a date" booking can land on. Morning, Afternoon
// and Anytime must be inside the window on a weekday; Evening must not be.
check('Morning slot (9am) is standard', isAfterHours(3, 9), false);
check('Afternoon slot (2pm) is standard', isAfterHours(3, 14), false);
check('Evening slot (6pm) is after-hours', isAfterHours(3, 18), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
