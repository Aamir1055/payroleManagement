import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { MetricCard } from '../components/Dashboard/MetricCard';
import axios from 'axios';
// Removed EmployeeForm import since it won't be used anymore

export const Dashboard: React.FC = () => {
  // Existing state...
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [totalMonthlySalary, setTotalMonthlySalary] = useState<number | null>(null);
  const [officeSummary, setOfficeSummary] = useState<any[]>([]);

  // Master data state
  const [offices, setOffices] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);

  // Modal states for add office/position
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);

  // Input states for new office/position
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newPositionName, setNewPositionName] = useState('');

  // Removed showEmployeeForm and handleEmployeeSubmit since not needed

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
    try {
      await axios.post('http://localhost:5000/api/masters/offices', { name: newOfficeName });
      alert('Office added successfully!');
      setNewOfficeName('');
      setShowOfficeModal(false);
      fetchOffices();
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

  return (
    <MainLayout title="Dashboard" subtitle="Overview of your payroll system">
      <div className="space-y-6">

        {/* Buttons for adding Office and Position ONLY */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowOfficeModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Office
          </button>
          <button
            onClick={() => setShowPositionModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add Position
          </button>
        </div>

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

        {/* Office Modal */}
        {showOfficeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <div className="bg-white rounded p-6 w-80">
              <h2 className="text-xl font-semibold mb-4">Add New Office</h2>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
                placeholder="Office Name"
                value={newOfficeName}
                onChange={(e) => setNewOfficeName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowOfficeModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOffice}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
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

        {/* Removed EmployeeForm modal */}

      </div>
    </MainLayout>
  );
};
