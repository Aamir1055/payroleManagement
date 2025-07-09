import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Calendar, DollarSign, Users, Calculator, Download, Filter, Clock, CheckCircle } from 'lucide-react';

interface PayrollEmployee {
  id: number;
  employeeId: string;
  name: string;
  office: string;
  position: string;
  monthlySalary: number;
  presentDays: number;
  workingDays: number;
  deductions: number;
  netSalary: number;
  status: 'calculated' | 'paid' | 'pending';
}

export const Payroll: React.FC = () => {
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [selectedOffice, setSelectedOffice] = useState('');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth, selectedOffice]);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      let url = `http://localhost:5000/api/payroll/report?month=${month}&year=${year}`;
      
      if (selectedOffice) {
        url += `&office=${encodeURIComponent(selectedOffice)}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching payroll data:', error);
      alert('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  const calculatePayroll = async () => {
    if (!confirm('This will recalculate payroll for all employees. Continue?')) return;

    try {
      setCalculating(true);
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch('http://localhost:5000/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: parseInt(month), year: parseInt(year) })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to calculate payroll');
      }

      alert('Payroll calculated successfully!');
      fetchPayrollData();
    } catch (error) {
      console.error('Error calculating payroll:', error);
      alert(error instanceof Error ? error.message : 'Failed to calculate payroll');
    } finally {
      setCalculating(false);
    }
  };

  const markAsPaid = async (employeeId: string) => {
    if (!confirm('Mark this employee as paid?')) return;

    try {
      const [year, month] = selectedMonth.split('-');
      
      const response = await fetch(`http://localhost:5000/api/payroll/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId, 
          month: parseInt(month), 
          year: parseInt(year) 
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark as paid');
      }

      alert('Employee marked as paid!');
      fetchPayrollData();
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert(error instanceof Error ? error.message : 'Failed to mark as paid');
    }
  };

  const exportPayroll = () => {
    if (employees.length === 0) {
      alert('No payroll data to export');
      return;
    }

    const headers = [
      'Employee ID', 'Name', 'Office', 'Position', 
      'Monthly Salary', 'Present Days', 'Working Days',
      'Deductions', 'Net Salary', 'Status'
    ];

    const rows = employees.map(emp => [
      emp.employeeId,
      emp.name,
      emp.office,
      emp.position,
      emp.monthlySalary.toFixed(2),
      emp.presentDays,
      emp.workingDays,
      emp.deductions.toFixed(2),
      emp.netSalary.toFixed(2),
      emp.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: PayrollEmployee['status']) => {
    const styles = {
      calculated: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800', 
      pending: 'bg-yellow-100 text-yellow-800'
    };

    const icons = {
      calculated: <Calculator className="w-3 h-3 mr-1" />,
      paid: <CheckCircle className="w-3 h-3 mr-1" />,
      pending: <Clock className="w-3 h-3 mr-1" />
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalPayroll = employees.reduce((sum, emp) => sum + emp.netSalary, 0);
  const totalDeductions = employees.reduce((sum, emp) => sum + emp.deductions, 0);
  const paidEmployees = employees.filter(emp => emp.status === 'paid').length;

  return (
    <MainLayout 
      title="Payroll Management" 
      subtitle="Calculate and manage employee payroll"
    >
      <div className="space-y-6">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                <p className="text-2xl font-bold text-gray-900">
                  AED {totalPayroll.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold text-gray-900">
                  AED {totalDeductions.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <Calculator className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Employees</p>
                <p className="text-2xl font-bold text-gray-900">{paidEmployees}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month & Year</label>
                <div className="relative">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Office</label>
                <div className="relative">
                  <select
                    value={selectedOffice}
                    onChange={(e) => setSelectedOffice(e.target.value)}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none min-w-[150px]"
                  >
                    <option value="">All Offices</option>
                    <option value="New York">New York</option>
                    <option value="Los Angeles">Los Angeles</option>
                    <option value="Chicago">Chicago</option>
                    <option value="Houston">Houston</option>
                    <option value="Dubai">Dubai</option>
                  </select>
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={calculatePayroll}
                disabled={calculating}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Calculator className="w-4 h-4 mr-2" />
                {calculating ? 'Calculating...' : 'Calculate Payroll'}
              </button>
              
              <button
                onClick={exportPayroll}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Payroll for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading payroll data...</div>
          ) : employees.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No payroll data found for this period.</p>
              <button
                onClick={calculatePayroll}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Calculate Payroll
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Employee", "Office", "Salary", "Present Days", "Net Salary", "Status", "Actions"].map((header, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium">
                            {employee.name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.office}</div>
                        <div className="text-sm text-gray-500">{employee.position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        AED {employee.monthlySalary.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {employee.presentDays} / {employee.workingDays}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        AED {employee.netSalary.toLocaleString('en-AE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(employee.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {employee.status !== 'paid' && (
                          <button
                            onClick={() => markAsPaid(employee.employeeId)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Mark as Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};