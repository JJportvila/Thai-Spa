import React from 'react';
import WarehouseManagementPage from './WarehouseManagement';

interface MyInventoryPageProps {
  accountId?: string;
}

const MyInventoryPage: React.FC<MyInventoryPageProps> = ({ accountId }) => {
  return (
    <div className="my-inventory-proxy h-full min-h-[calc(100vh-120px)] bg-[#f6f6f8]">
      <style>{`
        .my-inventory-proxy aside {
          display: none !important;
        }
        .my-inventory-proxy main {
          margin-left: 0 !important;
          padding: 0 !important;
        }
        .my-inventory-proxy main > div:first-child {
          display: none !important;
        }
        .my-inventory-proxy .inventory-template {
          min-height: auto !important;
        }
      `}</style>
      <WarehouseManagementPage accountId={accountId} />
    </div>
  );
};

export default MyInventoryPage;
