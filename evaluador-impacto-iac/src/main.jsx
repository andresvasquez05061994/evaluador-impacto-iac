import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { applyTheme } from './constants/theme.js'
import './index.css'

applyTheme(localStorage.getItem('iac-theme') === 'light' ? 'light' : 'dark')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
