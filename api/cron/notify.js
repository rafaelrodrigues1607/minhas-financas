import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const config = { runtime: 'nodejs18.x' }

webpush.setVapidDetails(
  'mailto:rafael.rodrigues1607@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export default async function handler(req, res) {
  // Vercel cron passes Authorization: Bearer CRON_SECRET
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const fiveDaysAgo = new Date(today)
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0]

  // Fetch users with notifications enabled and their subscriptions
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('user_id, alert_day_before, alert_overdue, overdue_days')
    .eq('enabled', true)

  if (!settings?.length) return res.json({ sent: 0 })

  const userIds = settings.map(s => s.user_id)

  // Fetch subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', userIds)

  if (!subs?.length) return res.json({ sent: 0 })

  // Fetch relevant transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('user_id, description, transaction_date, type')
    .eq('type', 'expense')
    .eq('status', 'pending')
    .gte('transaction_date', fiveDaysAgoStr)
    .lte('transaction_date', tomorrowStr)
    .in('user_id', userIds)

  let sent = 0

  for (const sub of subs) {
    const userSettings = settings.find(s => s.user_id === sub.user_id)
    if (!userSettings) continue

    const userTxs = transactions?.filter(t => t.user_id === sub.user_id) || []

    for (const tx of userTxs) {
      const txDate = new Date(tx.transaction_date + 'T12:00:00')
      const diffDays = Math.round((today - txDate) / (1000 * 60 * 60 * 24))

      let payload = null

      // Due tomorrow
      if (diffDays === -1 && userSettings.alert_day_before) {
        payload = {
          title: '⚠️ Despesa vence amanhã',
          body: tx.description,
          icon: '/icons/icon-192.png',
          tag: `due-${tx.description}-${tx.transaction_date}`
        }
      }
      // Overdue (1 to overdue_days days past due)
      else if (diffDays >= 1 && diffDays <= userSettings.overdue_days && userSettings.alert_overdue) {
        payload = {
          title: `🚨 Despesa atrasada há ${diffDays} dia${diffDays > 1 ? 's' : ''}`,
          body: tx.description,
          icon: '/icons/icon-192.png',
          tag: `overdue-${tx.description}-${tx.transaction_date}-${todayStr}`
        }
      }

      if (payload) {
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify(payload))
          sent++
        } catch (e) {
          // Invalid subscription — remove it
          if (e.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('user_id', sub.user_id)
          }
        }
      }
    }
  }

  res.json({ sent })
}
