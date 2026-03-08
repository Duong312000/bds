import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { User } from './types';

// Components
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Properties } from './pages/Properties';
import { CreateContract } from './pages/CreateContract';
import { ApproveContract } from './pages/ApproveContract';
import { Payments } from './pages/Payments';
import { Reports } from './pages/Reports';
import { Requests } from './pages/Requests';
import { Users as UsersPage } from './pages/Users';
import { Transactions } from './pages/Transactions';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        view={view} 
        setView={setView} 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
        onLogout={() => setUser(null)}
      />

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen flex flex-col",
        isSidebarOpen ? "pl-64" : "pl-20"
      )}>
        {/* Header */}
        <Header user={user} setView={setView} />

        {/* View Content */}
        <div className="p-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && <Dashboard />}
              {view === 'customers' && <Customers user={user} />}
              {view === 'requests' && <Requests user={user} />}
              {view === 'properties' && <Properties user={user} />}
              {view === 'transactions' && <Transactions user={user} />}
              {view === 'payments' && <Payments user={user} />}
              {view === 'reports' && <Reports />}
              {view === 'users' && <UsersPage />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
