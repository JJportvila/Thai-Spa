import { StretProduct } from './productLogic';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  type: 'Wholesale' | 'Retail' | 'Corporate';
  totalSpent: number;
  lastOrder: string;
  loyaltyPoints: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'INACTIVE';
  totalPurchased: number;
  lastDelivery: string;
  rating: number;
}

const vanuatuBrands = [
  'Tusker', 'Azure', 'Vanuatu Water', 'Kava Root', 'Aore', 
  'Fine Foods', 'Carpenter', 'Lapita', 'Switi', 'Blue River'
];

const categories = [
  { name: 'Beverage', zones: ['Blue', 'Green'] },
  { name: 'Snack', zones: ['Red'] },
  { name: 'Staple', zones: ['Yellow'] },
  { name: 'Household', zones: ['Yellow'] },
  { name: 'Produce', zones: ['Green'] }
];

const buildProductImage = (title: string, category: string, zone: string): string => {
  const palette: Record<string, { bg: string; fg: string }> = {
    Blue: { bg: '#0ea5e9', fg: '#ffffff' },
    Green: { bg: '#10b981', fg: '#ffffff' },
    Red: { bg: '#ef4444', fg: '#ffffff' },
    Yellow: { bg: '#f59e0b', fg: '#111827' },
  };
  const iconMap: Record<string, string> = {
    Beverage: 'DRINK',
    Snack: 'SNACK',
    Staple: 'STAPLE',
    Household: 'HOME',
    Produce: 'FRESH',
  };

  const p = palette[zone] || { bg: '#334155', fg: '#ffffff' };
  const badge = iconMap[category] || 'ITEM';
  const short = title.replace(/\s+\(Batch-\d+\)$/, '').slice(0, 24);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${p.bg}" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="42" fill="url(#g)"/>
      <rect x="38" y="38" width="436" height="436" rx="28" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>
      <text x="44" y="98" fill="${p.fg}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800">${badge}</text>
      <text x="44" y="170" fill="${p.fg}" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="900">${short}</text>
      <text x="44" y="454" fill="${p.fg}" font-family="Inter, Arial, sans-serif" font-size="24" opacity="0.9">STRET POS</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const generateVanuatuInventory = (count: number): StretProduct[] => {
  const products: StretProduct[] = [];
  const items = [
    { title: 'Tusker Premium Lager 330ml', category: 'Beverage', barcodePrefix: '678', zone: 'Blue' },
    { title: 'Tusker Lemon 330ml', category: 'Beverage', barcodePrefix: '678', zone: 'Blue' },
    { title: 'Vanuatu Water 500ml', category: 'Beverage', barcodePrefix: '678', zone: 'Green' },
    { title: 'Vanuatu Water 1.5L', category: 'Beverage', barcodePrefix: '678', zone: 'Green' },
    { title: 'Azure Pure Water 600ml', category: 'Beverage', barcodePrefix: '742', zone: 'Green' },
    { title: 'Switi Lemonade 500ml', category: 'Beverage', barcodePrefix: '678', zone: 'Blue' },
    { title: 'Switi Cola 500ml', category: 'Beverage', barcodePrefix: '678', zone: 'Blue' },
    { title: 'Tanna Coffee Medium Roast 250g', category: 'Staple', barcodePrefix: '678', zone: 'Yellow' },
    { title: 'Tanna Coffee Dark Roast 250g', category: 'Staple', barcodePrefix: '678', zone: 'Yellow' },
    { title: 'Lapita Cassava Chips Salted', category: 'Snack', barcodePrefix: '678', zone: 'Red' },
    { title: 'Lapita Taro Chips Chilli', category: 'Snack', barcodePrefix: '678', zone: 'Red' },
    { title: 'Lapita Banana Chips Sweet', category: 'Snack', barcodePrefix: '678', zone: 'Red' },
    { title: 'Fine Foods Cream Crackers', category: 'Snack', barcodePrefix: '678', zone: 'Red' },
    { title: 'Fine Foods Digestive Biscuits', category: 'Snack', barcodePrefix: '678', zone: 'Red' },
    { title: 'Aore Island Dark Chocolate 100g', category: 'Snack', barcodePrefix: '678', zone: 'Red' },
    { title: 'Vanuatu Kava Powder (Grade A) 1kg', category: 'Staple', barcodePrefix: '678', zone: 'Yellow' },
    { title: 'Vanuatu Kava Powder (Instant) 250g', category: 'Staple', barcodePrefix: '678', zone: 'Yellow' },
    { title: 'Santo Beef Corned 340g', category: 'Staple', barcodePrefix: '678', zone: 'Yellow' },
    { title: 'Santo Beef Premium Steak 500g', category: 'Staple', barcodePrefix: '678', zone: 'Yellow' },
    { title: 'Punjas Flour 1kg', category: 'Staple', barcodePrefix: '742', zone: 'Yellow' },
    { title: 'Punjas Rice 5kg', category: 'Staple', barcodePrefix: '742', zone: 'Yellow' },
    { title: 'Island Dress Fabric (Vibrant Blue)', category: 'Household', barcodePrefix: '678', zone: 'Yellow' },
    { title: 'Belo Soap (Local Coconut)', category: 'Household', barcodePrefix: '678', zone: 'Yellow' },
  ];

  for (let i = 0; i < count; i++) {
    const template = items[i % items.length];
    const shelfId = `${String.fromCharCode(65 + (i % 4))}${Math.ceil((i + 1) / 20)}`;
    
    products.push({
      id: `P-${String(i + 1).padStart(3, '0')}`,
      title: `${template.title} (Batch-${Math.floor(i / items.length) + 1})`,
      barcode: `${template.barcodePrefix}${Math.floor(Math.random() * 8999999) + 1000000}`,
      category: template.category,
      zoneColor: template.zone as any,
      shelfId: shelfId,
      rowNum: (i % 5) + 1,
      colNum: (i % 10) + 1,
      stock: Math.floor(Math.random() * 500) + 1,
      imageUrl: buildProductImage(template.title, template.category, template.zone)
    });
  }

  return products;
};

export const extendedVanuatuProducts = generateVanuatuInventory(105);

export const mockCustomers: Customer[] = [
  { id: 'CUS-001', name: 'Island Resorts Group Ltd.', email: 'hq@islandresorts.vu', phone: '+678 22344', address: 'Port Vila, Efate', status: 'ACTIVE', type: 'Corporate', totalSpent: 1250000, lastOrder: '2024-03-20', loyaltyPoints: 4500 },
  { id: 'CUS-002', name: 'Coral Bay Supplies', email: 'orders@coralbay.vu', phone: '+678 24556', address: 'Luganville, Santo', status: 'ACTIVE', type: 'Wholesale', totalSpent: 890000, lastOrder: '2024-03-18', loyaltyPoints: 2100 },
  { id: 'CUS-003', name: 'Pacific Logistics & Trading', email: 'logistics@pacitrade.vu', phone: '+678 27889', address: 'Tanna Island', status: 'PENDING', type: 'Wholesale', totalSpent: 450000, lastOrder: '2024-03-15', loyaltyPoints: 1200 },
  { id: 'CUS-004', name: 'Sunrise Retailers', email: 'hello@sunrise.vu', phone: '+678 21122', address: 'Port Vila, Efate', status: 'ACTIVE', type: 'Retail', totalSpent: 320000, lastOrder: '2024-03-10', loyaltyPoints: 850 },
  { id: 'CUS-005', name: 'Blue Horizon Traders', email: 'blue@horizon.vu', phone: '+678 29900', address: 'Port Vila, Efate', status: 'INACTIVE', type: 'Wholesale', totalSpent: 15000, lastOrder: '2023-12-05', loyaltyPoints: 50 },
];

export const mockSuppliers: Supplier[] = [
  { id: 'SUP-001', name: 'Vanuatu Beverages Ltd', contactPerson: 'John T.', email: 'sales@vanuatubev.vu', phone: '+678 22111', category: 'Beverages', status: 'ACTIVE', totalPurchased: 4500000, lastDelivery: '2024-03-20', rating: 4.8 },
  { id: 'SUP-002', name: 'Port Vila Fresh Produce', contactPerson: 'Mary S.', email: 'fresh@portvila.vu', phone: '+678 23445', category: 'Produce', status: 'ACTIVE', totalPurchased: 1200000, lastDelivery: '2024-03-21', rating: 4.5 },
  { id: 'SUP-003', name: 'Azure Pure Water', contactPerson: 'David L.', email: 'info@azure.vu', phone: '+678 25667', category: 'Beverages', status: 'ACTIVE', totalPurchased: 890000, lastDelivery: '2024-03-15', rating: 4.9 },
  { id: 'SUP-004', name: 'Pacific Staples Imports', contactPerson: 'Kevin W.', email: 'ops@pacstaples.vu', phone: '+678 27889', category: 'General Goods', status: 'ON_HOLD', totalPurchased: 2300000, lastDelivery: '2024-02-10', rating: 3.2 },
  { id: 'SUP-005', name: 'Santo Coffee Roasters', contactPerson: 'Elena R.', email: 'beans@santocoffee.vu', phone: '+678 33445', category: 'Beverages', status: 'ACTIVE', totalPurchased: 450000, lastDelivery: '2024-03-01', rating: 4.7 },
];
