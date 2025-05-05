import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen, onClose, activeTab, onTabChange }) => {
  const navigate = useNavigate();
  
  // Fonction pour gérer la navigation
  const handleNavigation = (tab: string) => {
    onTabChange(tab);
    
    // Navigation basée sur l'onglet sélectionné
    switch(tab) {
      case 'calendar':
        navigate('/dashboard');
        break;
      case 'clients':
        // À implémenter plus tard quand la page clients sera créée
        navigate('/dashboard'); // Pour l'instant, reste sur dashboard
        break;
      case 'services':
        navigate('/services');
        break;
      default:
        navigate('/dashboard');
    }
  }
  
  return (
    <>
      {/* La sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 text-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-8 text-white">Menu</h2>
          <nav>
            <ul className="space-y-6">
              <li>
                <button 
                  onClick={() => handleNavigation('calendar')}
                  className={`flex items-center w-full space-x-3 py-2 px-3 rounded-md transition-colors ${
                    activeTab === 'calendar' 
                      ? 'bg-gray-700 text-white' 
                      : 'text-gray-100 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span className="font-medium">Calendrier</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleNavigation('clients')}
                  className={`flex items-center w-full space-x-3 py-2 px-3 rounded-md transition-colors ${
                    activeTab === 'clients' 
                      ? 'bg-gray-700 text-white' 
                      : 'text-gray-100 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span className="font-medium">Clients</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleNavigation('services')}
                  className={`flex items-center w-full space-x-3 py-2 px-3 rounded-md transition-colors ${
                    activeTab === 'services' 
                      ? 'bg-gray-700 text-white' 
                      : 'text-gray-100 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.5 20.25h-9a1.5 1.5 0 01-1.5-1.5v-10.5a1.5 1.5 0 011.5-1.5h9a1.5 1.5 0 011.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5z" />
                  </svg>
                  <span className="font-medium">Services</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Overlay pour fermer la sidebar */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;