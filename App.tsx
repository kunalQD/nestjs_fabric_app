
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Calculator } from './pages/Calculator';
import { Billing } from './pages/Billing';
import { Calendar } from './pages/Calendar';
import { Login } from './pages/Login';
import { Order, UserRole, OrderStatus } from './types';
import { dataService } from './services/dataService';

const App: React.FC = () => {
  const [user, setUser] = useState<{ username: string; role: UserRole } | null>(null);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'calculator' | 'billing' | 'calendar'>('dashboard');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('qd_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (username: string, role: UserRole) => {
    const userData = { username, role };
    setUser(userData);
    localStorage.setItem('qd_user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    await dataService.logout();
    setUser(null);
    localStorage.removeItem('qd_user');
  };

  const navigateToCalculator = (orderId?: string) => {
    setEditingOrderId(orderId || null);
    setCurrentPage('calculator');
  };

  // Global error handler for auth errors
  const onAuthError = () => {
    handleLogout();
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        userRole={user.role}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto bg-slate-50">
        {currentPage === 'dashboard' && (
          <Dashboard onEditOrder={navigateToCalculator} onAuthError={onAuthError} />
        )}
        {currentPage === 'calculator' && (
          <Calculator 
            orderId={editingOrderId} 
            onSave={() => setCurrentPage('dashboard')} 
          />
        )}
        {currentPage === 'billing' && user.role === UserRole.ADMIN && (
          <Billing />
        )}
        {currentPage === 'calendar' && (
          <Calendar />
        )}
      </main>
      
      {/* Floating Action Button */}
      {currentPage === 'dashboard' && (
        <button 
          onClick={() => navigateToCalculator()}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        >
          <i className="fas fa-plus text-xl"></i>
        </button>
      )}
    </div>
  );
};

export default App;
