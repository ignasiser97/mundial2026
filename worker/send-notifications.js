// Runs every 5 min via GitHub Actions cron.
// For each Spain match, checks whether a scheduled notification falls within
// the last 5-minute window and hasn't been sent yet.

const webpush  = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Match data (flag === 1) ─────────────────────────────────────
const SPAIN_MATCHES = [
  {
    date: '2026-06-15', time: '18:00',
    name: 'España vs Cabo Verde',
    venue: 'Mercedes-Benz Stadium, Atlanta',
    channel: 'DAZN + La 1',
  },
  {
    date: '2026-06-21', time: '18:00',
    name: 'España vs Arabia Saudí',
    venue: 'Mercedes-Benz Stadium, Atlanta',
    channel: 'DAZN + La 1',
  },
  {
    date: '2026-06-27', time: '02:00',
    name: 'Uruguay vs España',
    venue: 'Estadio Akron, Guadalajara',
    channel: 'DAZN + La 1',
  },
];

// ── Timezone helpers ────────────────────────────────────────────

// Converts a Madrid date+time string to UTC milliseconds (handles CET/CEST).
function spainToUTC(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mn]    = timeStr.split(':').map(Number);
  const refUTC     = Date.UTC(y, mo - 1, d, 12);
  const refSpain   = new Date(refUTC).toLocaleString('sv', { timeZone: 'Europe/Madrid' });
  const offsetH    = parseInt(refSpain.split('T')[1]) - 12;
  return Date.UTC(y, mo - 1, d, h - offsetH, mn);
}

// Returns the UTC timestamp for the "quinielas open" notification.
// For matches before 06:00 Madrid, notifies the previous evening at 21:00.
function getOpenNotifUTC(match) {
  const kickoffH = parseInt(match.time.split(':')[0]);
  if (kickoffH < 6) {
    const kickoffUTC = spainToUTC(match.date, match.time);
    const prevDateStr = new Date(kickoffUTC - 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    return spainToUTC(prevDateStr, '21:00');
  }
  return spainToUTC(match.date, '09:00');
}

// Subtract minutes from a "HH:MM" string, returns "HH:MM".
function subtractMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total  = h * 60 + m - mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── Supabase deduplication ──────────────────────────────────────

async function hasBeenSent(key) {
  const { data } = await supabase
    .from('sent_notifications')
    .select('id')
    .eq('key', key)
    .maybeSingle();
  return !!data;
}

async function markSent(key) {
  await supabase.from('sent_notifications').insert({ key });
}

// ── Web Push dispatch ───────────────────────────────────────────

async function sendToAll(payload) {
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (error) { console.error('Error fetching subscriptions:', error); return; }
  if (!subs?.length) { console.log('No subscriptions, skipping.'); return; }

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      ).catch(async err => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          console.log('Removed expired subscription:', sub.endpoint.slice(-20));
        }
        throw err;
      })
    )
  );

  const ok   = results.filter(r => r.status === 'fulfilled').length;
  const fail = results.filter(r => r.status === 'rejected').length;
  console.log(`Delivered: ${ok}/${subs.length} (${fail} failed)`);
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const now    = Date.now();
  const WINDOW = 5 * 60 * 1000; // must match cron interval

  for (const match of SPAIN_MATCHES) {
    const kickoffUTC = spainToUTC(match.date, match.time);
    const closeTime  = subtractMinutes(match.time, 5);

    const candidates = [
      {
        key: `${match.date}_${match.time}_open`,
        target: getOpenNotifUTC(match),
        payload: {
          title: '🇪🇸 ¡Hoy juega España!',
          body: `${match.name} · ${match.time}h · Quinielas hasta las ${closeTime}h`,
          tag: `${match.date}_open`,
          url: './',
        },
      },
      {
        key: `${match.date}_${match.time}_30min`,
        target: kickoffUTC - 30 * 60 * 1000,
        payload: {
          title: '⏱️ España juega en 30 minutos',
          body: `${match.name} · ${match.venue} · ${match.channel}`,
          tag: `${match.date}_30min`,
          url: './',
        },
      },
      {
        key: `${match.date}_${match.time}_5min`,
        target: kickoffUTC - 5 * 60 * 1000,
        payload: {
          title: '🔒 Quinielas cerrándose en 5 minutos',
          body: `${match.name} · Cierre a las ${closeTime}h`,
          tag: `${match.date}_5min`,
          url: './',
        },
      },
    ];

    for (const notif of candidates) {
      // Target fell within the last WINDOW ms (i.e., since our last cron run)
      if (notif.target > now - WINDOW && notif.target <= now) {
        if (!(await hasBeenSent(notif.key))) {
          console.log(`Sending [${notif.key}]`);
          await sendToAll(notif.payload);
          await markSent(notif.key);
        } else {
          console.log(`Already sent [${notif.key}], skipping.`);
        }
      }
    }
  }

  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
