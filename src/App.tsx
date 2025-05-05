import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react' // Importez useEffect
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ServicesPage from './pages/ServicesPage'
import { initFCM } from './lib/fcmService' // Ajustez le chemin selon votre structure de fichiers

function App() {
  // Ajoutez ce hook useEffect pour initialiser FCM au chargement
  useEffect(() => {
    // Initialisation du service FCM
    initFCM();
    // Le tableau vide [] signifie que cela ne s'exécutera qu'une seule fois au montage du composant
  }, []);

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