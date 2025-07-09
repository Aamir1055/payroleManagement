import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MainLayout } from '../components/Layout/MainLayout';
import { EmployeeTable } from '../components/Employees/EmployeeTable';
import { EmployeeForm } from '../components/Employees/EmployeeForm';
import { useEmployees } from '../hooks/useEmployees';
import { Employee } from '../types';
import { Plus, Filter, Download, Users, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const Employees: React.FC = () => {
  const {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees,
  } = useEmployees();

  const [showForm, setShowForm] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // --- MASTER DATA for Offices and Positions (fetched from API) ---
  const [masterOffices, setMasterOffices] = useState<string[]>([]);
  const [masterPositions, setMasterPositions] = useState<string[]>([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [officesRes, positionsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/masters/offices'),
          axios.get('http://localhost:5000/api/masters/positions'),
        ]);
        setMasterOffices(officesRes.data.map((o: any) => o.name || o));
        setMasterPositions(positionsRes.data.map((p: any) => p.name || p));
      } catch (error) {
        console.error('Failed to fetch master data', error);
      }
    };
    fetchMasterData();
  }, []);

  // fallback to existing employee data if master data not loaded yet
  const fallbackOffices = [...new Set(employees.map((emp) => emp.office))];
  const fallbackPositions = [...new Set(employees.map((emp) => emp.position))];

  const officesToUse = masterOffices.length > 0 ? masterOffices : fallbackOffices;
  const positionsToUse = masterPositions.length > 0 ? masterPositions : fallbackPositions;

  // FILTER employees based on search and selected filters
  const filteredEmployees = employees.filter((employee) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (employee.fullName?.toLowerCase().includes(search) || false) ||
      (employee.employeeId?.toLowerCase().includes(search) || false) ||
      (employee.position?.toLowerCase().includes(search) || false);

    const matchesOffice = selectedOffice === '' || employee.office === selectedOffice;
    const matchesPosition = selectedPosition === '' || employee.position === selectedPosition;

    return matchesSearch && matchesOffice && matchesPosition;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Export employees to Excel
  const handleExportToExcel = () => {
    if (filteredEmployees.length === 0) {
      alert('No employee data to export.');
      return;
    }

    const exportData = filteredEmployees.map((emp) => ({
      'Employee ID': emp.employeeId,
      'Full Name': emp.fullName,
      'Email': emp.email,
      'Office': emp.office,
      'Position': emp.position,
      'Monthly Salary (AED)': Number(emp.monthlySalary).toFixed(2),
      'Duty Hours': emp.dutyHours,
      'Reporting Time': emp.reportingTime,
      'Allowed Late Days': emp.allowedLateDays,
      'Joining Date': emp.joiningDate,
      'Status': emp.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `employees_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Sample Excel download
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Employee ID': 'EMP001',
        'Full Name': 'John Doe',
        'Email': 'john@example.com',
        'Office': 'Los Angeles',
        'Position': 'Software Engineer',
        'Monthly Salary (AED)': 5000,
        'Duty Hours': 9,
        'Reporting Time': '09:00',
        'Allowed Late Days': 3,
        'Joining Date': '2023-01-01',
        'Status': 'active',
      },
      {
        'Employee ID': 'EMP002',
        'Full Name': 'Jane Smith',
        'Email': 'jane@example.com',
        'Office': 'New York',
        'Position': 'Data Analyst',
        'Monthly Salary (AED)': 4500,
        'Duty Hours': 8,
        'Reporting Time': '09:30',
        'Allowed Late Days': 2,
        'Joining Date': '2023-02-15',
        'Status': 'inactive',
      },
      {
        'Employee ID': 'EMP003',
        'Full Name': 'Ali Khan',
        'Email': 'ali@example.com',
        'Office': 'New York',
        'Position': 'Data Analyst',
        'Monthly Salary (AED)': 6000,
        'Duty Hours': 10,
        'Reporting Time': '08:45',
        'Allowed Late Days': 5,
        'Joining Date': '2022-12-20',
        'Status': 'active',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SampleEmployees');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'sample_employee_import.xlsx');
  };

  // Handlers for employee form & CRUD
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setViewOnly(false);
    setShowForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setViewOnly(false);
    setShowForm(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setViewOnly(true);
    setShowForm(true);
  };

  const handleSubmitEmployee = (data: Omit<Employee, 'id'>) => {
    if (editingEmployee) {
      updateEmployee(editingEmployee.employeeId, data);
    } else {
      addEmployee(data);
    }
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteEmployee(id);
    }
  };

  // Excel import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/employees/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to import employees');
      }

      alert('Employees imported successfully');
      refreshEmployees();
    } catch (err) {
      alert(`Import error: ${(err as Error).message}`);
    }

    e.target.value = '';
  };

  if (loading) {
    return (
      <MainLayout title="Manage Employees" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Employee Management" subtitle="Manage your organization's employees">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            {/* search */}
            <input
              type="text"
              placeholder="Search by name, ID, or position..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />

            <div className="relative">
              <select
                value={selectedOffice}
                onChange={(e) => {
                  setSelectedOffice(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="">All Offices</option>
                {officesToUse.map((office, idx) => (
                  <option key={idx} value={office}>
                    {office}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedPosition}
                onChange={(e) => {
                  setSelectedPosition(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="">All Positions</option>
                {positionsToUse.map((position, idx) => (
                  <option key={idx} value={position}>
                    {position}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* button group */}
          <div className="flex items-center space-x-3">
            <label
              htmlFor="importExcel"
              className="cursor-pointer flex items-center px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </label>
            <input
              id="importExcel"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={handleDownloadSampleExcel}
              className="flex items-center px-4 py-2 text-blue-700 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Sample Excel
            </button>

            <button
              onClick={handleExportToExcel}
              className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>

            <button
              onClick={handleAddEmployee}
              className="flex items-center px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Employee
            </button>
          </div>
        </div>

        {/* records per page */}
        <div className="flex justify-end">
          <label htmlFor="itemsPerPage" className="mr-2 text-gray-700 font-medium">
            Records per page:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="border border-gray-300 rounded px-2 py-1"
          >
            {[10, 20, 50, 100, 200, 500].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>

        {/* table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Total Employees: {filteredEmployees.length}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Showing {paginatedEmployees.length} of {filteredEmployees.length}
            </div>
          </div>
        </div>

        {filteredEmployees.length > 0 ? (
          <>
            <EmployeeTable
              employees={paginatedEmployees}
              onEdit={handleEditEmployee}
              onDelete={handleDeleteEmployee}
              onView={handleViewEmployee}
            />
            <div className="flex justify-between items-center px-4 py-4 border-t border-gray-200 bg-white rounded-b-lg">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedOffice || selectedPosition
                ? 'No employees match your current filters.'
                : 'Get started by adding a new employee.'}
            </p>
            {!searchTerm && !selectedOffice && !selectedPosition && (
              <button
                onClick={handleAddEmployee}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add Your First Employee
              </button>
            )}
          </div>
        )}

        {showForm && (
          <EmployeeForm
            employee={editingEmployee || undefined}
            viewOnly={viewOnly}
            onSubmit={handleSubmitEmployee}
            onClose={() => {
              setShowForm(false);
              setEditingEmployee(null);
            }}
            offices={officesToUse}
            positions={positionsToUse}
          />
        )}
      </div>
    </MainLayout>
  );
};
