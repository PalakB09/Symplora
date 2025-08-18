const express = require('express');
const { pool } = require('../database/config');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const { idParamSchema } = require('../validations/schemas');

const router = express.Router();

// Get all public holidays
router.get('/', async (req, res) => {
  try {
    const [holidays] = await pool.execute(`
      SELECT id, name, date, description, is_active, created_at
      FROM public_holidays
      WHERE is_active = TRUE
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: holidays
    });

  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get holidays for a specific year
router.get('/year/:year', async (req, res) => {
  try {
    const { year } = req.params;

    if (!year || isNaN(parseInt(year))) {
      return res.status(400).json({
        success: false,
        message: 'Valid year is required'
      });
    }

    const [holidays] = await pool.execute(`
      SELECT id, name, date, description, is_active, created_at
      FROM public_holidays
      WHERE EXTRACT(YEAR FROM date) = ? AND is_active = TRUE
      ORDER BY date ASC
    `, [year]);

    res.json({
      success: true,
      data: {
        year: parseInt(year),
        holidays
      }
    });

  } catch (error) {
    console.error('Get holidays by year error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get holiday by ID
router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    const [holidays] = await pool.execute(`
      SELECT id, name, date, description, is_active, created_at
      FROM public_holidays WHERE id = ?
    `, [id]);

    if (holidays.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    res.json({
      success: true,
      data: holidays[0]
    });

  } catch (error) {
    console.error('Get holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new holiday (HR/Admin only)
router.post('/', authenticateToken, requireRole(['hr', 'admin']), async (req, res) => {
  try {
    const { name, date, description } = req.body;

    // Validate required fields
    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: 'Name and date are required'
      });
    }

    // Validate date format
    const holidayDate = new Date(date);
    if (isNaN(holidayDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Check if holiday already exists on the same date
    const [existingHolidays] = await pool.execute(
      'SELECT id FROM public_holidays WHERE date = ?',
      [date]
    );

    if (existingHolidays.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A holiday already exists on this date'
      });
    }

    // Insert new holiday
    const [result] = await pool.execute(`
      INSERT INTO public_holidays (name, date, description)
      VALUES (?, ?, ?)
    `, [name, date, description || '']);

    // Get created holiday
    const [newHoliday] = await pool.execute(`
      SELECT id, name, date, description, is_active, created_at
      FROM public_holidays WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: newHoliday[0]
    });

  } catch (error) {
    console.error('Create holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update holiday (HR/Admin only)
router.put('/:id', authenticateToken, requireRole(['hr', 'admin']), validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if holiday exists
    const [existingHolidays] = await pool.execute(
      'SELECT id FROM public_holidays WHERE id = ?',
      [id]
    );

    if (existingHolidays.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    // Validate date if updating
    if (updateData.date) {
      const holidayDate = new Date(updateData.date);
      if (isNaN(holidayDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }

      // Check if new date conflicts with existing holidays
      const [dateConflict] = await pool.execute(
        'SELECT id FROM public_holidays WHERE date = ? AND id != ?',
        [updateData.date, id]
      );

      if (dateConflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'A holiday already exists on this date'
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

    // Update holiday
    await pool.execute(`
      UPDATE public_holidays SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    // Get updated holiday
    const [updatedHoliday] = await pool.execute(`
      SELECT id, name, date, description, is_active, created_at
      FROM public_holidays WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Holiday updated successfully',
      data: updatedHoliday[0]
    });

  } catch (error) {
    console.error('Update holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete holiday (HR/Admin only) - Soft delete
router.delete('/:id', authenticateToken, requireRole(['hr', 'admin']), validateParams(idParamSchema), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if holiday exists
    const [existingHolidays] = await pool.execute(
      'SELECT id, name FROM public_holidays WHERE id = ?',
      [id]
    );

    if (existingHolidays.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    // Soft delete
    await pool.execute(
      'UPDATE public_holidays SET is_active = FALSE WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `Holiday ${existingHolidays[0].name} deactivated successfully`
    });

  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bulk import holidays (HR/Admin only)
router.post('/bulk-import', authenticateToken, requireRole(['hr', 'admin']), async (req, res) => {
  try {
    const { holidays } = req.body;

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Holidays array is required and cannot be empty'
      });
    }

    const results = [];
    const errors = [];

    for (const holiday of holidays) {
      try {
        const { name, date, description } = holiday;

        if (!name || !date) {
          errors.push({ holiday, error: 'Name and date are required' });
          continue;
        }

        // Validate date format
        const holidayDate = new Date(date);
        if (isNaN(holidayDate.getTime())) {
          errors.push({ holiday, error: 'Invalid date format' });
          continue;
        }

        // Check if holiday already exists
        const [existingHolidays] = await pool.execute(
          'SELECT id FROM public_holidays WHERE date = ?',
          [date]
        );

        if (existingHolidays.length > 0) {
          errors.push({ holiday, error: 'Holiday already exists on this date' });
          continue;
        }

        // Insert holiday
        const [result] = await pool.execute(`
          INSERT INTO public_holidays (name, date, description)
          VALUES (?, ?, ?)
        `, [name, date, description || '']);

        results.push({ ...holiday, id: result.insertId, status: 'created' });

      } catch (error) {
        errors.push({ holiday, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed. ${results.length} created, ${errors.length} failed.`,
      data: {
        created: results,
        errors
      }
    });

  } catch (error) {
    console.error('Bulk import holidays error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
