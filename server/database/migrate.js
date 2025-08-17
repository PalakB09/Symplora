const { pool } = require('./config');

const createTables = async () => {
  try {
    const connection = await pool.getConnection();
    
    console.log('🚀 Starting database migration...');

    // Create employees table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        department VARCHAR(50) NOT NULL,
        joining_date DATE NOT NULL,
        role ENUM('employee', 'hr', 'admin') DEFAULT 'employee',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create leave_types table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        default_days INT NOT NULL,
        color VARCHAR(7) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // Create leave_balances table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        leave_type_id INT NOT NULL,
        year INT NOT NULL,
        total_days DECIMAL(5,2) NOT NULL,
        used_days DECIMAL(5,2) DEFAULT 0,
        remaining_days DECIMAL(5,2) GENERATED ALWAYS AS (total_days - used_days) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
        UNIQUE KEY unique_balance (employee_id, leave_type_id, year)
      )
    `);

    // Create leave_requests table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id INT NOT NULL,
        leave_type_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days DECIMAL(5,2) NOT NULL,
        reason TEXT,
        status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
        approved_by INT,
        approved_at TIMESTAMP NULL,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
      )
    `);

    // Create public_holidays table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS public_holidays (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create audit_logs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id INT,
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ All tables created successfully!');

    // Insert default leave types
    await connection.execute(`
      INSERT IGNORE INTO leave_types (name, description, default_days, color) VALUES
      ('Annual Leave', 'Regular annual vacation leave', 20, '#10B981'),
      ('Sick Leave', 'Medical and health-related leave', 15, '#EF4444'),
      ('Casual Leave', 'Short personal leave', 10, '#F59E0B'),
      ('Maternity Leave', 'Maternity and childcare leave', 180, '#EC4899'),
      ('Paternity Leave', 'Paternity and childcare leave', 15, '#8B5CF6'),
      ('Bereavement Leave', 'Leave for family bereavement', 5, '#6B7280'),
      ('Unpaid Leave', 'Leave without pay', 0, '#9CA3AF')
    `);

    console.log('✅ Default leave types inserted!');

    // Insert default public holidays (India 2024)
    await connection.execute(`
      INSERT IGNORE INTO public_holidays (name, date, description) VALUES
      ('Republic Day', '2024-01-26', 'National holiday'),
      ('Independence Day', '2024-08-15', 'National holiday'),
      ('Gandhi Jayanti', '2024-10-02', 'National holiday'),
      ('Christmas', '2024-12-25', 'Religious holiday'),
      ('New Year', '2025-01-01', 'New Year holiday')
    `);

    console.log('✅ Default public holidays inserted!');

    connection.release();
    console.log('🎉 Database migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

createTables();
