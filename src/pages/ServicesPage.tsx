import { useState, useEffect } from 'react'
import Header from '../components/header/Header'
import Sidebar from '../components/sidebar/Sidebar'
import Staff from '../components/services/Staff'
import DispoSalon from '../components/services/DispoSalon'
import Service from '../components/services/Service'

export default function ServicesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('services'); // Active l'onglet services

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };
  
  // Fonction pour changer d'onglet
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    closeSidebar(); // Ferme le sidebar après sélection sur mobile
  };
  
  // Désactive le défilement du contenu principal quand la sidebar est ouverte
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-300 flex flex-col">

      <Header onToggleSidebar={toggleSidebar} />
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} onTabChange={handleTabChange} activeTab={activeTab} />
      
      <main className="flex-grow p-4">
        <div className="container mx-auto">
          <div className="mb-6">
            
             {/* Section 1: Personnel */}
             <div className="mb-8">
              <Staff />
            </div>

            {/* Section 2: Horaires du salon */}
            <div className="mb-8">
              <DispoSalon />
            </div>

            {/* Section 3: Liste des services */}
            <div className="mb-8">
              <Service />
            </div>
  
          </div>
        </div>
      </main>
    </div>
  )
}