import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Download, Filter, Calendar, Users, DollarSign, TrendingDown, X, Eye, AlertTriangle } from 'lucide-react';

interface EmployeeDetail {
  name: string;
  employeeId: string;
  office: string;
  position: string;
  monthlySalary: number;
  presentDays: number;
  halfDays: number;
  lateDays: number;
  leaves: number;
  deductions: number;
  netSalary: number;
  workingDays: number;
  overtimeHours?: number;
  allowances?: number;
  reportingTime?: string;
  dutyHours?: number;
}

export const Reports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('2025-01');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [payrollData, setPayrollData] = useState<EmployeeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        setLoading(true);
        const [year, month] = selectedMonth.split('-');
        const response = await fetch(`http://localhost:5000/api/payroll/report?month=${parseInt(month)}&year=${year}`);
        const data = await response.json();

        const filteredData = selectedOffice
          ? data.filter((emp: any) => emp.office === selectedOffice)
          : data;

        setPayrollData(filteredData);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error fetching payroll data:', error);
        setPayrollData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollData();
  }, [selectedMonth, selectedOffice]);

  const totalPayroll = payrollData.reduce((sum, emp) => sum + parseFloat(emp.netSalary.toString()), 0);
  const totalDeductions = payrollData.reduce((sum, emp) => sum + parseFloat(emp.deductions.toString()), 0);
  const averageAttendance = payrollData.reduce((sum, emp) => sum + emp.presentDays, 0) / (payrollData.length || 1);

  const totalPages = Math.ceil(payrollData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, payrollData.length);
  const paginatedData = payrollData.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleEmployeeClick = (employee: EmployeeDetail) => {
    setSelectedEmployee(employee);
    setShowEmployeeDetail(true);
  };

  const convertToCSV = (data: EmployeeDetail[]) => {
    if (data.length === 0) return '';

    const headers = [
      'Employee', 'Employee ID', 'Office', 'Position',
      'Present Days', 'Half Days', 'Late Days',
      'Leaves', 'Deductions', 'Net Salary',
    ];

    const rows = data.map(emp => [
      emp.name, emp.employeeId, emp.office, emp.position,
      emp.presentDays ?? 0, emp.halfDays ?? 0, emp.lateDays ?? 0,
      emp.leaves ?? 0,
      (parseFloat(emp.deductions.toString()) || 0).toFixed(2),
      (parseFloat(emp.netSalary.toString()) || 0).toFixed(2),
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  };

  const exportReport = () => {
    if (payrollData.length === 0) {
      alert('No payroll data to export.');
      return;
    }

    const csv = convertToCSV(payrollData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout 
      title="Payroll Reports" 
      subtitle="Generate and view comprehensive payroll reports"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month & Year</label>
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Office</label>
              <div className="relative">
                <select
                  value={selectedOffice}
                  onChange={(e) => setSelectedOffice(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
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

            <div className="flex items-end">
              <button
                onClick={exportReport}
                className="w-full flex items-center justify-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SummaryCard
            label="Total Payroll"
            value={`AED ${totalPayroll.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-6 h-6 text-green-600" />}
            bg="bg-green-50"
          />
          <SummaryCard
            label="Total Deductions"
            value={`AED ${totalDeductions.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`}
            icon={<TrendingDown className="w-6 h-6 text-red-600" />}
            bg="bg-red-50"
          />
          <SummaryCard
            label="Avg. Attendance"
            value={`${averageAttendance.toFixed(1)} days`}
            icon={<Users className="w-6 h-6 text-blue-600" />}
            bg="bg-blue-50"
          />
          <SummaryCard
            label="Employees"
            value={`${payrollData.length}`}
            icon={<Users className="w-6 h-6 text-purple-600" />}
            bg="bg-purple-50"
          />
        </div>

        {/* Payroll Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Payroll Report</h3>

            {/* Records per page dropdown */}
            <div className="flex items-center">
              <label className="text-sm mr-2 text-gray-600">Records per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
              >
                {[10, 20, 50, 100, 200, 500].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-6 text-gray-500">Loading payroll data...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Employee", "Office", "Present Days", "Half Days", "Late Days", "Leaves", "Deductions", "Net Salary", "Actions"].map((header, i) => (
                        <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.map((emp, idx) => (
                      <tr 
                        key={idx} 
                        className={`hover:bg-gray-50 cursor-pointer ${
                          (emp.lateDays || 0) > 3 ? 'bg-red-50 hover:bg-red-100' : ''
                        }`}
                        onClick={() => handleEmployeeClick(emp)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium">
                              {emp.name.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                              <div className="text-sm text-gray-500">{emp.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>{emp.office}</div>
                          <div className="text-gray-500">{emp.position}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{emp.presentDays}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{emp.halfDays ?? 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center">
                            {emp.lateDays ?? 0}
                            {(emp.lateDays || 0) > 3 && (
                              <AlertTriangle className="w-4 h-4 text-red-500 ml-2" title="Excessive late days" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{emp.leaves ?? 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">AED {(parseFloat(emp.deductions.toString()) || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">AED {(parseFloat(emp.netSalary.toString()) || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmployeeClick(emp);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Previous
                </button>

                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages} | Showing {startIndex + 1}-{endIndex} of {payrollData.length} employees
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
          )}
        </div>

        {/* Employee Detail Modal */}
        {showEmployeeDetail && selectedEmployee && (
          <EmployeeDetailModal
            employee={selectedEmployee}
            month={selectedMonth}
            onClose={() => {
              setShowEmployeeDetail(false);
              setSelectedEmployee(null);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

const SummaryCard = ({ label, value, icon, bg }: { label: string, value: string, icon: JSX.Element, bg: string }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`p-3 ${bg} rounded-full`}>
        {icon}
      </div>
    </div>
  </div>
);

const EmployeeDetailModal = ({ 
  employee, 
  month, 
  onClose 
}: { 
  employee: EmployeeDetail; 
  month: string; 
  onClose: () => void; 
}) => {
  const [year, monthNum] = month.split('-');
  const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const workingDaysInMonth = employee.workingDays || 22; // Default to 22 if not provided
  const dailySalary = employee.monthlySalary / workingDaysInMonth;
  const earnedSalary = dailySalary * employee.presentDays;
  const halfDayDeduction = (employee.halfDays || 0) * (dailySalary / 2);
  const grossSalary = earnedSalary - halfDayDeduction;
  const allowances = employee.allowances || 0;
  const overtime = (employee.overtimeHours || 0) * (dailySalary / 8); // Assuming 8 hours per day
  const totalEarnings = grossSalary + allowances + overtime;
  const finalNetSalary = totalEarnings - employee.deductions;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Salary Breakdown</h2>
            <p className="text-gray-600">{employee.name} - {monthName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Employee Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">ID:</span> {employee.employeeId}</p>
                <p><span className="font-medium">Office:</span> {employee.office}</p>
                <p><span className="font-medium">Position:</span> {employee.position}</p>
                <p><span className="font-medium">Monthly Salary:</span> AED {employee.monthlySalary.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Attendance Summary</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Working Days:</span> {workingDaysInMonth}</p>
                <p><span className="font-medium">Present Days:</span> {employee.presentDays}</p>
                <p><span className="font-medium">Half Days:</span> {employee.halfDays || 0}</p>
                <p className={`${(employee.lateDays || 0) > 3 ? 'text-red-600 font-semibold' : ''}`}>
                  <span className="font-medium">Late Days:</span> {employee.lateDays || 0}
                  {(employee.lateDays || 0) > 3 && ' ⚠️ Excessive'}
                </p>
                <p><span className="font-medium">Leaves:</span> {employee.leaves || 0}</p>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">Calculations</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Daily Rate:</span> AED {dailySalary.toFixed(2)}</p>
                <p><span className="font-medium">Attendance %:</span> {((employee.presentDays / workingDaysInMonth) * 100).toFixed(1)}%</p>
                <p><span className="font-medium">Overtime Hours:</span> {employee.overtimeHours || 0}</p>
                <p><span className="font-medium">Allowances:</span> AED {allowances.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Salary Breakdown</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Earnings */}
              <div>
                <h4 className="font-medium text-green-700 mb-3">Earnings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Basic Salary ({employee.presentDays} days)</span>
                    <span className="font-medium">AED {earnedSalary.toFixed(2)}</span>
                  </div>
                  {halfDayDeduction > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Half Day Deduction ({employee.halfDays} days)</span>
                      <span className="font-medium">-AED {halfDayDeduction.toFixed(2)}</span>
                    </div>
                  )}
                  {allowances > 0 && (
                    <div className="flex justify-between">
                      <span>Allowances</span>
                      <span className="font-medium">AED {allowances.toFixed(2)}</span>
                    </div>
                  )}
                  {overtime > 0 && (
                    <div className="flex justify-between">
                      <span>Overtime ({employee.overtimeHours} hours)</span>
                      <span className="font-medium">AED {overtime.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold text-green-700">
                    <span>Total Earnings</span>
                    <span>AED {totalEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="font-medium text-red-700 mb-3">Deductions</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Deductions</span>
                    <span className="font-medium">AED {employee.deductions.toFixed(2)}</span>
                  </div>
                  {(employee.lateDays || 0) > 3 && (
                    <div className="text-red-600 text-sm">
                      ⚠️ Excessive late days may affect future salary
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="mt-6 pt-4 border-t border-gray-300">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Net Salary</span>
                <span className="text-blue-600">AED {finalNetSalary.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Late Days Warning */}
          {(employee.lateDays || 0) > 3 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                <h4 className="font-semibold text-red-800">Attendance Alert</h4>
              </div>
              <p className="text-red-700 mt-1">
                This employee has {employee.lateDays} late days this month, which exceeds the acceptable limit of 3 days. 
                Please consider discussing attendance improvement with the employee.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
