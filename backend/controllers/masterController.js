const db = require('../db');

// ------------------ OFFICE CONTROLLERS ------------------

// ✅ Get all offices
exports.getAllOffices = (req, res) => {
  db.query('SELECT * FROM OfficeMaster', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
};

// ✅ Create a new office
exports.createOffice = (req, res) => {
  const { name } = req.body;
  db.query('INSERT INTO OfficeMaster (name) VALUES (?)', [name], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId, name });
  });
};

// ✅ Create office with positions and their schedules
exports.createOfficeWithPositions = (req, res) => {
  const { officeName, positions } = req.body;
  
  if (!officeName || !positions || positions.length === 0) {
    return res.status(400).json({ error: 'Office name and positions are required' });
  }

  // Start transaction
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    // First, create the office
    db.query('INSERT INTO OfficeMaster (name) VALUES (?)', [officeName], (err, officeResult) => {
      if (err) {
        return db.rollback(() => {
          res.status(500).json({ error: err.message });
        });
      }

      const officeId = officeResult.insertId;
      let positionsProcessed = 0;
      let errors = [];

      // For each position, create it if it doesn't exist and create office-position relationship
      positions.forEach((position, index) => {
        const { positionName, reportingTime, dutyHours } = position;
        
        if (!positionName || !reportingTime || !dutyHours) {
          errors.push(`Position at index ${index} is missing required fields`);
          positionsProcessed++;
          checkCompletion();
          return;
        }

        // Check if position exists, if not create it
        db.query('SELECT id FROM PositionMaster WHERE name = ?', [positionName], (err, posResult) => {
          if (err) {
            errors.push(`Error checking position ${positionName}: ${err.message}`);
            positionsProcessed++;
            checkCompletion();
            return;
          }

          let positionId;
          
          if (posResult.length > 0) {
            // Position exists
            positionId = posResult[0].id;
            createOfficePositionRelation();
          } else {
            // Create new position
            db.query('INSERT INTO PositionMaster (name) VALUES (?)', [positionName], (err, newPosResult) => {
              if (err) {
                errors.push(`Error creating position ${positionName}: ${err.message}`);
                positionsProcessed++;
                checkCompletion();
                return;
              }
              positionId = newPosResult.insertId;
              createOfficePositionRelation();
            });
          }

          function createOfficePositionRelation() {
            // Create office-position relationship with schedule
            const insertQuery = `
              INSERT INTO OfficePositions (office_id, position_id, reporting_time, duty_hours)
              VALUES (?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE 
              reporting_time = VALUES(reporting_time),
              duty_hours = VALUES(duty_hours)
            `;
            
            db.query(insertQuery, [officeId, positionId, reportingTime, dutyHours], (err) => {
              if (err) {
                errors.push(`Error creating office-position relation for ${positionName}: ${err.message}`);
              }
              positionsProcessed++;
              checkCompletion();
            });
          }
        });
      });

      function checkCompletion() {
        if (positionsProcessed === positions.length) {
          if (errors.length > 0) {
            return db.rollback(() => {
              res.status(500).json({ error: 'Some positions failed to create', details: errors });
            });
          }
          
          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ error: err.message });
              });
            }
            res.status(201).json({ 
              message: 'Office and positions created successfully',
              officeId,
              officeName,
              positionsCount: positions.length
            });
          });
        }
      }
    });
  });
};

// ✅ Get office positions with schedules
exports.getOfficePositions = (req, res) => {
  const query = `
    SELECT 
      om.id as office_id,
      om.name as office_name,
      pm.id as position_id,
      pm.name as position_name,
      op.reporting_time,
      op.duty_hours
    FROM OfficeMaster om
    LEFT JOIN OfficePositions op ON om.id = op.office_id
    LEFT JOIN PositionMaster pm ON op.position_id = pm.id
    ORDER BY om.name, pm.name
  `;
  
  db.query(query, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Group by office
    const groupedData = {};
    result.forEach(row => {
      if (!groupedData[row.office_name]) {
        groupedData[row.office_name] = {
          office_id: row.office_id,
          office_name: row.office_name,
          positions: []
        };
      }
      
      if (row.position_name) {
        groupedData[row.office_name].positions.push({
          position_id: row.position_id,
          position_name: row.position_name,
          reporting_time: row.reporting_time,
          duty_hours: row.duty_hours
        });
      }
    });
    
    res.json(Object.values(groupedData));
  });
};

// ------------------ POSITION CONTROLLERS ------------------

// ✅ Get all positions
exports.getAllPositions = (req, res) => {
  db.query('SELECT * FROM PositionMaster', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
};

// ✅ Create a new position
exports.createPosition = (req, res) => {
  const { name } = req.body;
  db.query('INSERT INTO PositionMaster (name) VALUES (?)', [name], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId, name });
  });
};
