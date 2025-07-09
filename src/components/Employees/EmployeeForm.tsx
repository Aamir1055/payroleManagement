import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Employee } from '../../types';
import { X, RefreshCw } from 'lucide-react';
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

interface OfficePosition {
  office_id: number;
  office_name: string;
  positions: {
    position_id: number;
    position_name: string;
    reporting_time: string;
    duty_hours: number;
  }[];
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

// Validation patterns
const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  name: /^[a-zA-Z\s]+$/,
  positiveNumber: /^\d+(\.\d+)?$/,
  wholeNumber: /^\d+$/
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
  const [officePositions, setOfficePositions] = useState<OfficePosition[]>([]);
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError,
    clearErrors
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
      employeeId: '',
      dutyHours: 8,
      reportingTime: '09:00',
      allowedLateDays: 3,
      status: 'active'
    }
  });

  // Auto-generate employee ID for new employees
  useEffect(() => {
    if (!employee && !viewOnly) {
      generateEmployeeId();
    }
  }, [employee, viewOnly]);

  const generateEmployeeId = async () => {
    setIsGeneratingId(true);
    try {
      const response = await axios.get('http://localhost:5000/api/employees/next-id');
      setValue('employeeId', response.data.nextEmployeeId);
    } catch (error) {
      console.error('Failed to generate employee ID:', error);
      setError('employeeId', { message: 'Failed to generate employee ID. Please enter manually.' });
    }
    setIsGeneratingId(false);
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [officesRes, positionsRes, officePositionsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/masters/offices'),
          axios.get('http://localhost:5000/api/masters/positions'),
          axios.get('http://localhost:5000/api/masters/office-positions')
        ]);
        
        setOffices(officesRes.data.map((o: any) => o.name || o));
        setPositions(positionsRes.data.map((p: any) => p.name || p));
        setOfficePositions(officePositionsRes.data);
      } catch (err) {
        console.error('Failed to fetch master data:', err);
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

  // Update available positions when office changes
  useEffect(() => {
    if (selectedOffice && officePositions.length > 0) {
      const officeData = officePositions.find((op: OfficePosition) => op.office_name === selectedOffice);
      if (officeData) {
        const positionsForOffice = officeData.positions.map((p: any) => p.position_name);
        setAvailablePositions(positionsForOffice);
        
        // Clear position if it's not available in the selected office
        if (selectedPosition && !positionsForOffice.includes(selectedPosition)) {
          setValue('position', '');
        }
      } else {
        // Fallback to all positions if office not found in relationships
        setAvailablePositions(positions);
      }
    } else {
      setAvailablePositions(positions);
    }
  }, [selectedOffice, officePositions, positions, selectedPosition, setValue]);

  // Auto-populate reporting time and duty hours when office and position are selected
  useEffect(() => {
    if (!viewOnly && selectedOffice && selectedPosition && officePositions.length > 0) {
      const officeData = officePositions.find((op: OfficePosition) => op.office_name === selectedOffice);
      if (officeData) {
        const positionData = officeData.positions.find((p: any) => p.position_name === selectedPosition);
        if (positionData) {
          setValue('reportingTime', positionData.reporting_time);
          setValue('dutyHours', positionData.duty_hours);
        }
      }
    }
  }, [selectedOffice, selectedPosition, officePositions, setValue, viewOnly]);

  // Custom validation functions
  const validateName = (value: string) => {
    if (!value) return 'Name is required';
    if (!validationPatterns.name.test(value)) return 'Name can only contain letters and spaces';
    if (value.length < 2) return 'Name must be at least 2 characters';
    return true;
  };

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required';
    if (!validationPatterns.email.test(value)) return 'Please enter a valid email address';
    return true;
  };

  const validateSalary = (value: number) => {
    if (!value) return 'Monthly salary is required';
    if (value <= 0) return 'Salary must be greater than 0';
    if (value > 1000000) return 'Salary seems unreasonably high';
    return true;
  };

  const handleFormSubmit = async (data: FormData) => {
    if (!viewOnly && onSubmit) {
      try {
        // Additional validation
        if (!data.employeeId.trim()) {
          setError('employeeId', { message: 'Employee ID is required' });
          return;
        }

        await onSubmit(data);
        
        // Show success message
        alert('Employee saved successfully!');
        onClose();
      } catch (error) {
        console.error('Error saving employee:', error);
        alert('Failed to save employee. Please try again.');
      }
    }
  };

  // Check if reporting time and duty hours should be readonly (when office-position relationship exists)
  const shouldBeReadonly = (field: 'reportingTime' | 'dutyHours') => {
    if (viewOnly) return true;
    
    if (selectedOffice && selectedPosition && officePositions.length > 0) {
      const officeData = officePositions.find((op: OfficePosition) => op.office_name === selectedOffice);
      if (officeData) {
        const positionData = officeData.positions.find((p: any) => p.position_name === selectedPosition);
        return !!positionData; // readonly if relationship exists
      }
    }
    return false;
  };

  // Get status display text
  const getStatusDisplay = (status: string | number) => {
    if (status === 0 || status === '0' || status === 'inactive') return 'Inactive';
    if (status === 1 || status === '1' || status === 'active') return 'Active';
    return status;
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
            
            {/* Employee ID with auto-generation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
                {!employee && !viewOnly && (
                  <button
                    type="button"
                    onClick={generateEmployeeId}
                    disabled={isGeneratingId}
                    className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                  >
                    <RefreshCw className={`w-3 h-3 inline ${isGeneratingId ? 'animate-spin' : ''}`} />
                    {isGeneratingId ? 'Generating...' : 'Regenerate'}
                  </button>
                )}
              </label>
              <input
                type="text"
                {...register('employeeId', {
                  required: 'Employee ID is required',
                  pattern: {
                    value: /^EMP\d{3}$/,
                    message: 'Employee ID must be in format EMP001'
                  }
                })}
                disabled={viewOnly || !!employee}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="EMP001"
              />
              {errors.employeeId && (
                <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>
              )}
            </div>

            {/* Full Name with validation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                {...register('fullName', { validate: validateName })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="John Doe"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email with validation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                {...register('email', { validate: validateEmail })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="john@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Monthly Salary with validation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Salary (AED)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                {...register('monthlySalary', { 
                  required: 'Monthly salary is required',
                  validate: validateSalary,
                  valueAsNumber: true
                })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="5000"
              />
              {errors.monthlySalary && (
                <p className="mt-1 text-sm text-red-600">{errors.monthlySalary.message}</p>
              )}
            </div>

            {/* Allowed Late Days with validation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Late Days</label>
              <input
                type="number"
                min="0"
                max="10"
                {...register('allowedLateDays', {
                  required: 'Allowed late days is required',
                  min: { value: 0, message: 'Cannot be negative' },
                  max: { value: 10, message: 'Cannot exceed 10 days' },
                  valueAsNumber: true
                })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="3"
              />
              {errors.allowedLateDays && (
                <p className="mt-1 text-sm text-red-600">{errors.allowedLateDays.message}</p>
              )}
            </div>

            {/* Duty Hours - Auto-populated and conditionally readonly */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duty Hours
                {shouldBeReadonly('dutyHours') && (
                  <span className="text-xs text-blue-600 ml-2">(Auto-set based on office & position)</span>
                )}
              </label>
              <input
                type="number"
                min="1"
                max="12"
                {...register('dutyHours', {
                  required: 'Duty hours is required',
                  min: { value: 1, message: 'Minimum 1 hour' },
                  max: { value: 12, message: 'Maximum 12 hours' },
                  valueAsNumber: true
                })}
                disabled={viewOnly || shouldBeReadonly('dutyHours')}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  viewOnly || shouldBeReadonly('dutyHours') ? 'bg-gray-100' : ''
                }`}
                placeholder="8"
              />
              {errors.dutyHours && (
                <p className="mt-1 text-sm text-red-600">{errors.dutyHours.message}</p>
              )}
            </div>

            {/* Reporting Time - Auto-populated and conditionally readonly */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reporting Time
                {shouldBeReadonly('reportingTime') && (
                  <span className="text-xs text-blue-600 ml-2">(Auto-set based on office & position)</span>
                )}
              </label>
              <input
                type="time"
                {...register('reportingTime', {
                  required: 'Reporting time is required'
                })}
                disabled={viewOnly || shouldBeReadonly('reportingTime')}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  viewOnly || shouldBeReadonly('reportingTime') ? 'bg-gray-100' : ''
                }`}
              />
              {errors.reportingTime && (
                <p className="mt-1 text-sm text-red-600">{errors.reportingTime.message}</p>
              )}
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                {...register('joiningDate', {
                  required: 'Joining date is required'
                })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              {errors.joiningDate && (
                <p className="mt-1 text-sm text-red-600">{errors.joiningDate.message}</p>
              )}
            </div>

            {/* Office */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Office</label>
              <select
                {...register('office', { required: 'Office is required' })}
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

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
              <select
                {...register('position', { required: 'Position is required' })}
                disabled={viewOnly}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Position</option>
                {availablePositions.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
              {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>}
              {selectedOffice && availablePositions.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">No positions available for this office. Please add positions for this office first.</p>
              )}
            </div>

            {/* Status with proper display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                {...register('status', { required: 'Status is required' })}
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
