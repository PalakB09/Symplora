const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../database/config');
const { authenticateToken, requireRole, requireOwnershipOrRole } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const { 
  employeeSchema, 
  employeeUpdateSchema, 
  paginationSchema,
  idParamSchema 
} = require('../validations/schemas');
const { getCurrentYear } = require('../utils/dateUtils');

const router = express.Router();

// Get all employees (HR/Admin only)
router.get('/', authenticateToken, requireRole(['hr', 'admin']), validateQuery(paginationSchema), async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', department = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_active = TRUE';
    let params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR employee_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (department) {
      whereClause += ' AND department = ?';
      params.push(department);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM employees ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get employees
    const [employees] = await pool.execute(`
      SELECT id, employee_id, name, email, department, role, joining_date, is_active, created_at
      FROM employees ${whereClause}
      ORDER BY name ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Get departments for filter
    const [departments] = await pool.execute(`
      SELECT DISTINCT department FROM employees WHERE is_active = TRUE ORDER BY department
    `);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          departments: departments.map(d => d.department)
        }
      }
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get employee by ID
router.get('/:id', authenticateToken, validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can access this employee
    if (req.user.role !== 'hr' && req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own profile'
      });
    }

    const [employees] = await pool.execute(`
      SELECT id, employee_id, name, email, department, role, joining_date, is_active, created_at
      FROM employees WHERE id = ?
    `, [id]);

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employees[0]
    });

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new employee (HR/Admin only)
router.post('/', authenticateToken, requireRole(['hr', 'admin']), validateBody(employeeSchema), async (req, res) => {
  try {
    const { name, email, password, department, joining_date, role } = req.body;

    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM employees WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate employee ID
    const [lastEmployee] = await pool.execute(
      'SELECT employee_id FROM employees ORDER BY id DESC LIMIT 1'
    );

    let nextId = 1;
    if (lastEmployee.length > 0) {
      const lastId = parseInt(lastEmployee[0].employee_id.replace('EMP', ''));
      nextId = lastId + 1;
    }

    const employeeId = `EMP${nextId.toString().padStart(3, '0')}`;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert employee
    const [result] = await pool.execute(`
      INSERT INTO employees (employee_id, name, email, password_hash, department, joining_date, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [employeeId, name, email, passwordHash, department, joining_date, role]);

    // Create leave balances for current year
    const currentYear = getCurrentYear();
    const [leaveTypes] = await pool.execute('SELECT id, default_days FROM leave_types WHERE is_active = TRUE');

    for (const leaveType of leaveTypes) {
      // Calculate pro-rated days based on joining date
      const joiningDate = new Date(joining_date);
      const joiningYear = joiningDate.getFullYear();
      
      let totalDays = leaveType.default_days;
      
      if (joiningYear === currentYear) {
        const daysInYear = 365;
        const daysRemaining = daysInYear - Math.floor((joiningDate - new Date(joiningYear, 0, 1)) / (1000 * 60 * 60 * 24));
        totalDays = Math.round((leaveType.default_days * daysRemaining) / daysInYear);
      }

      await pool.execute(`
        INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days)
        VALUES (?, ?, ?, ?, 0)
      `, [result.insertId, leaveType.id, currentYear, totalDays]);
    }

    // Get created employee
    const [newEmployee] = await pool.execute(`
      SELECT id, employee_id, name, email, department, role, joining_date, is_active, created_at
      FROM employees WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: newEmployee[0]
    });

  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update employee
router.put('/:id', authenticateToken, validateParams(idParamSchema), validateBody(employeeUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if user can update this employee
    if (req.user.role !== 'hr' && req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    // Check if employee exists
    const [existingEmployees] = await pool.execute(
      'SELECT id FROM employees WHERE id = ?',
      [id]
    );

    if (existingEmployees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if email already exists (if updating email)
    if (updateData.email) {
      const [existingUsers] = await pool.execute(
        'SELECT id FROM employees WHERE email = ? AND id != ?',
        [updateData.email, id]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateValues.push(id);

    // Update employee
    await pool.execute(`
      UPDATE employees SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, updateValues);

    // Get updated employee
    const [updatedEmployee] = await pool.execute(`
      SELECT id, employee_id, name, email, department, role, joining_date, is_active, created_at, updated_at
      FROM employees WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee[0]
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete employee (soft delete - HR/Admin only)
router.delete('/:id', authenticateToken, requireRole(['hr', 'admin']), validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const [existingEmployees] = await pool.execute(
      'SELECT id, name FROM employees WHERE id = ?',
      [id]
    );

    if (existingEmployees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Soft delete
    await pool.execute(
      'UPDATE employees SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `Employee ${existingEmployees[0].name} deactivated successfully`
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get employee leave balances
router.get('/:id/leave-balances', authenticateToken, validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can access this employee's leave balances
    if (req.user.role !== 'hr' && req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own leave balances'
      });
    }

    const currentYear = getCurrentYear();

    const [balances] = await pool.execute(`
      SELECT 
        lb.id,
        lb.leave_type_id,
        lb.year,
        lb.total_days,
        lb.used_days,
        lb.remaining_days,
        lt.name as leave_type_name,
        lt.color as leave_type_color,
        lt.description as leave_type_description
      FROM leave_balances lb
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.employee_id = ? AND lb.year = ? AND lt.is_active = TRUE
      ORDER BY lt.name
    `, [id, currentYear]);

    res.json({
      success: true,
      data: {
        employee_id: parseInt(id),
        year: currentYear,
        balances
      }
    });

  } catch (error) {
    console.error('Get leave balances error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
