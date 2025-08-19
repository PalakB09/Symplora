const { ZodError } = require('zod');

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    try {
      let data;
      
      // Validate based on request method
      switch (req.method) {
        case 'GET':
          data = req.query;
          break;
        case 'POST':
        case 'PUT':
        case 'PATCH':
          data = req.body;
          break;
        case 'DELETE':
          data = { ...req.params, ...req.query };
          break;
        default:
          data = {};
      }

      // Parse and validate data
      const validatedData = schema.parse(data);
      
      // Replace the original data with validated data
      if (req.method === 'GET') {
        req.query = validatedData;
      } else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        req.body = validatedData;
      } else if (req.method === 'DELETE') {
        req.params = validatedData;
        req.query = validatedData;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        const validationErrors = issues.map(err => ({
          field: Array.isArray(err.path) ? err.path.join('.') : String(err.path ?? ''),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      console.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Validate request parameters
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const validatedParams = schema.parse(req.params);
      req.params = validatedParams;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        const validationErrors = issues.map(err => ({
          field: Array.isArray(err.path) ? err.path.join('.') : String(err.path ?? ''),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Invalid parameters',
          errors: validationErrors
        });
      }

      next(error);
    }
  };
};

// Validate request body
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const validatedBody = schema.parse(req.body);
      req.body = validatedBody;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        const validationErrors = issues.map(err => ({
          field: Array.isArray(err.path) ? err.path.join('.') : String(err.path ?? ''),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Invalid request body',
          errors: validationErrors
        });
      }

      next(error);
    }
  };
};

// Validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        const validationErrors = issues.map(err => ({
          field: Array.isArray(err.path) ? err.path.join('.') : String(err.path ?? ''),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validationErrors
        });
      }

      next(error);
    }
  };
};

// Sanitize and validate file uploads
const validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check file type
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File size too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`
      });
    }

    next();
  };
};

module.exports = {
  validate,
  validateParams,
  validateBody,
  validateQuery,
  validateFileUpload
};
