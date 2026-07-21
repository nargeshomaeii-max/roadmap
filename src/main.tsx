import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from './utils/supabase'

const originalSetItem = localStorage.setItem.bind(localStorage)
const originalRemoveItem = localStorage.removeItem.bind(localStorage)

function toJsonSafe(value: string) {
  try { JSON.parse(value); return value } catch { return JSON.stringify(value) }
}

localStorage.setItem = (key: string, value: string) => {
  originalSetItem(key, value)
  supabase.from('app_storage').upsert({ key, value: JSON.parse(toJsonSafe(value)) })
    .then(({ error }) => { if (error) console.error('Supabase sync error:', error) })
}

localStorage.removeItem = (key: string) => {
  originalRemoveItem(key)
  supabase.from('app_storage').delete().eq('key', key)
    .then(({ error }) => { if (error) console.error('Supabase delete error:', error) })
}

async function bootstrap() {
  try {
    const { data, error } = await supabase.from('app_storage').select('key, value')
    if (!error && data) {
      data.forEach(row => {
        const val = typeof row.value === 'string' ? row.value : JSON.stringify(row.value)
        originalSetItem(row.key, val)
      })
    }
  } catch (e) {
    console.error('Could not load data from Supabase, using local data', e)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
