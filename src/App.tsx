import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ServicesPage from './pages/ServicesPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/services" element={<ServicesPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App