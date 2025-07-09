import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { MetricCard } from '../components/Dashboard/MetricCard';
import axios from 'axios';

export const Dashboard: React.FC = () => {
  // Existing state...
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [totalMonthlySalary, setTotalMonthlySalary] = useState<number | null>(null);
  const [officeSummary, setOfficeSummary] = useState<any[]>([]);

  // Master data state
  const [offices, setOffices] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);

  // Enhanced modal states for office with positions
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);

  // Enhanced input states for new office with positions
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newPositionName, setNewPositionName] = useState('');
  const [officePositions, setOfficePositions] = useState<{
    positionName: string;
    reportingTime: string;
    dutyHours: number;
  }[]>([]);

  // Fetch functions for master data
  const fetchOffices = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/masters/offices');
      const officeNames = response.data.map((office: any) => (typeof office === 'string' ? office : office.name));
      setOffices(officeNames);
    } catch (error) {
      console.error('Failed to fetch offices:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/masters/positions');
      const positionNames = response.data.map((pos: any) => (typeof pos === 'string' ? pos : pos.name));
      setPositions(positionNames);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  };

  useEffect(() => {
    const fetchTotalEmployees = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/employees/count');
        setTotalEmployees(response.data.total);
      } catch (error) {
        console.error('Error fetching total employees:', error);
      }
    };

    const fetchTotalMonthlySalary = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/employees/salary/total');
        setTotalMonthlySalary(response.data.totalSalary);
      } catch (error) {
        console.error('Error fetching total salary:', error);
      }
    };

    const fetchOfficeSummary = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/employees/summary-by-office');
        setOfficeSummary(response.data);
      } catch (error) {
        console.error('Error fetching office summary:', error);
      }
    };

    fetchTotalEmployees();
    fetchTotalMonthlySalary();
    fetchOfficeSummary();

    fetchOffices();
    fetchPositions();
  }, []);

  const handleAddOffice = async () => {
    if (!newOfficeName.trim()) return alert('Please enter an office name');
    if (officePositions.length === 0) return alert('Please add at least one position for this office');
    
    try {
      // Create office with positions
      const response = await axios.post('http://localhost:5000/api/masters/offices-with-positions', {
        officeName: newOfficeName,
        positions: officePositions
      });
      
      alert('Office and positions added successfully!');
      setNewOfficeName('');
      setOfficePositions([]);
      setShowOfficeModal(false);
      fetchOffices();
      fetchPositions();
      
      // Refresh office summary to show new office
      const officeSummaryResponse = await axios.get('http://localhost:5000/api/employees/summary-by-office');
      setOfficeSummary(officeSummaryResponse.data);
    } catch (error) {
      console.error(error);
      alert('Failed to add office');
    }
  };

  const handleAddPosition = async () => {
    if (!newPositionName.trim()) return alert('Please enter a position name');
    try {
      await axios.post('http://localhost:5000/api/masters/positions', { name: newPositionName });
      alert('Position added successfully!');
      setNewPositionName('');
      setShowPositionModal(false);
      fetchPositions();
    } catch (error) {
      console.error(error);
      alert('Failed to add position');
    }
  };

  const addPositionToOffice = () => {
    setOfficePositions([...officePositions, {
      positionName: '',
      reportingTime: '09:00',
      dutyHours: 8
    }]);
  };

  const removePositionFromOffice = (index: number) => {
    setOfficePositions(officePositions.filter((_, i) => i !== index));
  };

  const updateOfficePosition = (index: number, field: string, value: string | number) => {
    const updated = [...officePositions];
    updated[index] = { ...updated[index], [field]: value };
    setOfficePositions(updated);
  };

  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Overview of your payroll system"
      onAddOffice={() => setShowOfficeModal(true)}
      onAddPosition={() => setShowPositionModal(true)}
    >
      <div className="space-y-6">
        {/* Existing Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Employees"
            value={totalEmployees !== null ? totalEmployees.toString() : '...'}
            color="blue"
          />
          <MetricCard
            title="Monthly Payroll"
            value={
              totalMonthlySalary !== null
                ? `AED ${totalMonthlySalary.toLocaleString()}`
                : '...'
            }
            color="green"
          />
        </div>

        {/* Office-wise Cards */}
        {officeSummary.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {officeSummary.map((office, index) => (
              <MetricCard
                key={index}
                title={`${office.office} Office`}
                value={
                  <>
                    <div className="text-sm font-semibold">Employees: {office.totalEmployees}</div>
                    <div className="text-sm font-semibold">AED {office.totalSalary.toLocaleString()}</div>
                  </>
                }
                color="purple"
              />
            ))}
          </div>
        )}

        {/* Enhanced Office Modal with Positions */}
        {showOfficeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <div className="bg-white rounded p-6 w-4/5 max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Add New Office with Positions</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Office Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Office Name (e.g., Dubai Office)"
                  value={newOfficeName}
                  onChange={(e) => setNewOfficeName(e.target.value)}
                />
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Positions in this Office</h3>
                  <button
                    onClick={addPositionToOffice}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Add Position
                  </button>
                </div>
                
                {officePositions.map((position, index) => (
                  <div key={index} className="border rounded p-4 mb-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position Name</label>
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          placeholder="e.g., Data Analyst"
                          value={position.positionName}
                          onChange={(e) => updateOfficePosition(index, 'positionName', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reporting Time</label>
                        <input
                          type="time"
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          value={position.reportingTime}
                          onChange={(e) => updateOfficePosition(index, 'reportingTime', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duty Hours</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          value={position.dutyHours}
                          onChange={(e) => updateOfficePosition(index, 'dutyHours', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => removePositionFromOffice(index)}
                          className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {officePositions.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No positions added yet. Click "Add Position" to get started.</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowOfficeModal(false);
                    setNewOfficeName('');
                    setOfficePositions([]);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOffice}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Office & Positions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Position Modal */}
        {showPositionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <div className="bg-white rounded p-6 w-80">
              <h2 className="text-xl font-semibold mb-4">Add New Position</h2>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                placeholder="Position Name"
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowPositionModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPosition}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
