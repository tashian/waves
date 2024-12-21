import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import WaveformPlayer from './WaveformPlayer.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WaveformPlayer />
  </StrictMode>,
)
