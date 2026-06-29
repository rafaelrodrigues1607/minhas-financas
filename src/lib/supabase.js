import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/react'

export const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.())
export const API_BASE = IS_NATIVE ? 'https://minhas-financas-wine-sigma.vercel.app' : ''

export let supabase = null

export async function initSupabase() {
  const cfg = await fetch(API_BASE + '/api/config').then(r => {
    if (!r.ok) throw new Error('config failed')
    return r.json()
  })
  supabase = createClient(cfg.url, cfg.key)
  if (cfg.sentryDsn) {
    Sentry.init({ dsn: cfg.sentryDsn, environment: 'production', tracesSampleRate: 0.1 })
  }

  // Push notifications (native only)
  if (IS_NATIVE && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
    const PN = window.Capacitor.Plugins.PushNotifications
    PN.requestPermissions().then(r => { if (r.receive === 'granted') PN.register() }).catch(() => {})
    PN.addListener('registration', t => { localStorage.setItem('fcm_token', t.value) }).catch(() => {})
    PN.addListener('pushNotificationReceived', n => { console.log('[Push]', n.title) }).catch(() => {})
    PN.addListener('pushNotificationActionPerformed', a => { console.log('[Push action]', a.actionId) }).catch(() => {})
  }
}
