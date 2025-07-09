import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Download, Filter, Calendar, Users, DollarSign, TrendingDown } from 'lucide-react';

export const Reports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('2025-07');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const totalPayroll = payrollData.reduce((sum, emp) => sum + parseFloat(emp.netSalary), 0);
  const totalDeductions = payrollData.reduce((sum, emp) => sum + parseFloat(emp.deductions), 0);
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

  const convertToCSV = (data: any[]) => {
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
      (parseFloat(emp.deductions) || 0).toFixed(2),
      (parseFloat(emp.netSalary) || 0).toFixed(2),
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
                      {["Employee", "Office", "Present Days", "Half Days", "Late Days", "Leaves", "Deductions", "Net Salary"].map((header, i) => (
                        <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
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
                        <td className="px-6 py-4 text-sm text-gray-900">{emp.lateDays ?? 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{emp.leaves ?? 0}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">AED {(parseFloat(emp.deductions) || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">AED {(parseFloat(emp.netSalary) || 0).toFixed(2)}</td>
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
          )}
        </div>
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
