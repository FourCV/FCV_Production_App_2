import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#fff', color: '#1c2740', border: '1px solid #e2e6ec', borderRadius: '8px', fontSize: '13.5px', fontFamily: "'Brandon Grotesque', 'DM Sans', sans-serif" },
        success: { iconTheme: { primary: '#40A295', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#F16623', secondary: '#fff' } },
      }}/>
    </BrowserRouter>
  </React.StrictMode>
)
