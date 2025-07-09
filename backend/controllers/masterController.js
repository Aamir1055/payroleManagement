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
