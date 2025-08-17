const { pool } = require('./config');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    console.log('🌱 Starting database seeding...');

    // Hash password for default users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Insert sample employees
    await connection.execute(`
      INSERT IGNORE INTO employees (employee_id, name, email, password_hash, department, joining_date, role) VALUES
      ('EMP001', 'John Doe', 'john.doe@company.com', '${hashedPassword}', 'Engineering', '2023-01-15', 'employee'),
      ('EMP002', 'Jane Smith', 'jane.smith@company.com', '${hashedPassword}', 'Marketing', '2023-02-01', 'employee'),
      ('EMP003', 'Bob Johnson', 'bob.johnson@company.com', '${hashedPassword}', 'Sales', '2023-03-10', 'employee'),
      ('EMP004', 'Alice Brown', 'alice.brown@company.com', '${hashedPassword}', 'HR', '2023-01-01', 'hr'),
      ('EMP005', 'Charlie Wilson', 'charlie.wilson@company.com', '${hashedPassword}', 'Finance', '2023-04-01', 'employee'),
      ('EMP006', 'Diana Davis', 'diana.davis@company.com', '${hashedPassword}', 'Operations', '2023-05-01', 'employee'),
      ('EMP007', 'Eve Miller', 'eve.miller@company.com', '${hashedPassword}', 'Engineering', '2023-06-01', 'employee'),
      ('EMP008', 'Frank Garcia', 'frank.garcia@company.com', '${hashedPassword}', 'Marketing', '2023-07-01', 'employee'),
      ('EMP009', 'Grace Lee', 'grace.lee@company.com', '${hashedPassword}', 'Sales', '2023-08-01', 'employee'),
      ('EMP010', 'Henry Taylor', 'henry.taylor@company.com', '${hashedPassword}', 'Engineering', '2023-09-01', 'employee')
    `);

    console.log('✅ Sample employees inserted!');

    // Get current year
    const currentYear = new Date().getFullYear();

    // Insert leave balances for all employees
    const [employees] = await connection.execute('SELECT id FROM employees');
    const [leaveTypes] = await connection.execute('SELECT id, default_days FROM leave_types');

    for (const employee of employees) {
      for (const leaveType of leaveTypes) {
        // Calculate pro-rated days based on joining date
        const [empData] = await connection.execute(
          'SELECT joining_date FROM employees WHERE id = ?',
          [employee.id]
        );
        
        const joiningDate = new Date(empData[0].joining_date);
        const joiningYear = joiningDate.getFullYear();
        
        let totalDays = leaveType.default_days;
        
        // If employee joined mid-year, pro-rate the leave
        if (joiningYear === currentYear) {
          const daysInYear = 365;
          const daysRemaining = daysInYear - Math.floor((joiningDate - new Date(joiningYear, 0, 1)) / (1000 * 60 * 60 * 24));
          totalDays = Math.round((leaveType.default_days * daysRemaining) / daysInYear);
        }

        await connection.execute(`
          INSERT IGNORE INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days)
          VALUES (?, ?, ?, ?, 0)
        `, [employee.id, leaveType.id, currentYear, totalDays]);
      }
    }

    console.log('✅ Leave balances created!');

    // Insert sample leave requests
    await connection.execute(`
      INSERT IGNORE INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status) VALUES
      (1, 1, '2024-06-15', '2024-06-20', 4, 'Summer vacation with family', 'pending'),
      (2, 2, '2024-06-10', '2024-06-12', 2.5, 'Not feeling well, need rest', 'approved'),
      (3, 3, '2024-06-25', '2024-06-26', 1, 'Personal appointment', 'pending'),
      (5, 1, '2024-07-01', '2024-07-05', 4, 'Weekend getaway', 'pending'),
      (7, 2, '2024-06-18', '2024-06-19', 1.5, 'Doctor appointment', 'approved')
    `);

    console.log('✅ Sample leave requests inserted!');

    // Update some leave balances to show used days
    await connection.execute(`
      UPDATE leave_balances 
      SET used_days = 2.5 
      WHERE employee_id = 2 AND leave_type_id = 2 AND year = ${currentYear}
    `);

    await connection.execute(`
      UPDATE leave_balances 
      SET used_days = 1.5 
      WHERE employee_id = 7 AND leave_type_id = 2 AND year = ${currentYear}
    `);

    console.log('✅ Leave balances updated with used days!');

    connection.release();
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Default login credentials:');
    console.log('Email: john.doe@company.com');
    console.log('Password: password123');
    console.log('\nHR Login:');
    console.log('Email: alice.brown@company.com');
    console.log('Password: password123');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
