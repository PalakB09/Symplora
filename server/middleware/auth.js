const jwt = require('jsonwebtoken');
const { pool } = require('../database/config');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token is required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details from database
    const [users] = await pool.execute(
      'SELECT id, employee_id, name, email, department, role, gender, is_active FROM employees WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or inactive' 
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Check if user is accessing their own resource or has HR/Admin role
const requireOwnershipOrRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // HR and Admin can access all resources
    if (roles.includes(req.user.role)) {
      return next();
    }

    // Employees can only access their own resources
    const resourceId = parseInt(req.params.id || req.body.employee_id);
    if (req.user.id !== resourceId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only access your own resources' 
      });
    }

    next();
  };
};

// Rate limiting for login attempts
const loginRateLimit = (req, res, next) => {
  // Simple in-memory rate limiting (in production, use Redis)
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  if (!req.app.locals.loginAttempts) {
    req.app.locals.loginAttempts = new Map();
  }

  const attempts = req.app.locals.loginAttempts.get(clientIP) || { count: 0, resetTime: now + windowMs };

  if (now > attempts.resetTime) {
    attempts.count = 1;
    attempts.resetTime = now + windowMs;
  } else {
    attempts.count++;
  }

  req.app.locals.loginAttempts.set(clientIP, attempts);

  if (attempts.count > maxAttempts) {
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnershipOrRole,
  loginRateLimit
};
