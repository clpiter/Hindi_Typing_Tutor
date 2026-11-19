import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/global.css'
import './styles/typing.css'
import './styles/animations.css'
import './styles/theme-dark.css'
import { store } from './app/store.js'
import App from './App.jsx'

// apply the saved/system light-dark theme before the first paint (no flash)
document.documentElement.setAttribute('data-bs-theme', store.getState().settings.theme || 'light')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
