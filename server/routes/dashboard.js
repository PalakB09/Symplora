const express = require('express');
const { pool } = require('../database/config');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Simple overview combining leaves summary and counts (HR/Admin only for org-wide)
router.get('/overview', authenticateToken, requireRole(['hr']), async (req, res) => {
  try {
    const [[empCountRow]] = await pool.execute('SELECT COUNT(*) AS employees FROM employees WHERE is_active = TRUE');
    const [[pendingRow]] = await pool.execute("SELECT COUNT(*) AS pending FROM leave_requests WHERE status = 'pending'");
    const [[approvedRow]] = await pool.execute("SELECT COUNT(*) AS approved FROM leave_requests WHERE status = 'approved'");

    res.json({
      success: true,
      data: {
        employees: empCountRow.employees,
        pendingRequests: pendingRow.pending,
        approvedRequests: approvedRow.approved,
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;

