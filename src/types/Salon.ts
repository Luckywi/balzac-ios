export interface TimeRange {
    start: string; // 'HH:mm'
    end: string;   // 'HH:mm'
  }
  
  export interface DateRange {
    startDate: string; // 'YYYY-MM-DD'
    endDate: string;   // 'YYYY-MM-DD'
    description?: string;
  }
  
  export type DayOfWeek =
    | 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';
  
  export type SalonOpeningHours = Record<DayOfWeek, {
    open: boolean;
    ranges: TimeRange[]; // Plages d’ouverture par jour
  }>;
  
  export interface SalonConfig {
    openingHours: SalonOpeningHours;
    pauseTimes: Record<DayOfWeek, TimeRange[]>; // Pauses fixes du salon
    closedPeriods: DateRange[]; // Vacances ou fermetures exceptionnelles
  }
  