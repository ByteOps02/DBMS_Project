import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { LogOut, Menu, User, Users, Home, ClipboardList } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">

            {/* Logo & Home Link */}
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="p-2 mr-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-md"
                aria-label="Go back"
                title="Go back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <Link to="/dashboard" className="flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white">
                <Home className="h-6 w-6" aria-hidden="true" />
                <span className="ml-2 font-medium">Campus VMS</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="sm:hidden p-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle navigation menu"
              title="Toggle navigation menu"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex sm:items-center sm:space-x-8">
              {user?.role === 'admin' && (
                <>
                  <Link to="/dashboard/users" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    <Users className="h-5 w-5 mr-1" aria-hidden="true" />
                    Users
                  </Link>
                  <Link to="/dashboard/logs" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    <ClipboardList className="h-5 w-5 mr-1" aria-hidden="true" />
                    Logs
                  </Link>
                  <Link to="/dashboard/pre-register-visitor" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    <User className="h-5 w-5 mr-1" aria-hidden="true" />
                    Pre-register Visitor
                  </Link>
                  <Link to="/dashboard/bulk-visitor-upload" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    <Users className="h-5 w-5 mr-1" aria-hidden="true" />
                    Bulk Upload
                  </Link>
                </>
              )}

              {user?.role === 'host' && (
                <>
                  <Link to="/dashboard/pre-register-visitor" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    <User className="h-5 w-5 mr-1" aria-hidden="true" />
                    Pre-register Visitor
                  </Link>
                  <Link to="/dashboard/bulk-visitor-upload" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    <Users className="h-5 w-5 mr-1" aria-hidden="true" />
                    Bulk Upload
                  </Link>
                </>
              )}

              {user?.role === 'guard' && (
                <>
                  <Link to="/dashboard/register-visitor" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    <User className="h-5 w-5 mr-1" aria-hidden="true" />
                    Register Visitor
                  </Link>
                  <Link to="/dashboard/bulk-visitor-upload" className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    <Users className="h-5 w-5 mr-1" aria-hidden="true" />
                    Bulk Upload
                  </Link>
                </>
              )}
            </div>

            {/* Logout Button */}
            {user && (
              <div className="hidden sm:flex items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 mr-4">
                  {user.name} ({user.role})
                </span>
                <ThemeSwitcher />
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 ml-4"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5 mr-1" aria-hidden="true" />
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="sm:hidden bg-white dark:bg-gray-800 shadow-md rounded-md p-4 mt-2">
              {user?.role === 'admin' && (
                <>
                  <Link to="/dashboard/users" className="block px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    Users
                  </Link>
                  <Link to="/dashboard/logs" className="block px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                    Logs
                  </Link>
                </>
              )}
              {user?.role === 'guard' && (
                <Link to="/dashboard/register-visitor" className="block px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200">
                  Register Visitor
                </Link>
              )}
              {user && (
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  aria-label="Logout"
                  title="Logout"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
