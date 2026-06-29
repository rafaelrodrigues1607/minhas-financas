import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'nodejs18.x' }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

  const { subscription } = req.body
  if (!subscription) return res.status(400).json({ error: 'Missing subscription' })

  const { error } = await supabase.from('push_subscriptions')
    .upsert({ user_id: user.id, subscription }, { onConflict: 'user_id' })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
}
