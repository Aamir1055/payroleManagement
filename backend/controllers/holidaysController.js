const db = require('../db');

// GET all holidays
exports.getHolidays = (req, res) => {
  db.query('SELECT id, holiday_date, description FROM holidays ORDER BY holiday_date ASC', (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.json(results);
  });
};

// ADD a holiday
exports.addHoliday = (req, res) => {
  const { holiday_date, description } = req.body;

  if (!holiday_date || !description) {
    return res.status(400).json({ error: 'holiday_date and description are required' });
  }

  const query = 'INSERT INTO holidays (holiday_date, description) VALUES (?, ?)';
  db.query(query, [holiday_date, description], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Holiday already exists for this date' });
      }
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    res.status(201).json({ 
      message: 'Holiday added successfully',
      id: result.insertId 
    });
  });
};

// DELETE a holiday
exports.deleteHoliday = (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM holidays WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    res.json({ message: 'Holiday deleted successfully' });
  });
};