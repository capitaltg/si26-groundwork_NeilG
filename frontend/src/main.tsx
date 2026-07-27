import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.css'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { DesignThemeProvider } from './newDesign/DesignThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DesignThemeProvider>
        <App />
      </DesignThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
