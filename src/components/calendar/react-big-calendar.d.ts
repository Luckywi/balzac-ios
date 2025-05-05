declare module 'react-big-calendar' {
    import { ComponentType, CSSProperties, ReactNode } from 'react';
  
    export interface Events {
      id: number | string;
      title: string;
      start: Date;
      end: Date;
      allDay?: boolean;
      resource?: any;
      [key: string]: any;
    }
  
    export interface View {
      MONTH: 'month';
      WEEK: 'week';
      WORK_WEEK: 'work_week';
      DAY: 'day';
      AGENDA: 'agenda';
    }
  
    export interface Views {
      MONTH: 'month';
      WEEK: 'week';
      WORK_WEEK: 'work_week';
      DAY: 'day';
      AGENDA: 'agenda';
    }
  
    export type ViewKey = 'month' | 'week' | 'work_week' | 'day' | 'agenda';
  
    export interface DateRange {
      start: Date;
      end: Date;
    }
  
    export interface SlotInfo {
      start: Date;
      end: Date;
      slots: Date[];
      action: 'select' | 'click' | 'doubleClick';
    }
  
    export interface CalendarProps {
      localizer: any;
      events: Events[];
      views?: ViewKey[];
      view?: ViewKey;
      date?: Date;
      defaultView?: ViewKey;
      defaultDate?: Date;
      min?: Date;
      max?: Date;
      step?: number;
      timeslots?: number;
      rtl?: boolean;
      eventPropGetter?: (event: Events, start: Date, end: Date, isSelected: boolean) => { style?: CSSProperties };
      slotPropGetter?: (date: Date) => { style?: CSSProperties };
      timeSlotWrapper?: ComponentType<any>;
      dayPropGetter?: (date: Date) => { style?: CSSProperties };
      showMultiDayTimes?: boolean;
      selectable?: boolean | 'ignoreEvents';
      longPressThreshold?: number;
      onNavigate?: (newDate: Date, view: ViewKey, action: string) => void;
      onView?: (view: ViewKey) => void;
      onDrillDown?: (date: Date, view: ViewKey) => void;
      onRangeChange?: (range: DateRange, view: ViewKey) => void;
      onSelectSlot?: (slotInfo: SlotInfo) => void;
      onDoubleClickEvent?: (event: Events, e: React.SyntheticEvent) => void;
      onSelectEvent?: (event: Events, e: React.SyntheticEvent) => void;
      onKeyPressEvent?: (event: Events, e: React.SyntheticEvent) => void;
      components?: {
        event?: ComponentType<any>;
        eventWrapper?: ComponentType<any>;
        dayWrapper?: ComponentType<any>;
        dateCellWrapper?: ComponentType<any>;
        toolbar?: ComponentType<any>;
        agenda?: {
          date?: ComponentType<any>;
          time?: ComponentType<any>;
          event?: ComponentType<any>;
        };
        day?: {
          header?: ComponentType<any>;
          event?: ComponentType<any>;
        };
        week?: {
          header?: ComponentType<any>;
          event?: ComponentType<any>;
        };
        month?: {
          header?: ComponentType<any>;
          dateHeader?: ComponentType<any>;
          event?: ComponentType<any>;
        };
      };
      messages?: {
        allDay?: string;
        previous?: string;
        next?: string;
        today?: string;
        month?: string;
        week?: string;
        day?: string;
        agenda?: string;
        date?: string;
        time?: string;
        event?: string;
        noEventsInRange?: string;
        showMore?: (total: number) => string;
      };
      formats?: {
        dateFormat?: string;
        dayFormat?: string;
        weekdayFormat?: string;
        timeGutterFormat?: string;
        monthHeaderFormat?: string;
        dayRangeHeaderFormat?: (range: DateRange) => string;
        dayHeaderFormat?: string;
        agendaDateFormat?: string;
        agendaTimeFormat?: string;
        agendaTimeRangeFormat?: (range: DateRange) => string;
        selectRangeFormat?: (range: DateRange) => string;
      };
      startAccessor?: ((event: Events) => Date) | string;
      endAccessor?: ((event: Events) => Date) | string;
      allDayAccessor?: ((event: Events) => boolean) | string;
      titleAccessor?: ((event: Events) => string) | string;
      resourceAccessor?: ((event: Events) => any) | string;
      resources?: any[];
      resourceIdAccessor?: ((resource: any) => string | number) | string;
      resourceTitleAccessor?: ((resource: any) => string) | string;
      culture?: string;
      popup?: boolean;
      style?: CSSProperties;
      className?: string;
      elementProps?: any;
      dayLayoutAlgorithm?: 'overlap' | 'no-overlap' | any;
      toolbar?: boolean;
    }
  
    export const Calendar: React.ComponentType<CalendarProps>;
  
    export const Views: Views;
    export type View = View;
  
    export const momentLocalizer: (moment: any) => any;
    export const globalizeLocalizer: (globalize: any) => any;
    export const dateFnsLocalizer: (config: any) => any;
    export const luxonLocalizer: (luxon: any) => any;
  
    export default Calendar;
  }