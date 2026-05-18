import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Registra o Service Worker PWA com atualização automática silenciosa
// Quando uma nova versão estiver disponível, atualiza sem interromper o show!
registerSW({
  onRegistered(r) {
    // Verifica atualizações a cada 60 minutos (quando online)
    r && setInterval(() => r.update(), 60 * 60 * 1000)
  },
  onOfflineReady() {
    console.log('✅ Palco VS: App pronto para uso offline!')
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
