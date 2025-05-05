// src/types/Staff.ts

import { DayOfWeek } from './Salon'

export interface TimeRange {
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
}

export interface Break {
  id: string;
  day: DayOfWeek;
  start: string;
  end: string;
}

export interface Vacation {
  id: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
  description?: string;
}

export type StaffWorkingHours = Record<DayOfWeek, {
  working: boolean;
  ranges: TimeRange[];
}>;

export interface StaffAvailability {
  staffId: string;
  workingHours: StaffWorkingHours;
  breaks: Break[];
  vacations: Vacation[];
}
