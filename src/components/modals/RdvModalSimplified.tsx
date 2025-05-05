import { useEffect, useState } from 'react';
import { format, addMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { generateAvailableTimeSlots } from '@/lib/availability';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

interface RdvModalSimplifiedProps {
  date: Date;
  onClose: () => void;
  onRefresh: () => void;
}

interface Service {
  id: string;
  title: string;
  description: string;
  duration: number;
  originalPrice: number;
  discountedPrice?: number;
  discount?: number;
  sectionId: string;
}

interface Section {
  id: string;
  title: string;
}

interface StaffMember {
  id: string;
  name: string;
}

interface SalonConfig {
  workDays: Record<string, boolean>;
  workHours: Record<string, { start: string; end: string }>;
  breaks: any[];
  vacations: any[];
  updatedAt: any;
}

interface StaffAvailability {
  staffId: string;
  workingHours: Record<string, { working: boolean; ranges: { start: string; end: string }[] }>;
  breaks: any[];
  vacations: any[];
}

interface Rdv {
  id: string;
  start: string;
  end: string;
  staffId: string;
}

const RdvModalSimplified = ({ date, onClose, onRefresh }: RdvModalSimplifiedProps) => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [salonConfig, setSalonConfig] = useState<SalonConfig | null>(null);
  const [staffAvailability, setStaffAvailability] = useState<StaffAvailability | null>(null);
  const [existingRdvs, setExistingRdvs] = useState<Rdv[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const staffSnap = await getDocs(collection(db, 'staff'));
      setStaffList(staffSnap.docs.map(doc => ({ id: doc.id, name: doc.id })));

      const sectionsSnap = await getDocs(collection(db, 'sections'));
      setSections(sectionsSnap.docs.map(doc => ({ id: doc.id, title: doc.data().title })));

      const servicesSnap = await getDocs(collection(db, 'services'));
      setServices(servicesSnap.docs.map(doc => ({ 
        id: doc.id, 
        title: doc.data().title,
        description: doc.data().description || '',
        duration: doc.data().duration || 30,
        originalPrice: doc.data().originalPrice || 0,
        discountedPrice: doc.data().discountedPrice,
        discount: doc.data().discount,
        sectionId: doc.data().sectionId
      })));

      const salonSnap = await getDoc(doc(db, 'salon', 'config'));
      if (salonSnap.exists()) setSalonConfig(salonSnap.data() as SalonConfig);

      const rdvsSnap = await getDocs(collection(db, 'rdvs'));
      setExistingRdvs(rdvsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rdv)));
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedStaff) return;
      const docSnap = await getDoc(doc(db, 'staff', selectedStaff));
      if (docSnap.exists()) {
        setStaffAvailability(docSnap.data() as StaffAvailability);
      }
    };

    loadAvailability();
  }, [selectedStaff]);

  useEffect(() => {
    if (selectedService && selectedStaff && salonConfig && staffAvailability) {
      const slots = generateAvailableTimeSlots(
        date,
        selectedStaff,
        selectedService.duration,
        salonConfig,
        staffAvailability,
        existingRdvs
      );
      setAvailableTimes(slots);
    }
  }, [selectedService, selectedStaff, salonConfig, staffAvailability]);

  useEffect(() => {
    if (selectedTime) setShowSummary(true);
  }, [selectedTime]);

  const handleCreateRdv = async () => {
    if (!selectedService || !selectedStaff || !selectedTime) return;
    const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${selectedTime}`);
    const endDateTime = addMinutes(startDateTime, selectedService.duration);

    // Utiliser le prix original
    const price = selectedService.originalPrice;

    const rdvData = {
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      serviceDuration: selectedService.duration,
      staffId: selectedStaff,
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      price: price,
      source: 'RdvCalendar',
      createdAt: serverTimestamp()
    };

    setLoading(true);
    try {
      await addDoc(collection(db, 'rdvs'), rdvData);
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Erreur création RDV:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-800">Créer un RDV - {format(date, 'dd MMMM yyyy', { locale: fr })}</DialogTitle>
          </DialogHeader>

          {/* Step 1: Staff */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-800">Choisir un coiffeur :</p>
            <div className="flex flex-wrap gap-2">
              {staffList.map(staff => (
                <Button
                  key={staff.id}
                  variant={staff.id === selectedStaff ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedStaff(staff.id);
                    setSelectedService(null);
                    setSelectedTime(null);
                    setAvailableTimes([]);
                  }}
                  className={staff.id === selectedStaff ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'border-gray-800 text-gray-800 hover:bg-gray-100'}
                >
                  {staff.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 2: Services by section */}
          {selectedStaff && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2 text-gray-800">Choisir un service :</p>
              <Accordion type="single" collapsible className="border-gray-800">
                {sections.map(section => (
                  <AccordionItem key={section.id} value={section.id} className="border-gray-300">
                    <AccordionTrigger className="bg-transparent focus:outline-none focus:ring-0 no-underline hover:no-underline text-gray-800">
                      {section.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1">
                        {services.filter(s => s.sectionId === section.id).map(service => (
                         <Button
                           key={service.id}
                           variant={selectedService?.id === service.id ? 'default' : 'outline'}
                           className={`w-full justify-between no-underline hover:no-underline ${
                             selectedService?.id === service.id 
                               ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                               : 'border-gray-800 text-gray-800 hover:bg-gray-100'
                           }`}
                           onClick={() => {
                             setSelectedService(service)
                             setSelectedTime(null)
                           }}
                         >
                           <span>{service.title}</span>
                           <span>{service.originalPrice}€</span>
                         </Button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Step 3: Horaires */}
          {selectedService && availableTimes.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2 text-gray-800">Créneaux disponibles :</p>
              <div className="grid grid-cols-3 gap-2">
                {availableTimes.map(time => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    onClick={() => setSelectedTime(time)}
                    className={selectedTime === time 
                      ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                      : 'border-gray-800 text-gray-800 hover:bg-gray-100'
                    }
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sous-modale : Résumé de rendez-vous */}
      <Dialog open={showSummary} onOpenChange={(open) => { if (!open) setShowSummary(false); }}>
        <DialogContent className="max-w-md border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-800">Récapitulatif du rendez-vous</DialogTitle>
          </DialogHeader>

          {selectedService && selectedStaff && selectedTime && (
            <div className="space-y-2 text-sm">
              <p className="text-gray-800"><strong>Service :</strong> {selectedService.title}</p>
              <p className="text-gray-800"><strong>Coiffeur :</strong> {staffList.find(s => s.id === selectedStaff)?.name}</p>
              <p className="text-gray-800"><strong>Date :</strong> {format(date, 'dd MMMM yyyy', { locale: fr })}</p>
              <p className="text-gray-800"><strong>Heure :</strong> {selectedTime}</p>
              <p className="text-gray-800"><strong>Durée :</strong> {selectedService.duration} min</p>
              <p className="text-gray-800"><strong>Prix :</strong> {selectedService.originalPrice} €</p>
            </div>
          )}

          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowSummary(false)}
              className="border-gray-800 text-gray-800 hover:bg-gray-100"
            >
              Modifier
            </Button>
            <Button 
              onClick={handleCreateRdv} 
              disabled={loading}
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              Confirmer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RdvModalSimplified;