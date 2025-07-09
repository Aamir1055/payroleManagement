import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import axios from 'axios';
import { Trash2 } from 'lucide-react';

interface Holiday {
  id: number;
  holiday_date: string;
  description: string;
}

export const Holidays: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/holidays');
      setHolidays(res.data);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      alert('Failed to fetch holidays');
    }
  };

  const addHoliday = async () => {
    if (!date || !description) return alert('Date and description are required');

    try {
      await axios.post('http://localhost:5000/api/holidays', { 
        holiday_date: date, 
        description 
      });
      setDate('');
      setDescription('');
      fetchHolidays();
    } catch (error) {
      console.error('Error adding holiday:', error);
      alert(error.response?.data?.error || 'Failed to add holiday');
    }
  };

  const deleteHoliday = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/holidays/${id}`);
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      alert(error.response?.data?.error || 'Failed to delete holiday');
    }
  };

  return (
    <MainLayout title="Manage Holidays" subtitle="Add or remove official holidays">
      <div className="space-y-6">
        {/* Add Holiday Form */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Add Holiday</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium text-sm">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border px-3 py-2 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-sm">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border px-3 py-2 rounded-md"
                required
              />
            </div>
          </div>
          <button
            onClick={addHoliday}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Holiday
          </button>
        </div>

        {/* List of Holidays */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Holiday List</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4">Date</th>
                <th className="text-left py-2 px-4">Description</th>
                <th className="text-left py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4">{holiday.holiday_date.split('T')[0]}</td>
                  <td className="py-2 px-4">{holiday.description}</td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => deleteHoliday(holiday.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete holiday"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {holidays.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-gray-500">
                    No holidays added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
};