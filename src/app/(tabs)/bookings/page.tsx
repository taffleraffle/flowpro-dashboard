import { TopBar, SubBar, PageFooter } from '@/components/Shell';
import { getActiveErrors } from '@/lib/metrics';
import { getRecentBookings, type BookingStatus } from '@/lib/bookings';
import { SendBookingLink } from '@/components/SendBookingLink';

export const dynamic = 'force-dynamic';

const STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  sent_to_simpro: { label: 'Sent to SimPro', cls: 'green' },
  new: { label: 'Saved · not yet in SimPro', cls: 'amber' },
  error: { label: 'SimPro error', cls: 'red' },
};

export default async function BookingsPage() {
  const [bookings, errorRuns] = await Promise.all([getRecentBookings(100), getActiveErrors()]);

  return (
    <>
      <TopBar syncErrors={errorRuns.length} />
      <SubBar title="Bookings" crumb="Dashboard · Bookings" showFilters={false} />
      <div className="page">
        <SendBookingLink />
        <div className="card">
          <div className="card-h">
            <div>
              <div className="eyebrow">Online bookings</div>
              <h3 className="card-title">Submitted via the booking form</h3>
              <div className="card-sub">
                Each booking or quote request creates a Customer + Lead in SimPro automatically.
              </div>
            </div>
            <span className="badge cyan">{bookings.length} total</span>
          </div>
          <div className="card-b">
            {bookings.length === 0 ? (
              <div className="muted" style={{ padding: '28px 0', textAlign: 'center' }}>
                No bookings yet — they appear here the moment a customer submits the form.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {bookings.map((b) => {
                  const s = STATUS[b.status] ?? STATUS.new;
                  const isQuote = b.request_type === 'quote';
                  // Rate the customer was shown. Quotes commit to no call-out.
                  const rate = isQuote
                    ? 'Quote first, no call-out fee yet'
                    : b.callout_rate != null
                      ? `${b.after_hours ? 'After-hours' : 'Standard'} call-out · $${Number(b.callout_rate)} + GST`
                      : null;
                  const when = b.preferred_date
                    ? `${b.preferred_date}${b.preferred_time ? ` · ${b.preferred_time}` : ''}`
                    : b.urgency;
                  return (
                    <div
                      key={b.id}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '12px 14px',
                        background: b.seen ? 'var(--surface)' : 'var(--cyan-50)',
                      }}
                    >
                      <div className="stack-h" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div className="stack-h" style={{ gap: 10 }}>
                          <span style={{ fontWeight: 700 }}>{b.ref}</span>
                          <span className={`badge ${isQuote ? 'amber' : 'cyan'}`}>
                            {isQuote ? 'Quote request' : 'Job booking'}
                          </span>
                          <span className={`badge ${s.cls}`}>{s.label}</span>
                          {b.simpro_lead_id ? <span className="badge">Lead #{b.simpro_lead_id}</span> : null}
                        </div>
                        <span className="tiny muted">{new Date(b.created_at).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' })}</span>
                      </div>

                      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{b.name}</div>
                          <div className="tiny muted">{b.phone} · {b.email}</div>
                          <div className="tiny muted" style={{ marginTop: 2 }}>{b.address}</div>
                          {b.owner_or_tenant ? <div className="tiny muted" style={{ marginTop: 2 }}>{b.owner_or_tenant}</div> : null}
                        </div>
                        <div>
                          <div className="tiny">
                            <span style={{ fontWeight: 600 }}>{b.service ?? 'Service —'}</span>
                            {when ? <span className="muted"> · {when}</span> : null}
                          </div>
                          {rate ? (
                            <div
                              className="tiny"
                              style={{ marginTop: 2, fontWeight: 600, color: b.after_hours ? 'var(--warn)' : 'var(--muted)' }}
                            >
                              {rate}
                            </div>
                          ) : null}
                          {b.description ? (
                            <div className="tiny muted" style={{ marginTop: 2 }}>{b.description.slice(0, 160)}</div>
                          ) : null}
                          {b.photo_urls?.length ? (
                            <div className="stack-h" style={{ gap: 6, marginTop: 6 }}>
                              {b.photo_urls.slice(0, 4).map((u, i) => (
                                <a key={i} href={u} target="_blank" rel="noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={u} alt="" width={42} height={42} style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {b.simpro_error ? (
                        <div className="tiny" style={{ marginTop: 8, color: 'var(--danger)' }}>
                          SimPro: {b.simpro_error.slice(0, 160)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <PageFooter />
      </div>
    </>
  );
}
