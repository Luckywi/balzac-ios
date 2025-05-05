import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkHours {
  start: string;
  end: string;
}

interface Break {
  id: string;
  day: string;
  start: string;
  end: string;
}

interface Vacation {
  id: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface SalonConfig {
  workDays: Record<string, boolean>;
  workHours: Record<string, WorkHours>;
  breaks: Break[];
  vacations: Vacation[];
  updatedAt: any;
}

const DAYS_OF_WEEK = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche'
];

const DEFAULT_WORK_HOURS: Record<string, WorkHours> = {
  'Lundi': { start: '09:00', end: '19:00' },
  'Mardi': { start: '09:00', end: '19:00' },
  'Mercredi': { start: '09:00', end: '19:00' },
  'Jeudi': { start: '09:00', end: '19:00' },
  'Vendredi': { start: '09:00', end: '19:00' },
  'Samedi': { start: '09:00', end: '17:00' },
  'Dimanche': { start: '10:00', end: '13:00' }
};

const DispoSalon = () => {
  const [activeTab, setActiveTab] = useState<'horaires' | 'pauses' | 'vacances'>('horaires');
  const [workDays, setWorkDays] = useState<Record<string, boolean>>({
    'Lundi': true,
    'Mardi': true,
    'Mercredi': true,
    'Jeudi': true,
    'Vendredi': true,
    'Samedi': true,
    'Dimanche': false
  });
  const [workHours, setWorkHours] = useState<Record<string, WorkHours>>(DEFAULT_WORK_HOURS);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pour l'ajout de pause
  const [newBreak, setNewBreak] = useState<Omit<Break, 'id'>>({
    day: 'Lundi',
    start: '12:00',
    end: '13:00'
  });
  
  // Pour l'ajout de vacances
  const [newVacation, setNewVacation] = useState<Omit<Vacation, 'id'>>({
    startDate: '',
    endDate: '',
    description: ''
  });

  // Créer les objets Date basés sur les dates de début et de fin
  const startDateObj = newVacation.startDate ? new Date(newVacation.startDate) : undefined;
  const endDateObj = newVacation.endDate ? new Date(newVacation.endDate) : undefined;

  // Charger les données au chargement du composant
  useEffect(() => {
    loadSalonConfig();
  }, []);

  // S'assurer que le jour sélectionné pour les pauses est toujours un jour d'ouverture
  useEffect(() => {
    // Si le jour actuellement sélectionné n'est plus un jour d'ouverture
    if (!workDays[newBreak.day]) {
      // Trouver le premier jour d'ouverture disponible
      const firstAvailableDay = DAYS_OF_WEEK.find(day => workDays[day]);
      if (firstAvailableDay) {
        setNewBreak(prev => ({...prev, day: firstAvailableDay}));
      }
    }
  }, [workDays, newBreak.day]);

  // Charger la configuration du salon depuis Firestore
  const loadSalonConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const docRef = doc(db, 'salon', 'config');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as SalonConfig;
        
        setWorkDays(data.workDays || {
          'Lundi': true,
          'Mardi': true,
          'Mercredi': true,
          'Jeudi': true,
          'Vendredi': true,
          'Samedi': true,
          'Dimanche': false
        });
        
        setWorkHours(data.workHours || DEFAULT_WORK_HOURS);
        setBreaks(data.breaks || []);
        setVacations(data.vacations || []);
      }
    } catch (err) {
      console.error("Erreur lors du chargement de la configuration:", err);
      setError("Impossible de charger les données. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion des jours d'ouverture
  const handleWorkDayChange = (day: string) => {
    setWorkDays(prev => {
      const newWorkDays = { ...prev, [day]: !prev[day] };
      
      // Si on active un jour, on met des heures par défaut
      if (newWorkDays[day]) {
        setWorkHours(prev => ({
          ...prev,
          [day]: DEFAULT_WORK_HOURS[day]
        }));
      }
      
      return newWorkDays;
    });
  };

  // Gestion des horaires
  const handleWorkHoursChange = (day: string, field: 'start' | 'end', value: string) => {
    setWorkHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Ajout d'une pause
  const handleAddBreak = () => {
    // Validation de la pause
    if (newBreak.start >= newBreak.end) {
      setError("L'heure de fin doit être après l'heure de début");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const id = `break-${Date.now()}`;
    setBreaks([...breaks, { ...newBreak, id }]);
    
    // Réinitialiser le formulaire
    setNewBreak({
      day: newBreak.day,
      start: '12:00',
      end: '13:00'
    });
    
    // Message de confirmation
    setSuccessMessage("Pause ajoutée avec succès");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Suppression d'une pause
  const handleDeleteBreak = (id: string) => {
    setBreaks(breaks.filter(item => item.id !== id));
    
    // Message de confirmation
    setSuccessMessage("Pause supprimée avec succès");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Ajout d'une période de vacances/fermeture
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
    
    const id = `vacation-${Date.now()}`;
    setVacations([...vacations, { ...newVacation, id }]);
    
    // Réinitialiser le formulaire
    setNewVacation({
      startDate: '',
      endDate: '',
      description: ''
    });
    
    // Message de confirmation
    setSuccessMessage("Fermeture exceptionnelle ajoutée avec succès");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Suppression d'une période de vacances/fermeture
  const handleDeleteVacation = (id: string) => {
    setVacations(vacations.filter(item => item.id !== id));
    
    // Message de confirmation
    setSuccessMessage("Fermeture exceptionnelle supprimée avec succès");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Enregistrement des modifications
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Préparer les données à enregistrer
      const salonConfig: SalonConfig = {
        workDays,
        workHours,
        breaks,
        vacations,
        updatedAt: serverTimestamp()
      };
      
      // Enregistrer dans Firestore
      await setDoc(doc(db, 'salon', 'config'), salonConfig);
      
      // Message de confirmation
      setSuccessMessage("Les horaires du salon ont été mis à jour avec succès");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement:", err);
      setError("Impossible d'enregistrer les modifications. Veuillez réessayer.");
    } finally {
      setIsSaving(false);
    }
  };

  // Afficher un indicateur de chargement pendant le chargement initial
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">
            Horaires d'ouverture du salon
          </h2>
        </div>
        <div className="p-6 flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-gray-800 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Chargement des horaires...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* En-tête */}
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">
          Horaires d'ouverture du salon
        </h2>
      </div>
      
      {/* Messages de notification */}
      {(error || successMessage) && (
        <div className={`p-4 ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {error || successMessage}
        </div>
      )}
      
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
            Fermetures exceptionnelles
          </button>
        </div>
      </div>
      
      {/* Contenu */}
      <div className="p-6 bg-white">
        {/* Onglet Horaires */}
        {activeTab === 'horaires' && (
          <div>
            <p className="mb-4 text-gray-600">
              Définissez les jours et horaires d'ouverture du salon.
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
                          Ouverture
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
                          Fermeture
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
              Ajoutez des pauses régulières pour tout le salon (fermeture temporaire).
            </p>
            
            {/* Formulaire d'ajout de pause */}
            <div className="mb-6 p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-800">
              <h3 className="font-medium text-gray-800 mb-4">Ajouter une pause</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Jour</label>
                  <Select
                    value={newBreak.day}
                    onValueChange={(value) => setNewBreak({...newBreak, day: value})}
                  >
                    <SelectTrigger className="w-full border border-gray-800 rounded-md px-2 py-1 text-gray-800 bg-white shadow-sm focus:border-gray-800 focus:ring-gray-800">
                      <SelectValue placeholder="Sélectionner un jour" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.filter(day => workDays[day]).map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        
        {/* Onglet Fermetures exceptionnelles */}
        {activeTab === 'vacances' && (
          <div>
            <p className="mb-4 text-gray-600">
              Définissez les périodes de fermeture exceptionnelle du salon.
            </p>
            
            {/* Formulaire d'ajout de fermeture */}
            <div className="mb-6 p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-800">
              <h3 className="font-medium text-gray-800 mb-4">Ajouter une fermeture exceptionnelle</h3>
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
                  <label className="block text-sm text-gray-600 mb-1">Motif (optionnel)</label>
                  <Input
                    type="text"
                    placeholder="Exemple : Congés annuels"
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
                Ajouter cette fermeture
              </button>
            </div>

            {/* Liste des fermetures */}
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
                        Motif
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
                Aucune fermeture exceptionnelle configurée
              </div>
            )}
          </div>
        )}

        {/* Bouton d'enregistrement */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 flex items-center"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enregistrement...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispoSalon;