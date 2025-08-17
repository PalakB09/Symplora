const dayjs = require('dayjs');
const { pool } = require('../database/config');

// Calculate working days between two dates (excluding weekends and public holidays)
const calculateWorkingDays = async (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  if (start.isAfter(end)) {
    throw new Error('Start date cannot be after end date');
  }

  let workingDays = 0;
  let currentDate = start;

  while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (currentDate.day() !== 0 && currentDate.day() !== 6) {
      workingDays++;
    }
    currentDate = currentDate.add(1, 'day');
  }

  // Subtract public holidays
  try {
    const [holidays] = await pool.execute(`
      SELECT date FROM public_holidays 
      WHERE date BETWEEN ? AND ? AND is_active = TRUE
    `, [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]);

    for (const holiday of holidays) {
      const holidayDate = dayjs(holiday.date);
      // Only subtract if it's a weekday
      if (holidayDate.day() !== 0 && holidayDate.day() !== 6) {
        workingDays--;
      }
    }
  } catch (error) {
    console.error('Error fetching public holidays:', error);
  }

  return Math.max(0, workingDays);
};

// Check if a date is a working day
const isWorkingDay = (date) => {
  const day = dayjs(date).day();
  return day !== 0 && day !== 6; // Not Sunday and not Saturday
};

// Check if a date is a public holiday
const isPublicHoliday = async (date) => {
  try {
    const [holidays] = await pool.execute(`
      SELECT id FROM public_holidays 
      WHERE date = ? AND is_active = TRUE
    `, [dayjs(date).format('YYYY-MM-DD')]);
    
    return holidays.length > 0;
  } catch (error) {
    console.error('Error checking public holiday:', error);
    return false;
  }
};

// Get next working day
const getNextWorkingDay = (date) => {
  let nextDay = dayjs(date).add(1, 'day');
  
  while (!isWorkingDay(nextDay)) {
    nextDay = nextDay.add(1, 'day');
  }
  
  return nextDay;
};

// Get previous working day
const getPreviousWorkingDay = (date) => {
  let prevDay = dayjs(date).subtract(1, 'day');
  
  while (!isWorkingDay(prevDay)) {
    prevDay = prevDay.subtract(1, 'day');
  }
  
  return prevDay;
};

// Format date for display
const formatDate = (date, format = 'YYYY-MM-DD') => {
  return dayjs(date).format(format);
};

// Check if date is valid
const isValidDate = (date) => {
  return dayjs(date).isValid();
};

// Check if date is in the past
const isPastDate = (date) => {
  return dayjs(date).isBefore(dayjs(), 'day');
};

// Check if date is today
const isToday = (date) => {
  return dayjs(date).isSame(dayjs(), 'day');
};

// Get current year
const getCurrentYear = () => {
  return dayjs().year();
};

// Get fiscal year (assuming April-March)
const getFiscalYear = (date = new Date()) => {
  const currentDate = dayjs(date);
  const month = currentDate.month() + 1; // dayjs months are 0-indexed
  
  if (month >= 4) {
    return currentDate.year();
  } else {
    return currentDate.year() - 1;
  }
};

module.exports = {
  calculateWorkingDays,
  isWorkingDay,
  isPublicHoliday,
  getNextWorkingDay,
  getPreviousWorkingDay,
  formatDate,
  isValidDate,
  isPastDate,
  isToday,
  getCurrentYear,
  getFiscalYear
};
