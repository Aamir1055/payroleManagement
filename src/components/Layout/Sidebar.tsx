import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  FileText, 
  Calendar,
  LogOut,
  Building2,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Plus,
  User,
  Settings
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Payroll', href: '/payroll', icon: DollarSign },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Holidays', href: '/holidays', icon: Calendar },
  { name: 'Profile', href: '/profile', icon: User }
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOffice?: () => void;
  onAddPosition?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onAddOffice, onAddPosition }) => {
  const [masterDataExpanded, setMasterDataExpanded] = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600 text-white">
            <h1 className="text-xl font-bold">Payroll System</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  }`
                }
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            ))}

            {/* Master Data Section */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setMasterDataExpanded(!masterDataExpanded)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center">
                  <Settings className="w-5 h-5 mr-3" />
                  Master Data
                </div>
                {masterDataExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {masterDataExpanded && (
                <div className="ml-4 mt-2 space-y-1">
                  <button
                    onClick={() => {
                      onAddOffice?.();
                      window.innerWidth < 1024 && onClose();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors duration-200"
                  >
                    <Building2 className="w-4 h-4 mr-3" />
                    <Plus className="w-3 h-3 mr-2" />
                    Add Office
                  </button>
                  <button
                    onClick={() => {
                      onAddPosition?.();
                      window.innerWidth < 1024 && onClose();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors duration-200"
                  >
                    <Briefcase className="w-4 h-4 mr-3" />
                    <Plus className="w-3 h-3 mr-2" />
                    Add Position
                  </button>
                </div>
              )}
            </div>
          </nav>
          
          {/* User section */}
          <div className="px-4 py-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  A
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">Admin</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};