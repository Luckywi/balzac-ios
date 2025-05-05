// lib/availability.ts
import { addMinutes, format, isWithinInterval } from 'date-fns';

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

interface StaffAvailability {
  staffId: string;
  workingHours: Record<string, { working: boolean; ranges: { start: string; end: string }[] }>;
  breaks: Break[];
  vacations: Vacation[];
}

interface Rdv {
  id: string;
  start: string;
  end: string;
  staffId: string;
}

const DAYS_OF_WEEK = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
];

export function generateAvailableTimeSlots(
  date: Date,
  staffId: string,
  duration: number,
  salonConfig: SalonConfig,
  staffAvailability: StaffAvailability,
  existingRdvs: Rdv[]
): string[] {
  // Récupérer l'heure actuelle pour vérifier les créneaux passés
  const now = new Date();
  
  const dayOfWeek = DAYS_OF_WEEK[date.getDay()];

  // Vérifier si le salon est fermé ce jour-là
  if (!salonConfig.workDays[dayOfWeek]) return [];

  // Vérifier si le salon est en vacances ce jour-là
  const isSalonClosedForVacation = salonConfig.vacations.some(vacation => {
    const start = new Date(vacation.startDate);
    const end = new Date(vacation.endDate);
    end.setHours(23, 59, 59, 999);
    return isWithinInterval(date, { start, end });
  });
  if (isSalonClosedForVacation) return [];

  // Vérifier si le staff ne travaille pas ce jour-là
  const staffDay = staffAvailability.workingHours[dayOfWeek];
  if (!staffDay || !staffDay.working) return [];

  // Vérifier si le staff est en vacances ce jour-là
  const isStaffOnVacation = staffAvailability.vacations.some(vacation => {
    const start = new Date(vacation.startDate);
    const end = new Date(vacation.endDate);
    end.setHours(23, 59, 59, 999);
    return isWithinInterval(date, { start, end });
  });
  if (isStaffOnVacation) return [];

  const salonHours = salonConfig.workHours[dayOfWeek];
  const workRanges: { start: string; end: string }[] = [];

  for (const staffRange of staffDay.ranges) {
    if (staffRange.start < salonHours.end && staffRange.end > salonHours.start) {
      const rangeStart = staffRange.start < salonHours.start ? salonHours.start : staffRange.start;
      const rangeEnd = staffRange.end > salonHours.end ? salonHours.end : staffRange.end;
      workRanges.push({ start: rangeStart, end: rangeEnd });
    }
  }

  if (workRanges.length === 0) return [];

  const salonBreaks = salonConfig.breaks.filter(b => b.day === dayOfWeek);
  const staffBreaks = staffAvailability.breaks.filter(b => b.day === dayOfWeek);

  const dateString = format(date, 'yyyy-MM-dd');
  const dayRdvs = existingRdvs.filter(rdv => {
    return rdv.staffId === staffId && rdv.start.startsWith(dateString);
  });

  const slots: string[] = [];

  workRanges.forEach(range => {
    let currentTime = range.start;

    while (currentTime <= range.end) {
      const [hours, minutes] = currentTime.split(':').map(Number);
      const slotStart = new Date(date);
      slotStart.setHours(hours, minutes, 0, 0);
      const slotEnd = addMinutes(slotStart, duration);
      const slotEndTime = format(slotEnd, 'HH:mm');

      if (slotEndTime > range.end) break;

      // Vérifier si le créneau est dans le passé
      const isPastSlot = slotStart <= now;
      
      const isSalonBreak = salonBreaks.some(b => currentTime >= b.start && currentTime < b.end);
      const isStaffBreak = staffBreaks.some(b => currentTime >= b.start && currentTime < b.end);

      const conflictsWithExisting = dayRdvs.some(rdv => {
        const rdvStart = new Date(rdv.start);
        const rdvEnd = new Date(rdv.end);
        return slotStart < rdvEnd && slotEnd > rdvStart;
      });

      // Ne pas ajouter le créneau s'il est dans le passé ou s'il y a un conflit
      if (!isPastSlot && !isSalonBreak && !isStaffBreak && !conflictsWithExisting) {
        slots.push(currentTime);
      }

      const temp = new Date();
      temp.setHours(hours, minutes + 15, 0, 0);
      currentTime = format(temp, 'HH:mm');
    }
  });

  return slots;
}