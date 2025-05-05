import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface AddSectionModalProps {
  onClose: () => void;
  onSubmit: (title: string) => void;
}

const AddSectionModal = ({ onClose, onSubmit }: AddSectionModalProps) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim()) {
      setError('Le titre de la section est requis');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Ajout de la section à Firestore
      const sectionsRef = collection(db, 'sections');
      await addDoc(sectionsRef, {
        title: title.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Succès, appel du callback et fermeture
      onSubmit(title.trim());
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la section:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="bg-gray-800 px-6 py-4 rounded-t-lg">
          <h3 className="text-lg font-medium text-white">Ajouter une section</h3>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="mb-4">
              <label htmlFor="section-title" className="block text-sm font-medium text-gray-700 mb-1">
                Titre de la section
              </label>
              <input
                type="text"
                id="section-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                className="w-full bg-white px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-800 focus:border-gray-800"
                placeholder="Ex: Coupes femmes, Colorations..."
                disabled={isSubmitting}
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
          </div>
          
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-800 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ajout en cours...
                </>
              ) : (
                'Ajouter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSectionModal;