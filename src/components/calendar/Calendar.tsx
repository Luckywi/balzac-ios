import React, { useState, useEffect } from 'react'
import {
  Calendar as BigCalendar,
  Views,
  SlotInfo,
} from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendar.css'

import { format as dfFormat, parse as dfParse, startOfWeek, getDay, isSameDay, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { dateFnsLocalizer } from 'react-big-calendar'
import type { ViewKey } from 'react-big-calendar';
import { collection, getDocs, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import RdvDetailsModal from '../modals/RdvDetailsModal';
import { DayOfWeek } from '../../types/Salon';
import { StaffAvailability, TimeRange, Break, Vacation } from '../../types/Staff';
import RdvModalSimplified from '../modals/RdvModalSimplified';


// Locales disponibles
const locales = { fr }

const localizer = dateFnsLocalizer({
  format: (date: Date, formatStr: string, culture?: string) =>
    dfFormat(date, formatStr, { locale: fr }),
  parse: (value: string, formatStr: string, culture?: string) =>
    dfParse(value, formatStr, new Date(), { locale: fr }),
  startOfWeek: (date: Date, culture?: string) =>
    startOfWeek(date, { locale: fr }),
  getDay,
  locales,
})

interface CalendarEvent {
    id: number | string;
    title: string;
    start: Date;
    end: Date;
    client?: string;
    service?: string;
    notes?: string;
    staffId?: string;
    resourceId?: string; // Pour pouvoir éventuellement filtrer par coiffeur
    price?: number;
    clientPhone?: string;
}

interface RdvData {
  id: string;
  serviceId: string;
  serviceTitle: string;
  serviceDuration: number;
  staffId: string;
  start: string; // ISO
  end: string;   // ISO
  notes?: string;
  clientName: string;
  clientPhone?: string;
  price: number;
  source: string;
}

interface WorkHours {
  start: string;
  end: string;
}

interface SalonBreak {
  id: string;
  day: string;
  start: string;
  end: string;
}

interface SalonVacation {
  id: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface SalonConfig {
  workDays: Record<string, boolean>;
  workHours: Record<string, WorkHours>;
  breaks: SalonBreak[];
  vacations: SalonVacation[];
  updatedAt: any;
}

const DAYS_OF_WEEK = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
];

const DAY_MAPPING: Record<string, DayOfWeek> = {
  'Dimanche': 'Dimanche',
  'Lundi': 'Lundi',
  'Mardi': 'Mardi',
  'Mercredi': 'Mercredi',
  'Jeudi': 'Jeudi',
  'Vendredi': 'Vendredi',
  'Samedi': 'Samedi'
}

const Calendar: React.FC<{ staffFilter?: string }> = ({ staffFilter }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewKey>('week');
  const [newRdvDate, setNewRdvDate] = useState<Date | null>(null);
  const [isCreatingRdv, setIsCreatingRdv] = useState(false);


  // États pour la configuration du salon et des coiffeurs
  const [salonConfig, setSalonConfig] = useState<SalonConfig | null>(null);
  const [staffAvailability, setStaffAvailability] = useState<StaffAvailability | null>(null);


  useEffect(() => {
    let touchStartX = 0;
let touchStartY = 0;

const handleTouchStart = (e: TouchEvent) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
};

const handleTouchEnd = (e: TouchEvent) => {
  const touchEndX = e.changedTouches[0].screenX;
  const touchEndY = e.changedTouches[0].screenY;

  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;

  // Ne rien faire si le geste est plus vertical qu’horizontal
  if (Math.abs(diffY) > Math.abs(diffX)) return;

  // Ne rien faire si le swipe est trop court (pour éviter les faux positifs)
  if (Math.abs(diffX) < 130) return;

  const direction = diffX > 0 ? 'left' : 'right';

  const newDate = new Date(currentDate);
  const offset = view === 'day' ? 1 : 7;

  if (direction === 'right') {
    newDate.setDate(newDate.getDate() - offset);
  } else {
    newDate.setDate(newDate.getDate() + offset);
  }

  setCurrentDate(newDate);
};

  
    const calendarEl = document.querySelector('.rbc-time-view') || document.querySelector('.rbc-month-view');
    if (calendarEl) {
      calendarEl.addEventListener('touchstart', handleTouchStart as EventListener);
      calendarEl.addEventListener('touchend', handleTouchEnd as EventListener);
    }
  
    return () => {
      if (calendarEl) {
        calendarEl.removeEventListener('touchstart', handleTouchStart as EventListener);
        calendarEl.removeEventListener('touchend', handleTouchEnd as EventListener);
      }
    };
  }, [currentDate, view]);
  


  // Récupérer les rendez-vous depuis Firestore
  useEffect(() => {
    const loadRdvs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Créer un abonnement aux changements de rendez-vous
        const rdvsQuery = query(collection(db, 'rdvs'), orderBy('start', 'asc'));
        
        const unsubscribe = onSnapshot(rdvsQuery, (rdvsSnapshot) => {
          const rdvsData = rdvsSnapshot.docs.map(doc => {
            const data = doc.data() as RdvData;
            return {
              id: doc.id,
              title: `${data.serviceTitle} - ${data.clientName}`,
              start: new Date(data.start),
              end: new Date(data.end),
              client: data.clientName,
              service: data.serviceTitle,
              notes: data.notes,
              staffId: data.staffId,
              resourceId: data.staffId, // Pour filtrer par coiffeur si nécessaire
              price: data.price,
              clientPhone: data.clientPhone
            };
          });
          
          // Filtrer par coiffeur si un filtre est activé
          let filteredEvents = rdvsData;
          if (staffFilter) {
            filteredEvents = rdvsData.filter(event => event.staffId === staffFilter);
          }
          
          setEvents(filteredEvents);
          setLoading(false);
        }, (err) => {
          console.error("Erreur lors de l'abonnement aux rdvs:", err);
          setError("Impossible de charger les rendez-vous.");
          setLoading(false);
        });
        
        return () => {
          unsubscribe();
        };
        
      } catch (err) {
        console.error("Erreur lors du chargement des rdvs:", err);
        setError("Une erreur est survenue lors du chargement des rendez-vous.");
        setLoading(false);
      }
    };
    
    loadRdvs();
  }, [staffFilter]);

  // Récupérer la configuration des horaires du salon
  useEffect(() => {
    const loadSalonConfig = async () => {
      try {
        const docRef = doc(db, 'salon', 'config');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as SalonConfig;
          setSalonConfig(data);
        } else {
          console.log("Aucune configuration de salon trouvée");
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la configuration du salon:", err);
      }
    };
    
    loadSalonConfig();
  }, []);

  

  // Récupérer les disponibilités du coiffeur si un filtre est appliqué
  useEffect(() => {
    const loadStaffAvailability = async () => {
      if (!staffFilter) {
        setStaffAvailability(null);
        return;
      }
      
      try {
        const docRef = doc(db, 'staff', staffFilter);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as StaffAvailability;
          setStaffAvailability(data);
        } else {
          console.log(`Aucune disponibilité trouvée pour le coiffeur ${staffFilter}`);
        }
      } catch (err) {
        console.error(`Erreur lors du chargement des disponibilités du coiffeur ${staffFilter}:`, err);
      }
    };
    
    loadStaffAvailability();
  }, [staffFilter]);

  // Vérifier si une date est un jour de fermeture du salon 
  const isSalonClosed = (date: Date): boolean => {
    if (!salonConfig) return false;
    
    // Vérifier si c'est un jour de fermeture hebdomadaire du salon
    const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
    if (!salonConfig.workDays[dayOfWeek]) {
      return true;
    }
    
    // Vérifier si c'est un jour de fermeture exceptionnel (vacances) du salon
    const dateStr = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
    return salonConfig.vacations.some(vacation => {
      const startDate = new Date(vacation.startDate);
      const endDate = new Date(vacation.endDate);
      endDate.setHours(23, 59, 59, 999); // Inclure le jour de fin complet
      return isWithinInterval(date, { start: startDate, end: endDate });
    });
  };

  // Vérifier si une date est un jour off pour le coiffeur
  const isStaffDayOff = (date: Date): boolean => {
    if (!staffAvailability || !staffFilter) return false;
    
    // Vérifier si c'est un jour de repos hebdomadaire pour le coiffeur
    const dayOfWeek = DAYS_OF_WEEK[date.getDay()] as DayOfWeek;
    if (!staffAvailability.workingHours[dayOfWeek]?.working) {
      return true;
    }
    
    // Vérifier si c'est un jour de vacances pour le coiffeur
    return staffAvailability.vacations.some(vacation => {
      const startDate = new Date(vacation.startDate);
      const endDate = new Date(vacation.endDate);
      endDate.setHours(23, 59, 59, 999); // Inclure le jour de fin complet
      return isWithinInterval(date, { start: startDate, end: endDate });
    });
  };

  // Vérifier si un créneau est pendant un jour/heure de fermeture
  const isUnavailableSlot = (start: Date, end: Date): boolean => {
    // Si le salon est fermé, le créneau est indisponible
    if (isSalonClosed(start)) {
      return true;
    }
    
    // Si un coiffeur est sélectionné et qu'il ne travaille pas ce jour, le créneau est indisponible
    if (staffFilter && isStaffDayOff(start)) {
      return true;
    }
    
    // Format de l'heure pour les comparaisons
    const startHour = start.getHours().toString().padStart(2, '0') + ':' + start.getMinutes().toString().padStart(2, '0');
    const endHour = end.getHours().toString().padStart(2, '0') + ':' + end.getMinutes().toString().padStart(2, '0');
    const dayOfWeek = DAYS_OF_WEEK[start.getDay()];
    
    // Vérifier les heures d'ouverture du salon
    if (salonConfig) {
      const salonHours = salonConfig.workHours[dayOfWeek];
      
      if (salonHours && (startHour < salonHours.start || endHour > salonHours.end)) {
        return true;
      }
      
      // Vérifier les pauses du salon
      for (const breakItem of salonConfig.breaks) {
        if (breakItem.day === dayOfWeek) {
          if ((startHour >= breakItem.start && startHour < breakItem.end) || 
              (endHour > breakItem.start && endHour <= breakItem.end) ||
              (startHour <= breakItem.start && endHour >= breakItem.end)) {
            return true;
          }
        }
      }
    }
    
    // Si un coiffeur est sélectionné, vérifier ses horaires spécifiques
    if (staffFilter && staffAvailability) {
      const dayKey = dayOfWeek as DayOfWeek;
      const staffDay = staffAvailability.workingHours[dayKey];
      
      if (staffDay && staffDay.working) {
        // Vérifier les horaires du coiffeur pour ce jour
        const ranges = staffDay.ranges;
        if (ranges.length > 0) {
          // Vérifier si le créneau est en dehors des horaires du coiffeur
          const withinRange = ranges.some(range => 
            startHour >= range.start && endHour <= range.end
          );
          
          if (!withinRange) {
            return true;
          }
        }
        
        // Vérifier les pauses du coiffeur
        for (const breakItem of staffAvailability.breaks) {
          if (breakItem.day === dayKey) {
            if ((startHour >= breakItem.start && startHour < breakItem.end) || 
                (endHour > breakItem.start && endHour <= breakItem.end) ||
                (startHour <= breakItem.start && endHour >= breakItem.end)) {
              return true;
            }
          }
        }
      } else {
        // Le coiffeur ne travaille pas ce jour
        return true;
      }
    }
    
    return false;
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (slotInfo.start < today) {
      alert("Impossible de créer un rendez-vous dans le passé.");
      return;
    }
    if (isUnavailableSlot(slotInfo.start, slotInfo.end)) {
      console.log("Créneau non disponible.");
      return;
    }
    setNewRdvDate(slotInfo.start);
    setIsCreatingRdv(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  }

  const handleCloseModal = () => {
    setSelectedEvent(null);
  }

  // Fonction pour rafraîchir les données après une modification ou suppression
  const handleRefresh = () => {
    // On n'a pas besoin de faire quoi que ce soit ici car
    // les données sont automatiquement mises à jour via onSnapshot
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    // On pourrait personnaliser la couleur en fonction du staffId ou du type de service
    let backgroundColor = '#1f2937'; // Couleur par défaut
    
    // Exemple de personnalisation par coiffeur
    if (event.staffId === 'bea') {
      backgroundColor = '#f43f5e'; // Rose/rouge pour Béa
    } else if (event.staffId === 'cyrille') {
      backgroundColor = '#3b82f6'; // Bleu électrique pour Cyrille
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontWeight: 500
      }
    };
  }

  // Personnaliser l'affichage des cellules du calendrier
  const dayPropGetter = (date: Date) => {
    // Si le salon est fermé ce jour-là, ajouter une classe ou un style spécifique
    if (isSalonClosed(date)) {
      return {
        className: 'rbc-day-closed',
        style: {
          backgroundColor: '#f3f4f6', // Gris clair pour les jours fermés
          cursor: 'not-allowed'
        }
      };
    }
    
    // Si un coiffeur est sélectionné et qu'il ne travaille pas ce jour-là
    if (staffFilter && isStaffDayOff(date)) {
      return {
        className: 'rbc-day-staff-off',
        style: {
          backgroundColor: '#f3f4f6', // Gris clair pour les jours de repos du coiffeur
          cursor: 'not-allowed'
        }
      };
    }
    
    return {};
  }

  // Personnaliser l'affichage des créneaux horaires
  const slotPropGetter = (date: Date) => {
    const currentHour = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
    const dayKey = dayOfWeek as DayOfWeek;
    
    // Vérifier pour le salon fermé
    if (isSalonClosed(date)) {
      return {
        className: 'rbc-slot-closed',
        style: {
          backgroundColor: '#f3f4f6', // Gris clair pour les heures fermées
          cursor: 'not-allowed'
        }
      };
    }
    
    // Vérifier pour le coiffeur absent
    if (staffFilter && isStaffDayOff(date)) {
      return {
        className: 'rbc-slot-staff-off',
        style: {
          backgroundColor: '#f3f4f6', // Gris clair pour les heures d'absence du coiffeur
          cursor: 'not-allowed'
        }
      };
    }
    
    // Vérifier les heures d'ouverture du salon
    if (salonConfig && salonConfig.workDays[dayOfWeek]) {
      const dayHours = salonConfig.workHours[dayOfWeek];
      
      if (dayHours && (currentHour < dayHours.start || currentHour >= dayHours.end)) {
        return {
          className: 'rbc-slot-closed',
          style: {
            backgroundColor: '#f3f4f6', // Gris clair pour les heures fermées
            cursor: 'not-allowed'
          }
        };
      }
      
      // Vérifier les pauses du salon
      for (const breakItem of salonConfig.breaks) {
        if (breakItem.day === dayOfWeek && currentHour >= breakItem.start && currentHour < breakItem.end) {
          return {
            className: 'rbc-slot-break',
            style: {
              backgroundColor: '#f3f4f6', // Gris clair pour les pauses
              cursor: 'not-allowed'
            }
          };
        }
      }
    }
    
    // Vérifier les horaires du coiffeur si un coiffeur est sélectionné
    if (staffFilter && staffAvailability && staffAvailability.workingHours[dayKey]?.working) {
      const staffDay = staffAvailability.workingHours[dayKey];
      const ranges = staffDay.ranges;
      
      // Vérifier si l'heure actuelle est en dehors des plages horaires du coiffeur
      if (ranges.length > 0) {
        const isWithinStaffHours = ranges.some(range => 
          currentHour >= range.start && currentHour < range.end
        );
        
        if (!isWithinStaffHours) {
          return {
            className: 'rbc-slot-staff-off',
            style: {
              backgroundColor: '#f3f4f6', // Gris clair pour les heures non travaillées
              cursor: 'not-allowed'
            }
          };
        }
      }
      
      // Vérifier les pauses du coiffeur
      for (const breakItem of staffAvailability.breaks) {
        if (breakItem.day === dayKey && currentHour >= breakItem.start && currentHour < breakItem.end) {
          return {
            className: 'rbc-slot-staff-break',
            style: {
              backgroundColor: '#f3f4f6', // Gris clair pour les pauses du coiffeur
              cursor: 'not-allowed'
            }
          };
        }
      }
    }
    
    return {};
  }

  

  return (
    <div className="calendar-container">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-800"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div className="text-center p-4 bg-red-100 text-red-700 rounded-lg shadow-md">
            <p className="font-medium mb-2">Erreur de chargement</p>
            <p>{error}</p>
          </div>
        </div>
      )}
      
      <BigCalendar
        localizer={localizer}
        culture="fr"
        date={currentDate}
        onNavigate={(newDate) => setCurrentDate(newDate)}  
        view={view}
        onView={(newView) => {
            if (['week', 'day', 'agenda'].includes(newView)) {
              setView(newView as ViewKey);
            }
          }}
        views={['week', 'day', 'agenda']}      
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        defaultView={Views.WEEK}
        dayLayoutAlgorithm="no-overlap"
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        dayPropGetter={dayPropGetter}
        slotPropGetter={slotPropGetter}
        style={{ height: 'calc(100vh - 140px)' }}
        min={new Date(0, 0, 0, 8, 0)}
        max={new Date(0, 0, 0, 20, 0)}
        messages={{
          allDay: 'Journée',
          previous: 'Précédent',
          next: 'Suivant',
          today: 'Aujourd\'hui',
          month: 'Mois',
          week: 'Semaine',
          day: 'Jour',
          agenda: 'Agenda',
          date: 'Date',
          time: 'Heure',
          event: 'Événement',
          noEventsInRange: 'Aucun événement prévu',
          showMore: (total: number) => `+ ${total} événement(s)`
        }}
      />

{selectedEvent && (
  <RdvDetailsModal
    event={selectedEvent}
    onClose={() => setSelectedEvent(null)}
    onRefresh={handleRefresh} // si tu veux reload les rdvs après suppression
  />
)}


      {/* Remplacer la modale simple par RdvDetailsModal */}
      {isCreatingRdv && newRdvDate && (
  <RdvModalSimplified
    date={newRdvDate}
    onClose={() => setIsCreatingRdv(false)}
    onRefresh={handleRefresh}
  />
)}

    </div>
  )
}

export default Calendar