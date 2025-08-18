const { pool } = require('./config');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Hash password for default users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Insert sample employees (upsert by email)
    const employeesData = [
      ['EMP001', 'John Doe', 'john.doe@company.com', 'Engineering', '2023-01-15', 'employee', 'male'],
      ['EMP002', 'Jane Smith', 'jane.smith@company.com', 'Marketing', '2023-02-01', 'employee', 'female'],
      ['EMP003', 'Bob Johnson', 'bob.johnson@company.com', 'Sales', '2023-03-10', 'employee', 'male'],
      ['EMP004', 'Alice Brown', 'alice.brown@company.com', 'HR', '2023-01-01', 'hr', 'female'],
      ['EMP005', 'Charlie Wilson', 'charlie.wilson@company.com', 'Finance', '2023-04-01', 'employee', 'male'],
      ['EMP006', 'Diana Davis', 'diana.davis@company.com', 'Operations', '2023-05-01', 'employee', 'female'],
      ['EMP007', 'Eve Miller', 'eve.miller@company.com', 'Engineering', '2023-06-01', 'employee', 'female'],
      ['EMP008', 'Frank Garcia', 'frank.garcia@company.com', 'Marketing', '2023-07-01', 'employee', 'male'],
      ['EMP009', 'Grace Lee', 'grace.lee@company.com', 'Sales', '2023-08-01', 'employee', 'female'],
      ['EMP010', 'Henry Taylor', 'henry.taylor@company.com', 'Engineering', '2023-09-01', 'employee', 'male'],
    ];

    for (const [empId, name, email, dept, joining, role, gender] of employeesData) {
      await pool.execute(
        `INSERT INTO employees (employee_id, name, email, password_hash, department, joining_date, role, gender)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (email) DO NOTHING`,
        [empId, name, email, hashedPassword, dept, joining, role, gender]
      );
    }

    console.log('✅ Sample employees inserted!');

    // Get current year
    const currentYear = new Date().getFullYear();

    // Insert leave balances for all employees
    const [employees] = await pool.execute('SELECT id, email, joining_date FROM employees');
    const [leaveTypes] = await pool.execute('SELECT id, default_days FROM leave_types');

    for (const employee of employees) {
      for (const leaveType of leaveTypes) {
        const joiningDate = new Date(employee.joining_date);
        const joiningYear = joiningDate.getFullYear();
        let totalDays = leaveType.default_days;
        if (joiningYear === currentYear) {
          const daysInYear = 365;
          const daysElapsed = Math.floor((joiningDate - new Date(joiningYear, 0, 1)) / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(0, daysInYear - daysElapsed);
          totalDays = Math.round((leaveType.default_days * daysRemaining) / daysInYear);
        }

        await pool.execute(`
          INSERT INTO leave_balances (employee_id, leave_type_id, year, total_days, used_days)
          VALUES (?, ?, ?, ?, 0)
          ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING
        `, [employee.id, leaveType.id, currentYear, totalDays]);
      }
    }

    console.log('✅ Leave balances created!');

    // Insert sample leave requests
    const empByEmail = Object.fromEntries(employees.map(e => [e.email, e.id]));
    const [ltRows] = await pool.execute('SELECT id, name FROM leave_types');
    const ltByName = Object.fromEntries(ltRows.map(lt => [lt.name, lt.id]));

    const samples = [
      [empByEmail['john.doe@company.com'], ltByName['Annual Leave'], '2024-06-15', '2024-06-20', 4, 'Summer vacation with family', 'pending'],
      [empByEmail['jane.smith@company.com'], ltByName['Sick Leave'], '2024-06-10', '2024-06-12', 2.5, 'Not feeling well, need rest', 'approved'],
      [empByEmail['bob.johnson@company.com'], ltByName['Casual Leave'], '2024-06-25', '2024-06-26', 1, 'Personal appointment', 'pending'],
      [empByEmail['charlie.wilson@company.com'], ltByName['Annual Leave'], '2024-07-01', '2024-07-05', 4, 'Weekend getaway', 'pending'],
      [empByEmail['eve.miller@company.com'], ltByName['Sick Leave'], '2024-06-18', '2024-06-19', 1.5, 'Doctor appointment', 'approved']
    ];

    for (const row of samples) {
      if (!row[0] || !row[1]) continue;
      await pool.execute(
        `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT DO NOTHING`,
        row
      );
    }

    console.log('✅ Sample leave requests inserted!');

    // Update some leave balances to show used days
    if (empByEmail['jane.smith@company.com'] && ltByName['Sick Leave']) {
      await pool.execute(
        `UPDATE leave_balances SET used_days = 2.5 WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
        [empByEmail['jane.smith@company.com'], ltByName['Sick Leave'], currentYear]
      );
    }

    if (empByEmail['eve.miller@company.com'] && ltByName['Sick Leave']) {
      await pool.execute(
        `UPDATE leave_balances SET used_days = 1.5 WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
        [empByEmail['eve.miller@company.com'], ltByName['Sick Leave'], currentYear]
      );
    }

    console.log('✅ Leave balances updated with used days!');


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
