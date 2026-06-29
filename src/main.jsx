import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { initSupabase } from './lib/supabase.js'

const bootMsg = document.getElementById('boot-msg')

async function boot() {
  try {
    await initSupabase()
    const root = ReactDOM.createRoot(document.getElementById('root'))
    root.render(<App />)
    bootMsg?.classList.add('hidden')
  } catch (e) {
    if (bootMsg) {
      bootMsg.innerHTML = `<div style="padding:24px;color:#f87171;text-align:center">
        <div style="font-size:28px;margin-bottom:12px">⚠️</div>
        <b>Erro ao carregar configuração</b><br>
        <span style="font-size:12px;color:#94a3b8">Verifique sua conexão e recarregue.</span>
      </div>`
    }
  }
}

boot()

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
