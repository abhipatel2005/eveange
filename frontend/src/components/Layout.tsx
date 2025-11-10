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
import { useUserPermissions } from "../hooks/useUserPermissions";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { permissions } = useUserPermissions();

  // For dynamic nav: get event/registration/staff state from DashboardPage logic
  // We'll use localStorage (populated by dashboard) as a simple cross-component comms for now
  const [hasRegistrations, setHasRegistrations] = React.useState(false);

  React.useEffect(() => {
    // Listen for dashboard updates (set in DashboardPage)
    const reg = localStorage.getItem("dashboard_has_registrations");
    setHasRegistrations(reg === "true");
    // Listen for changes
    const handler = () => {
      setHasRegistrations(
        localStorage.getItem("dashboard_has_registrations") === "true"
      );
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Base navigation items (always visible)
  const publicNavigation = [{ name: "Events", href: "/events", icon: Users }];

  // Authenticated navigation items
  const baseNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: CalendarDays },
  ];

  // Show QR Scanner and Certificates based on event_users table permissions
  const canSeeQRScanner =
    user?.role === "organizer" ||
    user?.role === "admin" ||
    permissions?.hasStaffAssignments ||
    permissions?.canScanQR;

  const canAccessCertificates =
    user?.role === "organizer" ||
    user?.role === "admin" ||
    permissions?.canAccessCertificates;

  const authenticatedNavigation = [
    ...baseNavigation,
    ...(hasRegistrations
      ? [
          {
            name: "My Registrations",
            href: "/my-registrations",
            icon: UserCheck,
          },
        ]
      : []),
    ...(canSeeQRScanner
      ? [{ name: "QR Scanner", href: "/scanner", icon: QrCode }]
      : []),
    ...(canAccessCertificates
      ? [{ name: "Certificates", href: "/certificates", icon: Award }]
      : []),
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
    <div className="min-h-screen bg-white">
      {/* Seamless Navigation - only shows on non-home pages */}
      {!isHomePage && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                {/* Logo */}
                <div className="flex-shrink-0 flex items-center">
                  <Link
                    to="/"
                    className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-transparent bg-clip-text"
                  >
                    eveange
                  </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.href);
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
                        className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 my-3"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 my-3"
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
              <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-3">
                {!isAuthenticated ? (
                  <div className="flex items-center space-x-3">
                    <Link
                      to="/login"
                      className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/register"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-md transition-all transform hover:scale-105"
                    >
                      Get Started
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link
                      to="/events/create"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-all"
                    >
                      Create Event
                    </Link>
                    <div className="flex items-center space-x-2 text-sm text-gray-700 px-3 py-2 bg-gray-100 rounded-lg">
                      <User className="w-4 h-4" />
                      <span>{user?.name}</span>
                    </div>
                    <button
                      onClick={logout}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
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
                  className="inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
              <div className="sm:hidden border-t border-gray-100 pb-3">
                <div className="px-2 pt-2 pb-3 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.href);
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
                        className={`flex items-center px-3 py-2 rounded-lg text-base font-medium ${
                          isActive
                            ? "bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>

                {!isAuthenticated ? (
                  <div className="pt-4 px-2 space-y-2">
                    <Link
                      to="/login"
                      className="block px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/register"
                      className="block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </div>
                ) : (
                  <div className="pt-4 px-2">
                    <div className="flex items-center px-3 py-2 mb-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-purple-600 mr-2" />
                      <span className="text-sm font-medium">{user?.name}</span>
                    </div>
                    <Link
                      to="/events/create"
                      className="block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-center mb-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Create Event
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className={!isHomePage ? "pt-16" : ""}>{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} eveange. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
