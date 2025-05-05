import { useState, useEffect } from 'react';
import { 
  collection, getDocs, doc, deleteDoc, 
  query, orderBy, onSnapshot, where
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import AddSectionModal from '../modals/AddSectionModal';
import EditSectionModal from '../modals/EditSectionModal';
import AddServiceModal from '../modals/AddServiceModal';
import EditServiceModal from '../modals/EditServiceModal';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PlusCircle, Edit, Trash2, Scissors, Tag } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

// Interfaces mises à jour
interface ServiceItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  originalPrice: number;
  discountedPrice?: number;
  discount?: number;
  sectionId: string;
}

interface ServiceData {
  title: string;
  description: string;
  duration: string;
  originalPrice: string;
  discount: string;
}

interface ServiceSection {
  id: string;
  title: string;
  services: ServiceItem[];
  isOpen: boolean;
  createdAt?: any;
}

const Service = () => {
  const [sections, setSections] = useState<ServiceSection[]>([]);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Charger les sections et les services au chargement du composant
  useEffect(() => {
    loadData();
  }, []);
  
  // Charger les données depuis Firestore
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Créer un abonnement aux changements de sections
      const sectionsQuery = query(collection(db, 'sections'), orderBy('createdAt', 'asc'));
      const unsubscribeSections = onSnapshot(sectionsQuery, (sectionsSnapshot) => {
        const sectionsData: ServiceSection[] = sectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          services: [],
          isOpen: true,
          createdAt: doc.data().createdAt
        }));
        
        // Créer un abonnement aux changements de services
        const servicesQuery = query(collection(db, 'services'));
        const unsubscribeServices = onSnapshot(servicesQuery, (servicesSnapshot) => {
          const servicesData: ServiceItem[] = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title,
            description: doc.data().description || '',
            duration: doc.data().duration || 30,
            originalPrice: doc.data().originalPrice || 0,
            discountedPrice: doc.data().discountedPrice,
            discount: doc.data().discount,
            sectionId: doc.data().sectionId
          }));
          
          // Associer les services à leurs sections
          const sectionsWithServices = sectionsData.map(section => {
            const sectionServices = servicesData.filter(service => service.sectionId === section.id);
            return {
              ...section,
              services: sectionServices
            };
          });
          
          setSections(sectionsWithServices);
          setIsLoading(false);
        });
        
        // Nettoyer l'abonnement des services quand le composant est démonté
        return () => {
          unsubscribeServices();
        };
      }, (err) => {
        console.error("Erreur lors de l'abonnement aux sections:", err);
        setError("Impossible de charger les données. Veuillez réessayer.");
        setIsLoading(false);
      });
      
      // Nettoyer l'abonnement des sections quand le composant est démonté
      return () => {
        unsubscribeSections();
      };
      
    } catch (err) {
      console.error("Erreur lors du chargement des données:", err);
      setError("Une erreur est survenue lors du chargement des données.");
      setIsLoading(false);
    }
  };
  
  // Fonctions pour les sections
  const handleAddSection = (title: string) => {
    setIsAddSectionModalOpen(false);
  };


  const handleEditSection = async (id: string, title: string) => {
    setIsEditSectionModalOpen(false);
    setCurrentSectionId(null);
  };
  
  const handleDeleteSection = async (sectionId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette section et tous ses services ?")) {
      try {
        // 1. Supprimer tous les services de cette section
        const servicesQuery = query(
          collection(db, 'services'), 
          where('sectionId', '==', sectionId)
        );
        const servicesSnapshot = await getDocs(servicesQuery);
        
        const deletePromises = servicesSnapshot.docs.map(serviceDoc => 
          deleteDoc(doc(db, 'services', serviceDoc.id))
        );
        
        await Promise.all(deletePromises);
        
        // 2. Supprimer la section
        await deleteDoc(doc(db, 'sections', sectionId));
        
        // Les modifications seront reflétées par l'abonnement onSnapshot
        
      } catch (err) {
        console.error("Erreur lors de la suppression de la section:", err);
        setError("Une erreur est survenue lors de la suppression. Veuillez réessayer.");
      }
    }
  };
  
  const openEditSectionModal = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setIsEditSectionModalOpen(true);
  };

  // Fonctions pour les services
  const handleAddService = (serviceData: ServiceData) => {
    setIsAddServiceModalOpen(false);
    setCurrentSectionId(null);
  };
  
  const handleEditService = (serviceData: ServiceData) => {
    setIsEditServiceModalOpen(false);
    setCurrentSectionId(null);
    setCurrentServiceId(null);
  };
  
  const handleDeleteService = async (serviceId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce service ?")) {
      try {
        await deleteDoc(doc(db, 'services', serviceId));
        // Les modifications seront reflétées par l'abonnement onSnapshot
      } catch (err) {
        console.error("Erreur lors de la suppression du service:", err);
        setError("Une erreur est survenue lors de la suppression. Veuillez réessayer.");
      }
    }
  };
  
  const openAddServiceModal = (sectionId: string) => {
    setCurrentSectionId(sectionId);
    setIsAddServiceModalOpen(true);
  };
  
  const openEditServiceModal = (sectionId: string, serviceId: string) => {
    setCurrentSectionId(sectionId);
    setCurrentServiceId(serviceId);
    setIsEditServiceModalOpen(true);
  };
  
  // Fonction pour formater le prix
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };
  
  // Fonction pour formater la durée
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 
        ? `${hours}h${remainingMinutes.toString().padStart(2, '0')}`
        : `${hours}h`;
    }
  };

  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Services proposés</h2>
        </div>
        <div className="p-6 flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-gray-800 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Chargement des services...</p>
          </div>
        </div>
      </div>
    );
  }

  // Afficher un message d'erreur
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Services proposés</h2>
        </div>
        <div className="p-6 flex justify-center items-center h-64">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <svg className="h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-800 font-medium mb-2">Erreur de chargement</p>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={loadData}
              variant="default"
              className="bg-gray-800 hover:bg-gray-700"
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* En-tête */}
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Services proposés</h2>
        <Button 
          onClick={() => setIsAddSectionModalOpen(true)}
          variant="secondary"
          className="bg-white text-gray-800 hover:bg-gray-100"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter une section
        </Button>
      </div>
      
      {/* Contenu */}
      <div className="p-6">
        {sections.length > 0 ? (
          <div className="space-y-6">
            <Accordion type="multiple" defaultValue={sections.map(s => s.id)} className="space-y-4">
              {sections.map(section => (
                <AccordionItem 
                  key={section.id} 
                  value={section.id}
                  className="border border-gray-800 rounded-lg overflow-hidden"
                >
                  <AccordionTrigger 
                    className="px-6 py-4 bg-gray-50 hover:bg-gray-100 flex justify-between items-center text-left"
                  >
                    <div className="font-medium text-lg text-gray-800">{section.title}</div>
                  </AccordionTrigger>
                  <AccordionContent className="p-0">
                    <div className="border-t border-gray-800 p-4">
                      <div className="flex justify-between mb-4">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => openEditSectionModal(section.id)}
                            variant="outline"
                            size="sm"
                            className="border-gray-800"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            onClick={() => handleDeleteSection(section.id)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                        <Button
                          onClick={() => openAddServiceModal(section.id)}
                          variant="default"
                          size="sm"
                          className="bg-gray-800 hover:bg-gray-700"
                        >
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Ajouter un service
                        </Button>
                      </div>
                      
                      {section.services.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {section.services.map(service => (
                            <Card 
                              key={service.id} 
                              className="border border-gray-800 hover:shadow-md transition-shadow"
                            >
                              <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <CardTitle className="text-base font-medium text-gray-800">{service.title}</CardTitle>
                                    {service.description && (
                                      <CardDescription className="text-sm text-gray-600 mt-1">
                                        {service.description}
                                      </CardDescription>
                                    )}
                                  </div>
                                  <div className="flex space-x-1">
                                    <Button
                                      onClick={() => openEditServiceModal(section.id, service.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4 text-gray-500 hover:text-gray-800" />
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteService(service.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardFooter className="p-4 pt-2 flex justify-between items-center">
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="bg-gray-50 text-gray-700 flex items-center gap-1">
                                    <Scissors className="h-3 w-3" />
                                    {formatDuration(service.duration)}
                                  </Badge>
                                  
                                  {service.discount && (
                                    <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
                                      <Tag className="h-3 w-3" />
                                      {Math.abs(service.discount)}%
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-right">
                                  {service.discount ? (
                                    <>
                                      <div className="line-through text-sm text-gray-500">
                                        {formatPrice(service.originalPrice)}
                                      </div>
                                      <div className="font-bold text-red-600">
                                        {formatPrice(service.discountedPrice || service.originalPrice)}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="font-bold text-gray-800">
                                      {formatPrice(service.originalPrice)}
                                    </span>
                                  )}
                                </div>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-50 rounded-lg mt-4 text-gray-500">
                          Aucun service dans cette section
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <Scissors className="h-12 w-12 mx-auto mb-4 text-gray-800" />
            <p className="text-lg font-medium mb-2">Aucune section configurée</p>
            <p className="mb-6">Commencez par ajouter une section pour organiser vos services</p>
            <Button
              onClick={() => setIsAddSectionModalOpen(true)}
              variant="default"
              className="bg-gray-800 hover:bg-gray-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Ajouter une section
            </Button>
          </div>
        )}
      </div>
      
      {/* Modales */}
      {isAddSectionModalOpen && (
        <AddSectionModal
          onClose={() => setIsAddSectionModalOpen(false)}
          onSubmit={handleAddSection}
        />
      )}
      
      {isEditSectionModalOpen && currentSectionId && (
        <EditSectionModal
          onClose={() => {
            setIsEditSectionModalOpen(false);
            setCurrentSectionId(null);
          }}
          onSubmit={(title) => handleEditSection(currentSectionId, title)}
          currentTitle={sections.find(s => s.id === currentSectionId)?.title || ''}
          sectionId={currentSectionId}
        />
      )}
      
      {isAddServiceModalOpen && currentSectionId && (
        <AddServiceModal
          onClose={() => {
            setIsAddServiceModalOpen(false);
            setCurrentSectionId(null);
          }}
          onSubmit={handleAddService}
          sectionId={currentSectionId}
        />
      )}
      
      {isEditServiceModalOpen && currentSectionId && currentServiceId && (
        <EditServiceModal
          onClose={() => {
            setIsEditServiceModalOpen(false);
            setCurrentSectionId(null);
            setCurrentServiceId(null);
          }}
          onSubmit={handleEditService}
          currentService={
            sections
              .find(s => s.id === currentSectionId)
              ?.services.find(serv => serv.id === currentServiceId) || 
              { 
                id: '', 
                title: '', 
                description: '', 
                duration: 30, 
                originalPrice: 0,
                sectionId: currentSectionId
              }
          }
          serviceId={currentServiceId}
        />
      )}
    </div>
  );
};

export default Service;
  
 