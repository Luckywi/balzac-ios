import { useState } from 'react';
import logo from '@/assets/le-balzac-logo.png';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const handleLogout = () => {
    // Implémentation future avec Firebase
    console.log('Déconnexion');
    // Redirection vers la page de login
    window.location.href = '/';
  };

  return (
    <header className="bg-gray-800 text-white shadow-md w-full">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Hamburger Icon */}
        <button 
          onClick={onToggleSidebar} 
          className="p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600"
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center justify-center">
          <img 
            src={logo} 
            alt="Le Balzac Logo" 
            className="h-10 md:h-12"
          />
        </div>

        {/* Logout Button */}
        <button 
          onClick={() => setIsLogoutConfirmOpen(true)} 
          className="p-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600"
          aria-label="Se déconnecter"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>

        {/* Logout Confirmation Modal */}
        {isLogoutConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
              <h3 className="text-xl font-medium mb-4 text-white">Confirmer la déconnexion</h3>
              <p className="mb-6 text-white">Êtes-vous sûr de vouloir vous déconnecter ?</p>
              <div className="flex justify-end space-x-3">
                <button
              
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="px-4 py-2 border border-gray-600 rounded-md text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600"
                >
                  Annuler
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}