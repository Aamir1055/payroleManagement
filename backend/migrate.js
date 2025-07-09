const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_db'
});

const migrations = [
  // Create OfficeMaster table
  `CREATE TABLE IF NOT EXISTS OfficeMaster (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // Create PositionMaster table
  `CREATE TABLE IF NOT EXISTS PositionMaster (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // Create OfficePositions relationship table
  `CREATE TABLE IF NOT EXISTS OfficePositions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    office_id INT NOT NULL,
    position_id INT NOT NULL,
    reporting_time TIME NOT NULL DEFAULT '09:00:00',
    duty_hours DECIMAL(3,1) NOT NULL DEFAULT 8.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (office_id) REFERENCES OfficeMaster(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES PositionMaster(id) ON DELETE CASCADE,
    UNIQUE KEY unique_office_position (office_id, position_id)
  )`,

  // Create Employees table if not exists
  `CREATE TABLE IF NOT EXISTS Employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employeeId VARCHAR(50) NOT NULL UNIQUE,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    office VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    monthlySalary DECIMAL(10,2) NOT NULL,
    dutyHours INT NOT NULL DEFAULT 8,
    reportingTime TIME NOT NULL DEFAULT '09:00:00',
    allowedLateDays INT NOT NULL DEFAULT 3,
    joiningDate DATE NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`
];

const seedData = [
  // Insert sample offices
  `INSERT IGNORE INTO OfficeMaster (name) VALUES 
  ('New York'),
  ('Los Angeles'),
  ('Chicago'),
  ('Houston'),
  ('Dubai')`,

  // Insert sample positions
  `INSERT IGNORE INTO PositionMaster (name) VALUES 
  ('Software Engineer'),
  ('Data Analyst'),
  ('Product Manager'),
  ('Designer'),
  ('HR Specialist')`
];

const relationshipData = [
  // Insert some sample office-position relationships
  `INSERT IGNORE INTO OfficePositions (office_id, position_id, reporting_time, duty_hours) VALUES 
  ((SELECT id FROM OfficeMaster WHERE name = 'New York'), (SELECT id FROM PositionMaster WHERE name = 'Software Engineer'), '09:00:00', 8.0),
  ((SELECT id FROM OfficeMaster WHERE name = 'New York'), (SELECT id FROM PositionMaster WHERE name = 'Data Analyst'), '09:00:00', 8.0),
  ((SELECT id FROM OfficeMaster WHERE name = 'New York'), (SELECT id FROM PositionMaster WHERE name = 'Product Manager'), '10:00:00', 7.0),
  ((SELECT id FROM OfficeMaster WHERE name = 'Dubai'), (SELECT id FROM PositionMaster WHERE name = 'Data Analyst'), '08:30:00', 8.5),
  ((SELECT id FROM OfficeMaster WHERE name = 'Dubai'), (SELECT id FROM PositionMaster WHERE name = 'Software Engineer'), '09:00:00', 8.0),
  ((SELECT id FROM OfficeMaster WHERE name = 'Dubai'), (SELECT id FROM PositionMaster WHERE name = 'HR Specialist'), '09:00:00', 8.0)`
];

async function runMigration() {
  console.log('Starting database migration...');

  try {
    // Connect to database
    await new Promise((resolve, reject) => {
      db.connect((err) => {
        if (err) {
          console.error('Database connection failed:', err);
          reject(err);
        } else {
          console.log('Connected to MySQL database');
          resolve();
        }
      });
    });

    // Run migrations
    console.log('Creating tables...');
    for (const migration of migrations) {
      await new Promise((resolve, reject) => {
        db.query(migration, (err, result) => {
          if (err) {
            console.error('Migration error:', err);
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    }

    // Seed initial data
    console.log('Seeding initial data...');
    for (const seed of seedData) {
      await new Promise((resolve, reject) => {
        db.query(seed, (err, result) => {
          if (err) {
            console.error('Seed error:', err);
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    }

    // Add relationship data
    console.log('Creating office-position relationships...');
    for (const relationship of relationshipData) {
      await new Promise((resolve, reject) => {
        db.query(relationship, (err, result) => {
          if (err) {
            console.error('Relationship error:', err);
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
    }

    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    db.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };