import React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  QrCode,
  Award,
  Menu,
  X,
  User,
  LogOut,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  // Base navigation items (always visible)
  const publicNavigation = [{ name: "Events", href: "/events", icon: Users }];

  // Authenticated navigation items
  const baseNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: CalendarDays },
  ];

  // Add My Registrations for participants
  const registrationNav =
    user?.role === "participant"
      ? [
          {
            name: "My Registrations",
            href: "/my-registrations",
            icon: UserCheck,
          },
        ]
      : [];

  // QR Scanner and other organizer/admin tools
  const organizerNavigation =
    user?.role === "organizer" || user?.role === "admin"
      ? [
          { name: "QR Scanner", href: "/scanner", icon: QrCode },
          { name: "Certificates", href: "/certificates", icon: Award },
        ]
      : [];

  const authenticatedNavigation = [
    ...baseNavigation,
    ...registrationNav,
    ...organizerNavigation,
  ];

  const navigation = isAuthenticated
    ? [...publicNavigation, ...authenticatedNavigation]
    : publicNavigation;

  const isAuthPage = ["/login", "/register"].includes(location.pathname);
  const isHomePage = location.pathname === "/";

  if (isAuthPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <p className="text-2xl font-bold text-primary-600">eventbase</p>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);

                  // Show all public navigation and authenticated items based on auth status
                  const shouldShow =
                    publicNavigation.includes(item) ||
                    (isAuthenticated &&
                      !isHomePage &&
                      authenticatedNavigation.includes(item));

                  if (!shouldShow) return null;

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? "border-primary-500 text-gray-900"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
              {isHomePage || !isAuthenticated ? (
                <div className="space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign in
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    Get Started
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  {/* Create Event Button */}
                  <Link
                    to="/events/create"
                    className="btn btn-primary text-sm px-4 py-2"
                  >
                    Create Event
                  </Link>

                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <User className="w-4 h-4" />
                    <span>{user?.name}</span>
                    {/* <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                      {user?.role}
                    </span> */}
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-full hover:bg-gray-100 text-red-600"
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.href);

                // Show all public navigation and authenticated items based on auth status
                const shouldShow =
                  publicNavigation.includes(item) ||
                  (isAuthenticated &&
                    !isHomePage &&
                    authenticatedNavigation.includes(item));

                if (!shouldShow) return null;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 border-l-4 text-base font-medium ${
                      isActive
                        ? "bg-primary-50 border-primary-500 text-primary-700"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            {isHomePage ? (
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-4 space-y-2">
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="block btn-primary w-full text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            ) : (
              <div className="pt-4 pb-3 border-t border-gray-200">
                {/* Create Event Button for Mobile */}
                <div className="px-4 mb-3">
                  <Link
                    to="/events/create"
                    className="block btn btn-primary w-full text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Create Event
                  </Link>
                </div>

                <div className="flex items-center px-4 space-x-3">
                  <button className="p-2 rounded-full hover:bg-gray-100">
                    <User className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-gray-100 text-red-600">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} eventbase. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
