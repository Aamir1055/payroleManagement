import { useState, useEffect } from 'react';
import axios from 'axios';
import { Employee } from '../types';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch employees
  const fetchEmployees = () => {
    setLoading(true);
    axios.get('http://localhost:5000/api/employees')
      .then(res => {
        setEmployees(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch employees:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ✅ Add employee
  const addEmployee = (employee: Employee) => {
    axios.post('http://localhost:5000/api/employees', employee)
      .then(() => {
        fetchEmployees(); // Refresh after adding
      })
      .catch(err => {
        console.error('Failed to add employee:', err);
      });
  };

  // ✅ Update employee
  const updateEmployee = (employeeId: string, updates: Partial<Employee>) => {
    axios.put(`http://localhost:5000/api/employees/${employeeId}`, updates)
      .then(() => {
        fetchEmployees(); // Refresh after updating
      })
      .catch(err => {
        console.error('Failed to update employee:', err);
      });
  };

  // ✅ Delete employee
  const deleteEmployee = (employeeId: string) => {
    axios.delete(`http://localhost:5000/api/employees/${employeeId}`)
      .then(() => {
        fetchEmployees(); // Refresh after deleting
      })
      .catch(err => {
        console.error('Failed to delete employee:', err);
      });
  };

  // ✅ Expose refreshEmployees so you can call it from anywhere
  return {
    employees,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees: fetchEmployees, // <-- this fixes your error
  };
};
