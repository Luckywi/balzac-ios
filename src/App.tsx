import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initPushNotifications } from './lib/fcmService';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ServicesPage from './pages/ServicesPage';

function App() {
  useEffect(() => {
    // Initialiser les notifications push au chargement de l'application
    initPushNotifications().catch(error => {
      console.error('Error initializing push notifications:', error);
    });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/services" element={<ServicesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;