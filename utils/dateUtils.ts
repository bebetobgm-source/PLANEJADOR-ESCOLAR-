
import { Holiday } from '../types';

export const isHoliday = (date: Date, holidays: Holiday[]): boolean => {
  const dateStr = date.toISOString().split('T')[0];
  return holidays.some(h => h.date === dateStr);
};

export const formatDisplayDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const getNextClassDate = (
  currentDate: Date,
  classDays: number[],
  holidays: Holiday[],
  endDate: Date
): Date | null => {
  let date = new Date(currentDate);
  date.setDate(date.getDate() + 1);

  while (date <= endDate) {
    const dayOfWeek = date.getDay();
    if (classDays.includes(dayOfWeek) && !isHoliday(date, holidays)) {
      return date;
    }
    date.setDate(date.getDate() + 1);
  }

  return null;
};
