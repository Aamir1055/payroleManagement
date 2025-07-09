import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Employee } from '../../types';
import { X } from 'lucide-react';
import axios from 'axios';

interface EmployeeFormProps {
  employee?: Employee;
  onSubmit?: (data: Omit<Employee, 'id'>) => void;
  onClose: () => void;
  viewOnly?: boolean;
  refresh?: any;
}

interface FormData {
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

const officePositionConfig: Record<string, Record<string, { reportingTime: string; dutyHours: number }>> = {
  'New York': {
    'Software Engineer': { reportingTime: '09:00', dutyHours: 8 },
    'Product Manager': { reportingTime: '10:00', dutyHours: 7 },
    'Designer': { reportingTime: '09:30', dutyHours: 7 },
    'Data Analyst': { reportingTime: '09:00', dutyHours: 8 },
    'HR Specialist': { reportingTime: '09:00', dutyHours: 8 },
  },
  'Los Angeles': {
    'Software Engineer': { reportingTime: '10:00', dutyHours: 8 },
    'Product Manager': { reportingTime: '10:30', dutyHours: 7 },
    'Designer': { reportingTime: '10:00', dutyHours: 7 },
    'Data Analyst': { reportingTime: '09:30', dutyHours: 8 },
    'HR Specialist': { reportingTime: '09:00', dutyHours: 8 },
  },
  'Chicago': {
    'Software Engineer': { reportingTime: '09:00', dutyHours: 8 },
    'Product Manager': { reportingTime: '09:30', dutyHours: 7 },
    'Designer': { reportingTime: '09:00', dutyHours: 7 },
    'Data Analyst': { reportingTime: '09:15', dutyHours: 8 },
    'HR Specialist': { reportingTime: '09:00', dutyHours: 8 },
  },
  'Houston': {
    'Software Engineer': { reportingTime: '08:30', dutyHours: 8 },
    'Product Manager': { reportingTime: '09:00', dutyHours: 7 },
    'Designer': { reportingTime: '09:00', dutyHours: 7 },
    'Data Analyst': { reportingTime: '09:00', dutyHours: 8 },
    'HR Specialist': { reportingTime: '09:00', dutyHours: 8 },
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onClose,
  viewOnly = false,
  refresh,
}) => {
  const [offices, setOffices] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<FormData>({
    defaultValues: employee ? {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email,
      office: '',
      position: '',
      monthlySalary: employee.monthlySalary,
      dutyHours: employee.dutyHours,
      reportingTime: employee.reportingTime,
      allowedLateDays: employee.allowedLateDays,
      joiningDate: employee.joiningDate ? formatDate(employee.joiningDate) : '',
      status: employee.status
    } : {
      dutyHours: 8,
      reportingTime: '09:00',
      allowedLateDays: 3,
      status: 'active'
    }
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [officesRes, positionsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/masters/offices'),
          axios.get('http://localhost:5000/api/masters/positions'),
        ]);
        setOffices(officesRes.data.map((o: any) => o.name || o));
        setPositions(positionsRes.data.map((p: any) => p.name || p));
      } catch (err) {
        console.error('Failed to fetch offices or positions:', err);
      }
    };
    fetchMasterData();
  }, [refresh]);

  useEffect(() => {
    if (employee && offices.length && positions.length) {
      setValue('office', employee.office);
      setValue('position', employee.position);
    }
  }, [employee, offices, positions, setValue]);

  const selectedOffice = watch('office');
  const selectedPosition = watch('position');

  useEffect(() => {
    if (!viewOnly && selectedOffice && selectedPosition) {
      const config = officePositionConfig[selectedOffice]?.[selectedPosition];
      if (config) {
        setValue('reportingTime', config.reportingTime);
        setValue('dutyHours', config.dutyHours);
      }
    }
  }, [selectedOffice, selectedPosition, setValue, viewOnly]);

  const handleFormSubmit = (data: FormData) => {
    if (!viewOnly && onSubmit) {
      onSubmit(data);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewOnly ? 'Employee Details' : employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[ 
              { label: 'Employee ID', name: 'employeeId', type: 'text', placeholder: 'EMP001' },
              { label: 'Full Name', name: 'fullName', type: 'text', placeholder: 'John Doe' },
              { label: 'Email', name: 'email', type: 'email', placeholder: 'john@company.com' },
              { label: 'Monthly Salary', name: 'monthlySalary', type: 'number', placeholder: '5000' },
              { label: 'Duty Hours', name: 'dutyHours', type: 'number', placeholder: '8' },
              { label: 'Reporting Time', name: 'reportingTime', type: 'time', placeholder: '' },
              { label: 'Allowed Late Days', name: 'allowedLateDays', type: 'number', placeholder: '3' }
            ].map((field, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                <input
                  type={field.type}
                  {...register(field.name as keyof FormData, {
                    required: !viewOnly ? `${field.label} is required` : false
                  })}
                  disabled={viewOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder={field.placeholder}
                />
                {errors[field.name as keyof FormData] && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors[field.name as keyof FormData]?.message}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
              <input
                type="date"
                max="2099-12-31"
                {...register('joiningDate', {
                  required: !viewOnly ? 'Joining Date is required' : false,
                  pattern: {
                    value: /^\d{4}-\d{2}-\d{2}$/,
                    message: 'Invalid date format (YYYY-MM-DD)'
                  }
                })}
                onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target.value.length > 10) {
                    e.target.value = e.target.value.slice(0, 10);
                  }
                }}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              {errors.joiningDate && (
                <p className="mt-1 text-sm text-red-600">{errors.joiningDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Office</label>
              <select
                {...register('office', { required: !viewOnly ? 'Office is required' : false })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Office</option>
                {offices.map((office) => (
                  <option key={office} value={office}>{office}</option>
                ))}
              </select>
              {errors.office && <p className="mt-1 text-sm text-red-600">{errors.office.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <select
                {...register('position', { required: !viewOnly ? 'Position is required' : false })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Position</option>
                {positions.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
              {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                {...register('status', { required: !viewOnly ? 'Status is required' : false })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
            </div>
          </div>

          {!viewOnly && (
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {employee ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
