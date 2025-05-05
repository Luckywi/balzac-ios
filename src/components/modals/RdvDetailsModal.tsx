import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface CalendarEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  client?: string;
  service?: string;
  notes?: string;
  staffId?: string;
  resourceId?: string;
  price?: number;
  clientPhone?: string;
}

interface RdvDetailsModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onRefresh?: () => void;
}

const RdvDetailsModal: React.FC<RdvDetailsModalProps> = ({ event, onClose, onRefresh }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rdvData, setRdvData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      loadRdvDetails();
    }
  }, [event]);

  // Charger les détails du RDV depuis Firestore
  const loadRdvDetails = async () => {
    if (!event) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const rdvRef = doc(db, 'rdvs', event.id.toString());
      const rdvDoc = await getDoc(rdvRef);
      
      if (rdvDoc.exists()) {
        const data = rdvDoc.data();
        setRdvData(data);
      } else {
        setError("Ce rendez-vous n'existe plus dans la base de données.");
      }
    } catch (err) {
      console.error("Erreur lors du chargement des détails du rendez-vous:", err);
      setError("Impossible de charger les détails du rendez-vous.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      
      // Supprimer le rendez-vous de Firestore
      await deleteDoc(doc(db, 'rdvs', event!.id.toString()));
      
      setSuccess('Le rendez-vous a été supprimé avec succès');
      
      // Fermer la modale après 1,5 secondes
      setTimeout(() => {
        if (onRefresh) onRefresh();
        onClose();
      }, 600);
      
    } catch (err) {
      console.error("Erreur lors de la suppression du rendez-vous:", err);
      setError("Impossible de supprimer le rendez-vous. Veuillez réessayer.");
      setIsDeleting(false);
    }
  };

  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800"></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                {success}
              </div>
            )}
            
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-xl font-semibold text-gray-800">
                Détails du rendez-vous
              </h3>
              <button 
                onClick={onClose} 
                className="text-gray-800 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <div className="font-semibold">Client:</div>
                <div>{rdvData?.clientName || event.client}</div>
              </div>
              
              {(rdvData?.clientPhone || event.clientPhone) && (
                <div className="flex justify-between">
                  <div className="font-semibold">Téléphone:</div>
                  <div>{rdvData?.clientPhone || event.clientPhone}</div>
                </div>
              )}
              
              <div className="flex justify-between">
                <div className="font-semibold">Service:</div>
                <div>{rdvData?.serviceTitle || event.service}</div>
              </div>
              
              <div className="flex justify-between">
                <div className="font-semibold">Date:</div>
                <div>{format(event.start, 'dd MMMM yyyy', { locale: fr })}</div>
              </div>
              
              <div className="flex justify-between">
                <div className="font-semibold">Horaire:</div>
                <div>
                  {format(event.start, 'HH:mm', { locale: fr })} - {format(event.end, 'HH:mm', { locale: fr })}
                </div>
              </div>
              
              <div className="flex justify-between">
                <div className="font-semibold">Coiffeur:</div>
                <div>
                  {rdvData?.staffId === 'bea' ? 'Béatrice' : 
                   rdvData?.staffId === 'cyrille' ? 'Cyrille' : 
                   event.staffId === 'bea' ? 'Béatrice' : 
                   event.staffId === 'cyrille' ? 'Cyrille' : 
                   rdvData?.staffId || event.staffId}
                </div>
              </div>
              
              {(rdvData?.price !== undefined || event.price !== undefined) && (
                <div className="flex justify-between">
                  <div className="font-semibold">Prix:</div>
                  <div>{rdvData?.price || event.price} €</div>
                </div>
              )}
              
              {(rdvData?.notes || event.notes) && (
                <div className="pt-2">
                  <div className="font-semibold mb-1">Notes:</div>
                  <div className="bg-gray-50 p-3 rounded-md text-gray-700">{rdvData?.notes || event.notes}</div>
                </div>
              )}
              
              {rdvData?.source && (
                <div className="flex justify-between">
                  <div className="font-semibold">Source:</div>
                  <div>{rdvData.source === 'client' ? 'Réservation client' : 'Créé en salon'}</div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              {confirmDelete ? (
                <div className="flex items-center w-full">
                  <div className="text-red-600 flex-grow">
                    Êtes-vous sûr de vouloir supprimer ce rendez-vous ?
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-4 py-2 border border-gray-800 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      disabled={isDeleting}
                    >
                      Non
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Suppression...' : 'Oui, supprimer'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RdvDetailsModal;