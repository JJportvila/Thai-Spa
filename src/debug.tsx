import React from 'react';
import { createRoot } from 'react-dom/client';
import DashboardPage from './pages/Dashboard';
import SupplierEntryPage from './pages/SupplierEntry';
import FinanceBoardPage from './pages/FinanceBoard';
import DriverAppPage from './pages/DriverApp';

const TestPage = () => (
  <div style={{ padding: '20px' }}>
    <h2>Testing SupplierEntryPage:</h2>
    <div style={{ border: '1px solid red', padding: '10px' }}>
      <SupplierEntryPage />
    </div>
    <hr />
    <h2>Testing DriverAppPage:</h2>
    <div style={{ border: '1px solid blue', padding: '10px' }}>
      <DriverAppPage />
    </div>
  </div>
);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TestPage />);
}
