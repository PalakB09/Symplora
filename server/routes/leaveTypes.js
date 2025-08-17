const express = require('express');
const { pool } = require('../database/config');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const { idParamSchema } = require('../validations/schemas');

const router = express.Router();

// Get all leave types
router.get('/', async (req, res) => {
  try {
    const [leaveTypes] = await pool.execute(`
      SELECT id, name, description, default_days, color, is_active, created_at
      FROM leave_types
      WHERE is_active = TRUE
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      data: leaveTypes
    });

  } catch (error) {
    console.error('Get leave types error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get leave type by ID
router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    const [leaveTypes] = await pool.execute(`
      SELECT id, name, description, default_days, color, is_active, created_at
      FROM leave_types WHERE id = ?
    `, [id]);

    if (leaveTypes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    res.json({
      success: true,
      data: leaveTypes[0]
    });

  } catch (error) {
    console.error('Get leave type error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new leave type (HR/Admin only)
router.post('/', authenticateToken, requireRole(['hr', 'admin']), async (req, res) => {
  try {
    const { name, description, default_days, color } = req.body;

    // Validate required fields
    if (!name || !default_days) {
      return res.status(400).json({
        success: false,
        message: 'Name and default days are required'
      });
    }

    // Check if leave type already exists
    const [existingTypes] = await pool.execute(
      'SELECT id FROM leave_types WHERE name = ?',
      [name]
    );

    if (existingTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Leave type with this name already exists'
      });
    }

    // Insert new leave type
    const [result] = await pool.execute(`
      INSERT INTO leave_types (name, description, default_days, color)
      VALUES (?, ?, ?, ?)
    `, [name, description || '', default_days, color || '#3B82F6']);

    // Get created leave type
    const [newLeaveType] = await pool.execute(`
      SELECT id, name, description, default_days, color, is_active, created_at
      FROM leave_types WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Leave type created successfully',
      data: newLeaveType[0]
    });

  } catch (error) {
    console.error('Create leave type error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update leave type (HR/Admin only)
router.put('/:id', authenticateToken, requireRole(['hr', 'admin']), validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if leave type exists
    const [existingTypes] = await pool.execute(
      'SELECT id FROM leave_types WHERE id = ?',
      [id]
    );

    if (existingTypes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    // Check if name already exists (if updating name)
    if (updateData.name) {
      const [nameExists] = await pool.execute(
        'SELECT id FROM leave_types WHERE name = ? AND id != ?',
        [updateData.name, id]
      );

      if (nameExists.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Leave type with this name already exists'
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

    // Update leave type
    await pool.execute(`
      UPDATE leave_types SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    // Get updated leave type
    const [updatedLeaveType] = await pool.execute(`
      SELECT id, name, description, default_days, color, is_active, created_at
      FROM leave_types WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Leave type updated successfully',
      data: updatedLeaveType[0]
    });

  } catch (error) {
    console.error('Update leave type error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete leave type (HR/Admin only) - Soft delete
router.delete('/:id', authenticateToken, requireRole(['hr', 'admin']), validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if leave type exists
    const [existingTypes] = await pool.execute(
      'SELECT id, name FROM leave_types WHERE id = ?',
      [id]
    );

    if (existingTypes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave type not found'
      });
    }

    // Check if leave type is being used in leave requests
    const [usedTypes] = await pool.execute(`
      SELECT COUNT(*) as count FROM leave_requests WHERE leave_type_id = ?
    `, [id]);

    if (usedTypes[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete leave type that is being used in leave requests'
      });
    }

    // Soft delete
    await pool.execute(
      'UPDATE leave_types SET is_active = FALSE WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `Leave type ${existingTypes[0].name} deactivated successfully`
    });

  } catch (error) {
    console.error('Delete leave type error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
