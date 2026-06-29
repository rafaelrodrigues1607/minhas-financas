import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/react'

export const IS_NATIVE = !!(window.Capacitor?.isNativePlatform?.())
export const API_BASE = IS_NATIVE ? 'https://minhas-financas-wine-sigma.vercel.app' : ''

export let supabase = null
let _vapidPublicKey = ''

export async function initSupabase() {
  const cfg = await fetch(API_BASE + '/api/config').then(r => {
    if (!r.ok) throw new Error('config failed')
    return r.json()
  })
  supabase = createClient(cfg.url, cfg.key)
  _vapidPublicKey = cfg.vapidPublicKey || ''
  if (cfg.sentryDsn) {
    Sentry.init({ dsn: cfg.sentryDsn, environment: 'production', tracesSampleRate: 0.1 })
  }

  // Push notifications (native only — Capacitor)
  if (IS_NATIVE && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications) {
    const PN = window.Capacitor.Plugins.PushNotifications
    PN.requestPermissions().then(r => { if (r.receive === 'granted') PN.register() }).catch(() => {})
    PN.addListener('registration', t => { localStorage.setItem('fcm_token', t.value) }).catch(() => {})
    PN.addListener('pushNotificationReceived', n => { console.log('[Push]', n.title) }).catch(() => {})
    PN.addListener('pushNotificationActionPerformed', a => { console.log('[Push action]', a.actionId) }).catch(() => {})
  }
}

export async function registerPush(vapidPublicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return true // already registered

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })

    const { data: { session } } = await supabase.auth.getSession()
    await fetch(API_BASE + '/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify({ subscription: sub })
    })
    return true
  } catch { return false }
}

export function getVapidPublicKey() {
  return _vapidPublicKey
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
