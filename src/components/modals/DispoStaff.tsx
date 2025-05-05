import { db } from '../../lib/firebase';
import {
  StaffAvailability,
  Break,
  Vacation,
  TimeRange,
} from '../../types/Staff';
import { useState, useEffect } from 'react';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { DayOfWeek } from '../../types/Salon';
import { Switch } from '@/components/ui/switch';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
  import { Input } from "@/components/ui/input"

  
interface DispoStaffProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  staffName: string;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
];

const DEFAULT_WORK_HOURS: Record<DayOfWeek, TimeRange> = {
  Lundi: { start: '09:00', end: '18:00' },
  Mardi: { start: '09:00', end: '18:00' },
  Mercredi: { start: '09:00', end: '18:00' },
  Jeudi: { start: '09:00', end: '18:00' },
  Vendredi: { start: '09:00', end: '18:00' },
  Samedi: { start: '09:00', end: '14:00' },
  Dimanche: { start: '10:00', end: '13:00' }
};

const DispoStaff = ({ isOpen, onClose, staffId, staffName }: DispoStaffProps) => {
  const [workDays, setWorkDays] = useState<Record<DayOfWeek, boolean>>({
    Lundi: true, Mardi: true, Mercredi: true,
    Jeudi: true, Vendredi: true, Samedi: true,
    Dimanche: false
  });

  const [workHours, setWorkHours] = useState<Record<DayOfWeek, TimeRange>>(DEFAULT_WORK_HOURS);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [activeTab, setActiveTab] = useState<'horaires' | 'pauses' | 'vacances'>('horaires');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newBreak, setNewBreak] = useState<Omit<Break, 'id'>>({
    day: 'Lundi',
    start: '12:00',
    end: '13:00'
  });

  const [newVacation, setNewVacation] = useState<Omit<Vacation, 'id'>>({
    startDate: '',
    endDate: '',
    description: ''
  });

  // Création des objets Date pour le calendrier
  const startDateObj = newVacation.startDate ? new Date(newVacation.startDate) : undefined;
  const endDateObj = newVacation.endDate ? new Date(newVacation.endDate) : undefined;

  // Charger les données existantes quand la modale s'ouvre
  useEffect(() => {
    if (isOpen && staffId) {
      loadStaffAvailability();
    }
  }, [isOpen, staffId]);

  // Mettre à jour les jours sélectionnables pour les pauses quand les jours de travail changent
  useEffect(() => {
    // Récupérer les jours travaillés
    const workingDays = DAYS_OF_WEEK.filter(day => workDays[day]);
    
    // Si aucun jour n'est travaillé, nous ne pouvons pas ajouter de pause
    if (workingDays.length === 0) return;
    
    // Si le jour actuel de la pause n'est pas un jour travaillé, le changer pour le premier jour travaillé
    if (!workDays[newBreak.day]) {
      setNewBreak(prev => ({ ...prev, day: workingDays[0] }));
    }
  }, [workDays, newBreak.day]);

  const loadStaffAvailability = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const docRef = doc(db, 'staff', staffId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as StaffAvailability;
        
        // Mettre à jour l'état avec les données récupérées
        const newWorkDays: Record<DayOfWeek, boolean> = {} as Record<DayOfWeek, boolean>;
        const newWorkHours: Record<DayOfWeek, TimeRange> = {} as Record<DayOfWeek, TimeRange>;
        
        DAYS_OF_WEEK.forEach(day => {
          const dayData = data.workingHours[day];
          newWorkDays[day] = dayData?.working || false;
          newWorkHours[day] = dayData?.ranges[0] || DEFAULT_WORK_HOURS[day];
        });
        
        setWorkDays(newWorkDays);
        setWorkHours(newWorkHours);
        setBreaks(data.breaks || []);
        setVacations(data.vacations || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des disponibilités:", error);
      setError("Impossible de charger les données. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkDayChange = (day: DayOfWeek) => {
    setWorkDays(prev => {
      const updated = { ...prev, [day]: !prev[day] };
      if (updated[day]) {
        setWorkHours(prevHours => ({ ...prevHours, [day]: DEFAULT_WORK_HOURS[day] }));
      }
      return updated;
    });
  };

  const handleWorkHoursChange = (day: DayOfWeek, field: 'start' | 'end', value: string) => {
    setWorkHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleAddBreak = () => {
    // Validation: vérifier si la fin est après le début
    if (newBreak.start >= newBreak.end) {
      setError("L'heure de fin doit être après l'heure de début");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Vérifier si au moins un jour est travaillé
    const hasWorkDay = Object.values(workDays).some(value => value);
    if (!hasWorkDay) {
      setError("Veuillez définir au moins un jour travaillé");
      setActiveTab('horaires');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const id = `break-${Date.now()}`;
    setBreaks([...breaks, { ...newBreak, id }]);
    
    // Réinitialiser le formulaire avec des valeurs par défaut
    setNewBreak({
      day: newBreak.day, // Garder le même jour
      start: '12:00',
      end: '13:00'
    });
    
    // Message de confirmation
    setSuccessMessage("Pause ajoutée avec succès");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteBreak = (id: string) => {
    setBreaks(breaks.filter(b => b.id !== id));
    
    // Message de confirmation
    setSuccessMessage("Pause supprimée avec succès");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddVacation = () => {
    // Validation
    if (!newVacation.startDate || !newVacation.endDate) {
      setError("Les dates de début et de fin sont obligatoires");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Vérifier que la date de fin est après la date de début
    if (new Date(newVacation.startDate) > new Date(newVacation.endDate)) {
      setError("La date de fin doit être après la date de début");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const id = `vac-${Date.now()}`;
    setVacations([...vacations, { ...newVacation, id }]);
    
    // Réinitialiser le formulaire
    setNewVacation({
      startDate: '',
      endDate: '',
      description: ''
    });
    
    // Message de confirmation
    setSuccessMessage("Période d'absence ajoutée avec succès");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteVacation = (id: string) => {
    setVacations(vacations.filter(v => v.id !== id));
    
    // Message de confirmation
    setSuccessMessage("Période d'absence supprimée avec succès");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validation finale
      // Vérifier si au moins un jour est travaillé
      const hasWorkDay = Object.values(workDays).some(value => value);
      if (!hasWorkDay) {
        setError("Veuillez définir au moins un jour travaillé");
        setActiveTab('horaires');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Préparer les données à enregistrer
      const workingHours = DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day] = {
          working: workDays[day],
          ranges: workDays[day] ? [workHours[day]] : []
        };
        return acc;
      }, {} as StaffAvailability['workingHours']);

      const data: StaffAvailability = {
        staffId,
        workingHours,
        breaks,
        vacations
      };

      // Enregistrer dans Firestore
      await setDoc(doc(db, 'staff', staffId), data, { merge: true });
      
      // Message de confirmation
      setSuccessMessage("Les disponibilités ont été enregistrées avec succès");
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Erreur enregistrement Firestore:', error);
      setError("Erreur lors de l'enregistrement. Veuillez réessayer.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="bg-gray-800 px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            Disponibilités de {staffName}
          </h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-800 focus:outline-none"
            aria-label="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Messages de notification */}
        {(error || successMessage) && (
          <div className={`p-4 ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {error || successMessage}
          </div>
        )}
        
        {isLoading && !error && !successMessage ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-gray-800 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-gray-600">Chargement en cours...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Onglets */}
            <div className="bg-gray-50 px-6 py-2 border-b">
              <div className="flex space-x-4">
                <button 
                  className={`py-2 px-4 font-medium rounded-t-md transition-colors ${activeTab === 'horaires' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'}`}
                  onClick={() => setActiveTab('horaires')}
                >
                  Horaires
                </button>
                <button 
                  className={`py-2 px-4 font-medium rounded-t-md transition-colors ${activeTab === 'pauses' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'}`}
                  onClick={() => setActiveTab('pauses')}
                >
                  Pauses
                </button>
                <button 
                  className={`py-2 px-4 font-medium rounded-t-md transition-colors ${activeTab === 'vacances' 
                    ? 'bg-white text-gray-800 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'}`}
                  onClick={() => setActiveTab('vacances')}
                >
                  Absences
                </button>
              </div>
            </div>
            
            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {/* Onglet Horaires */}
              {activeTab === 'horaires' && (
                <div>
                  <p className="mb-4 text-gray-600">
                    Définissez les jours travaillés et les horaires pour chaque jour.
                  </p>
                  
                  <div className="space-y-4 mt-6">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="flex flex-wrap md:flex-nowrap items-center gap-4 py-3 border-b border-gray-800">
                        <div className="w-full md:w-36 flex items-center">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`switch-${day}`}
                              checked={workDays[day]}
                              onCheckedChange={() => handleWorkDayChange(day)}
                              className="relative data-[state=checked]:bg-gray-800 data-[state=unchecked]:bg-white border-2 border-gray-800 p-0 h-6 w-11 rounded-full
                                [&>span]:transition-transform [&>span]:duration-200
                                [&>span]:data-[state=checked]:translate-x-[22px]
                                [&>span]:data-[state=unchecked]:translate-x-[4px]
                                [&>span]:data-[state=checked]:bg-white 
                                [&>span]:data-[state=unchecked]:bg-gray-800"
                            />
                            <label 
                              htmlFor={`switch-${day}`} 
                              className="text-gray-800 font-medium cursor-pointer"
                            >
                              {day}
                            </label>
                          </div>
                        </div>
                        
                        {workDays[day] && (
                          <div className="flex items-center gap-4 w-full md:w-auto">
                            <div>
                              <label htmlFor={`start-${day}`} className="block text-sm text-gray-600 mb-1">
                                Début
                              </label>
                              <input
                                type="time"
                                id={`start-${day}`}
                                value={workHours[day]?.start || ''}
                                onChange={(e) => handleWorkHoursChange(day, 'start', e.target.value)}
                                className="inline-block border border-gray-800 rounded-md px-2 py-1 text-center text-gray-800 bg-white shadow-sm focus:border-gray-800 focus:ring-gray-800 w-auto"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor={`end-${day}`} className="block text-sm text-gray-600 mb-1">
                                Fin
                              </label>
                              <input
                                type="time"
                                id={`end-${day}`}
                                value={workHours[day]?.end || ''}
                                onChange={(e) => handleWorkHoursChange(day, 'end', e.target.value)}
                                className="inline-block border border-gray-800 rounded-md px-2 py-1 text-center text-gray-800 bg-white shadow-sm focus:border-gray-800 focus:ring-gray-800 w-auto"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Onglet Pauses */}
              {activeTab === 'pauses' && (
                <div>
                  <p className="mb-4 text-gray-600">
                    Ajoutez des pauses régulières pour chaque jour de la semaine.
                  </p>
                  
                  {/* Formulaire d'ajout de pause */}
                  <div className="mb-6 p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-800">
                    <h3 className="font-medium text-gray-800 mb-4">Ajouter une pause</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Jour</label>
                        <Select
  value={newBreak.day}
  onValueChange={(value) => setNewBreak({ ...newBreak, day: value as DayOfWeek })}
  disabled={!Object.values(workDays).some(v => v)}
>
  <SelectTrigger className="w-full border border-gray-800 rounded-md bg-white text-gray-800 shadow-sm focus:outline-none focus:ring-gray-800 focus:border-gray-800">
    <SelectValue placeholder="Choisir un jour" />
  </SelectTrigger>
  <SelectContent>
    {DAYS_OF_WEEK.filter(day => workDays[day]).map((day) => (
      <SelectItem key={day} value={day}>
        {day}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

                        {!Object.values(workDays).some(v => v) && (
                          <p className="text-xs text-red-500 mt-1">
                            Veuillez définir au moins un jour travaillé
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Début</label>
                        <input
                          type="time"
                          value={newBreak.start}
                          onChange={(e) => setNewBreak({...newBreak, start: e.target.value})}
                          className="inline-block border border-gray-800 rounded-md px-2 py-1 text-gray-800 bg-white shadow-sm focus:border-gray-800 focus:ring-gray-800 w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Fin</label>
                        <input
                          type="time"
                          value={newBreak.end}
                          onChange={(e) => setNewBreak({...newBreak, end: e.target.value})}
                          className="inline-block border border-gray-800 rounded-md px-2 py-1 text-gray-800 bg-white shadow-sm focus:border-gray-800 focus:ring-gray-800 w-full"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleAddBreak}
                      className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                      disabled={!Object.values(workDays).some(v => v)}
                    >
                      Ajouter cette pause
                    </button>
                  </div>
                  
                  {/* Liste des pauses */}
                  {breaks.length > 0 ? (
                    <div className="overflow-x-auto mt-6 rounded-lg border border-gray-800">
                      <table className="min-w-full divide-y divide-gray-800">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                              Jour
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                              Début
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                              Fin
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-800">
                          {breaks.map(breakItem => (
                            <tr key={breakItem.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                                {breakItem.day}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                {breakItem.start}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                {breakItem.end}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleDeleteBreak(breakItem.id)}
                                  className="text-red-600 hover:text-red-900 focus:outline-none"
                                  aria-label="Supprimer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-gray-800 bg-gray-50 rounded-lg mt-4 border border-gray-800">
                      Aucune pause configurée
                    </div>
                  )}
                </div>
              )}
              
              {/* Onglet Vacances/Absences */}
              {activeTab === 'vacances' && (
                <div>
                  <p className="mb-4 text-gray-600">
                    Définissez les périodes d'absence (vacances, congés, formation, etc.).
                  </p>
                  
                  {/* Formulaire d'ajout de vacances */}
                  <div className="mb-6 p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-800">
                    <h3 className="font-medium text-gray-800 mb-4">Ajouter une période d'absence</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Date de début</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-full px-3 py-2 text-sm border border-gray-800 rounded-md bg-white text-left shadow-sm"
                            >
                              {startDateObj ? format(startDateObj, "PPP", { locale: fr }) : "Choisir une date"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={startDateObj}
                              onSelect={(date) =>
                                setNewVacation((prev) => ({
                                  ...prev,
                                  startDate: date ? date.toISOString().split("T")[0] : ""
                                }))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Date de fin</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-full px-3 py-2 text-sm border border-gray-800 rounded-md bg-white text-left shadow-sm"
                            >
                              {endDateObj ? format(endDateObj, "PPP", { locale: fr }) : "Choisir une date"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={endDateObj}
                              onSelect={(date) =>
                                setNewVacation((prev) => ({
                                  ...prev,
                                  endDate: date ? date.toISOString().split("T")[0] : ""
                                }))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div>
  <label className="block text-sm text-gray-600 mb-1">Description</label>
  <Input
  type="text"
  placeholder="Congés, formation, etc."
  value={newVacation.description}
  onChange={(e) =>
    setNewVacation({ ...newVacation, description: e.target.value })
  }
  className="border border-gray-800 bg-white text-gray-800 rounded-md shadow-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-800"
/>



</div>

                    </div>
                    
                    <button
                      onClick={handleAddVacation}
                      className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                      disabled={!newVacation.startDate || !newVacation.endDate}
                    >
                      Ajouter cette période
                    </button>
                  </div>
                  
                  {/* Liste des vacances */}
                  {vacations.length > 0 ? (
                    <div className="overflow-x-auto mt-6 rounded-lg border border-gray-800">
                      <table className="min-w-full divide-y divide-gray-800">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                              Début
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                              Fin
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-800">
                          {vacations.map(vacation => (
                            <tr key={vacation.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                                {new Date(vacation.startDate).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                {new Date(vacation.endDate).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                {vacation.description || "-"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleDeleteVacation(vacation.id)}
                                  className="text-red-600 hover:text-red-900 focus:outline-none"
                                  aria-label="Supprimer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-gray-800 bg-gray-50 rounded-lg mt-4 border border-gray-800">
                      Aucune période d'absence configurée
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Footer avec boutons */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-800 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DispoStaff;