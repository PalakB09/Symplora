const express = require('express');
const { pool } = require('../database/config');
const { authenticateToken, requireRole, requireOwnershipOrRole } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const { 
  leaveRequestSchema, 
  leaveRequestUpdateSchema, 
  paginationSchema,
  idParamSchema,
  dateRangeSchema
} = require('../validations/schemas');
const { 
  calculateWorkingDays,
  isPastDate,
  getCurrentYear,
  formatDate,
  isWorkingDay,
  isPublicHoliday
} = require('../utils/dateUtils');

const router = express.Router();

// Get all leave requests (HR/Admin can see all, employees see their own)
router.get('/', authenticateToken, validateQuery(paginationSchema), async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', start_date = '', end_date = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // HR/Admin can see all requests, employees only see their own
    if (req.user.role !== 'hr' && req.user.role !== 'admin') {
      whereClause += ' AND lr.employee_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      whereClause += ' AND lr.status = ?';
      params.push(status);
    }

    if (start_date) {
      whereClause += ' AND lr.start_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ' AND lr.end_date <= ?';
      params.push(end_date);
    }

    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM leave_requests lr 
      ${whereClause}
    `, params);
    const total = countResult[0].total;

    // Get leave requests with employee and leave type details
    const [leaveRequests] = await pool.execute(`
      SELECT
        lr.id,
        lr.employee_id,
        lr.leave_type_id,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.is_half_day,
        lr.half_day_session,
        lr.reason,
        lr.status,
        lr.approved_by,
        lr.approved_at,
        lr.rejection_reason,
        lr.created_at,
        lr.updated_at,
        e.name as employee_name,
        e.employee_id as employee_code,
        e.department as employee_department,
        lt.name as leave_type_name,
        lt.color as leave_type_color,
        approver.name as approver_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN employees approver ON lr.approved_by = approver.id
      ${whereClause}
      ORDER BY lr.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: {
        leaveRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get leave request by ID
router.get('/:id', authenticateToken, validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    const [leaveRequests] = await pool.execute(`
      SELECT
        lr.id,
        lr.employee_id,
        lr.leave_type_id,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.is_half_day,
        lr.half_day_session,
        lr.reason,
        lr.status,
        lr.approved_by,
        lr.approved_at,
        lr.rejection_reason,
        lr.created_at,
        lr.updated_at,
        e.name as employee_name,
        e.employee_id as employee_code,
        e.department as employee_department,
        lt.name as leave_type_name,
        lt.color as leave_type_color,
        approver.name as approver_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN employees approver ON lr.approved_by = approver.id
      WHERE lr.id = ?
    `, [id]);

    if (leaveRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    const leaveRequest = leaveRequests[0];

    // Check if user can access this leave request
    if (req.user.role !== 'hr' && req.user.role !== 'admin' && req.user.id !== leaveRequest.employee_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own leave requests'
      });
    }

    res.json({
      success: true,
      data: leaveRequest
    });

  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Apply for leave
router.post('/', authenticateToken, validateBody(leaveRequestSchema), async (req, res) => {
  try {
    const { leave_type_id, start_date, end_date, reason, is_half_day, half_day_session } = req.body;

    // Edge Case 1: Check if dates are in the past
    if (isPastDate(start_date) || isPastDate(end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply for leave in the past'
      });
    }

    // Edge Case 2: Check if employee exists and is active
    const [employees] = await pool.execute(`
      SELECT id, joining_date, gender FROM employees WHERE id = ? AND is_active = TRUE
    `, [req.user.id]);

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found or inactive'
      });
    }

    const employee = employees[0];

    // Edge Case 3: Check if applying for leave before joining date
    if (new Date(start_date) < new Date(employee.joining_date)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply for leave before joining date'
      });
    }

    // Edge Case 3b: If half-day, must be a working day and not a public holiday
    if (is_half_day) {
      const sameDay = new Date(start_date);
      if (!isWorkingDay(sameDay)) {
        return res.status(400).json({ success: false, message: 'Half-day leave must be on a working day (Mon-Fri)' });
      }
      const holiday = await isPublicHoliday(sameDay);
      if (holiday) {
        return res.status(400).json({ success: false, message: 'Half-day leave cannot be on a public holiday' });
      }
    }

    // Edge Case 4: Check for overlapping leave requests
    const [overlappingRequests] = await pool.execute(`
      SELECT id FROM leave_requests 
      WHERE employee_id = ? 
      AND status IN ('pending', 'approved')
      AND (
        (start_date BETWEEN ? AND ?) OR
        (end_date BETWEEN ? AND ?) OR
        (start_date <= ? AND end_date >= ?)
      )
    `, [req.user.id, start_date, end_date, start_date, end_date, start_date, end_date]);

    if (overlappingRequests.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have overlapping leave requests for these dates'
      });
    }

    // Calculate working days (excluding weekends and holidays)
    let totalDays = await calculateWorkingDays(start_date, end_date);

    // If half-day, force totalDays = 0.5
    if (is_half_day) {
      totalDays = 0.5;
    }

    if (totalDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range or no working days selected'
      });
    }

    // Edge Case 5: Check maternity/paternity constraints & balance
    const currentYear = getCurrentYear();
    const [leaveBalance] = await pool.execute(`
      SELECT (lb.total_days - lb.used_days) AS remaining_days, lt.name as leave_type_name
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = ? AND lb.leave_type_id = ? AND lb.year = ?
    `, [req.user.id, leave_type_id, currentYear]);

    if (leaveBalance.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Leave balance not found for this leave type'
      });
    }

    // Additional constraints for maternity/paternity
    // - Maternity: only female employees
    // - Paternity: only male employees
    const [ltRows] = await pool.execute('SELECT name FROM leave_types WHERE id = ?', [leave_type_id]);
    const ltName = ltRows.length ? ltRows[0].name.toLowerCase() : '';
    if (ltName.includes('maternity') && employee.gender !== 'female') {
      return res.status(400).json({ success: false, message: 'Maternity leave is available only to female employees' });
    }
    if (ltName.includes('paternity') && employee.gender !== 'male') {
      return res.status(400).json({ success: false, message: 'Paternity leave is available only to male employees' });
    }
    if ((ltName.includes('maternity') || ltName.includes('paternity')) && is_half_day) {
      return res.status(400).json({ success: false, message: 'Half-day is not allowed for Maternity/Paternity leave' });
    }

    // For unpaid leave, skip balance checks
    const isUnpaid = ltName.includes('unpaid');

    if (!isUnpaid && leaveBalance[0].remaining_days < totalDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. You have ${leaveBalance[0].remaining_days} days remaining for ${leaveBalance[0].leave_type_name}`
      });
    }

    // Create leave request
    const [result] = await pool.execute(`
      INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, is_half_day, half_day_session, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, leave_type_id, start_date, end_date, totalDays, !!is_half_day, is_half_day ? half_day_session : null, reason]);

    // Get created leave request
    const [newLeaveRequest] = await pool.execute(`
      SELECT
        lr.id,
        lr.employee_id,
        lr.leave_type_id,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.is_half_day,
        lr.half_day_session,
        lr.reason,
        lr.status,
        lr.created_at,
        e.name as employee_name,
        lt.name as leave_type_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: newLeaveRequest[0]
    });

  } catch (error) {
    console.error('Apply for leave error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Approve/Reject leave request (HR/Admin only)
router.patch('/:id/status', authenticateToken, requireRole(['hr']), validateParams(idParamSchema), validateBody(leaveRequestUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    // Check if leave request exists
    const [leaveRequests] = await pool.execute(`
      SELECT lr.*, e.name as employee_name, lt.name as leave_type_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.id = ?
    `, [id]);

    if (leaveRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    const leaveRequest = leaveRequests[0];

    // Check if leave request is already processed
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${leaveRequest.status}`
      });
    }

    // Validate rejection reason if rejecting
    if (status === 'rejected' && !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a leave request'
      });
    }

    // Update leave request status
    await pool.execute(`
      UPDATE leave_requests
      SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, req.user.id, rejection_reason || null, id]);

    // If approved, update leave balance
    if (status === 'approved') {
      await pool.execute(`
        UPDATE leave_balances 
        SET used_days = used_days + ? 
        WHERE employee_id = ? AND leave_type_id = ? AND year = ?
      `, [leaveRequest.total_days, leaveRequest.employee_id, leaveRequest.leave_type_id, new Date().getFullYear()]);
    }

    // Get updated leave request
    const [updatedLeaveRequest] = await pool.execute(`
      SELECT
        lr.id,
        lr.employee_id,
        lr.leave_type_id,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.is_half_day,
        lr.half_day_session,
        lr.reason,
        lr.status,
        lr.approved_by,
        lr.approved_at,
        lr.rejection_reason,
        lr.updated_at,
        e.name as employee_name,
        lt.name as leave_type_name,
        approver.name as approver_name
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN employees approver ON lr.approved_by = approver.id
      WHERE lr.id = ?
    `, [id]);

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: updatedLeaveRequest[0]
    });

  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Cancel leave request (employee can cancel their own pending requests)
router.patch('/:id/cancel', authenticateToken, validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if leave request exists
    const [leaveRequests] = await pool.execute(`
      SELECT * FROM leave_requests WHERE id = ?
    `, [id]);

    if (leaveRequests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    const leaveRequest = leaveRequests[0];

    // Check if user can cancel this request
    if (req.user.role !== 'hr' && req.user.role !== 'admin' && req.user.id !== leaveRequest.employee_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own leave requests'
      });
    }

    // Check if request can be cancelled
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ${leaveRequest.status} leave request`
      });
    }

    // Cancel the request
    await pool.execute(`
      UPDATE leave_requests 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Leave request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get leave statistics for dashboard
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const currentYear = getCurrentYear();
    let whereClause = 'WHERE lr.created_at >= ?';
    let params = [`${currentYear}-01-01`];

    // HR/Admin can see all stats, employees only see their own
    if (req.user.role !== 'hr' && req.user.role !== 'admin') {
      whereClause += ' AND lr.employee_id = ?';
      params.push(req.user.id);
    }

    // Get leave statistics
    const [stats] = await pool.execute(`
      SELECT 
        lr.status,
        COUNT(*) as count,
        SUM(lr.total_days) as total_days
      FROM leave_requests lr
      ${whereClause}
      GROUP BY lr.status
    `, params);

    // Get leave type distribution
    const [leaveTypeStats] = await pool.execute(`
      SELECT 
        lt.name as leave_type_name,
        lt.color as leave_type_color,
        COUNT(*) as count,
        SUM(lr.total_days) as total_days
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      ${whereClause}
      GROUP BY lt.id, lt.name, lt.color
      ORDER BY total_days DESC
    `, params);

    res.json({
      success: true,
      data: {
        year: currentYear,
        statusBreakdown: stats,
        leaveTypeBreakdown: leaveTypeStats
      }
    });

  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
