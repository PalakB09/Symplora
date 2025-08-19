const { z } = require('zod');

// Employee validation schemas
const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  department: z.string().min(2, 'Department must be at least 2 characters').max(50, 'Department cannot exceed 50 characters'),
  joining_date: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate <= new Date();
  }, 'Joining date must be a valid date and cannot be in the future'),
  role: z.enum(['employee', 'hr', 'admin']).default('employee'),
  gender: z.enum(['male', 'female', 'other']).optional()
});

const employeeUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  department: z.string().min(2).max(50).optional(),
  joining_date: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate <= new Date();
  }, 'Joining date must be a valid date and cannot be in the future').optional(),
  role: z.enum(['employee', 'hr', 'admin']).optional(),
  is_active: z.boolean().optional(),
  gender: z.enum(['male', 'female', 'other']).optional()
});

// Leave request validation schemas
const leaveRequestSchema = z.object({
  leave_type_id: z.number().int().positive('Leave type ID must be a positive integer'),
  start_date: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate >= new Date();
  }, 'Start date must be a valid date and cannot be in the past'),
  end_date: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate >= new Date();
  }, 'End date must be a valid date and cannot be in the past'),
  is_half_day: z.boolean().optional().default(false),
  half_day_session: z.enum(['AM', 'PM']).optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason cannot exceed 500 characters')
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return startDate <= endDate;
}, {
  message: 'End date must be after or equal to start date',
  path: ['end_date']
}).refine((data) => {
  // If half-day, enforce single day and provide session
  if (data.is_half_day) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    return startDate.toDateString() === endDate.toDateString() && !!data.half_day_session;
  }
  return true;
}, {
  message: 'Half-day leave must be for a single date and include half_day_session (AM/PM)',
  path: ['is_half_day']
});

const leaveRequestUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  rejection_reason: z.string().min(10).max(500).optional()
});

// Leave balance validation schemas
const leaveBalanceSchema = z.object({
  employee_id: z.number().int().positive('Employee ID must be a positive integer'),
  leave_type_id: z.number().int().positive('Leave type ID must be a positive integer'),
  year: z.number().int().min(2020).max(2030, 'Year must be between 2020 and 2030'),
  total_days: z.number().min(0, 'Total days cannot be negative').max(365, 'Total days cannot exceed 365')
});

// Authentication schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'New password must be at least 6 characters')
}).refine((data) => data.current_password !== data.new_password, {
  message: 'New password must be different from current password',
  path: ['new_password']
});

// Public holiday schemas
const publicHolidaySchema = z.object({
  name: z.string().min(2, 'Holiday name must be at least 2 characters').max(100, 'Holiday name cannot exceed 100 characters'),
  date: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Date must be a valid date'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional()
});

// Pagination and filtering schemas
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  employee_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional()
});

// ID validation schemas
const idParamSchema = z.object({
  id: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: 'ID must be a positive integer'
  })
});

// Date range validation
const dateRangeSchema = z.object({
  start_date: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Start date must be a valid date'),
  end_date: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'End date must be a valid date')
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return startDate <= endDate;
}, {
  message: 'End date must be after or equal to start date',
  path: ['end_date']
});

module.exports = {
  employeeSchema,
  employeeUpdateSchema,
  leaveRequestSchema,
  leaveRequestUpdateSchema,
  leaveBalanceSchema,
  loginSchema,
  changePasswordSchema,
  publicHolidaySchema,
  paginationSchema,
  idParamSchema,
  dateRangeSchema
};
