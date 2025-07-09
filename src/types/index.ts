export interface Employee {
  employeeId: string;
  fullName: string;
  email: string;
  office: string;
  position: string;
  monthlySalary: number;
  dutyHours: number;
  reportingTime: string;
  allowedLateDays: number;
  joiningDate: string;
  status: 'active' | 'inactive';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  punchIn: string;
  punchOut: string;
  hoursWorked: number;
  isLate: boolean;
  isHalfDay: boolean;
  isAbsent: boolean;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  office: string;
  month: string;
  year: number;
  presentDays: number;
  halfDays: number;
  lateDays: number;
  leaves: number;
  excessLeaves: number;
  deductionDays: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
}

export interface Office {
  id: string;
  name: string;
  location: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalPayroll: number;
  averageSalary: number;
  totalDeductions: number;
  presentEmployees: number;
  absentEmployees: number;
}