import { useTranslation } from 'react-i18next';

export interface StretProduct {
  id: string;
  title: string;        // Supports English and Bislama via i18n
  barcode: string;      // Barcode for scanning
  zoneColor: 'Green' | 'Red' | 'Blue' | 'Yellow'; // Area color
  shelfId: string;      // Shelf ID (e.g., A1, B2)
  rowNum: number;       // Level
  colNum: number;       // Position
  stock: number;        // Current inventory count
  imageUrl?: string;    // Real product image
  category?: string;    // Product category
}

export const getFullLocation = (product: StretProduct, t: any): string => {
  const zone = t(`zone.${product.zoneColor}`, { defaultValue: product.zoneColor });
  const shelf = t('shelf', { defaultValue: 'Shelf' });
  const row = t('row', { defaultValue: 'Row' });
  const area = t('area', { defaultValue: 'Area' });

  // Convert column number to Letter (1 -> A, 2 -> B, etc.)
  const colLetter = String.fromCharCode(64 + product.colNum);

  return `${zone.toUpperCase()} ${area} - ${shelf} ${product.shelfId} - ${row}${product.rowNum} - ${colLetter}${product.colNum}`;
};

// Mock Data for Testing
export const mockProducts: StretProduct[] = [
  {
    id: 'P-001',
    title: 'Fiji Water 500ml',
    barcode: '678123456789',
    zoneColor: 'Green',
    shelfId: 'A1',
    rowNum: 1,
    colNum: 4,
    stock: 240,
    imageUrl: '/fiji_water_bottle_1774074958955.png',
    category: 'BEVERAGE'
  },
  {
    id: 'P-002',
    title: 'Biscuits 100g',
    barcode: '678987654321',
    zoneColor: 'Red',
    shelfId: 'B2',
    rowNum: 3,
    colNum: 2,
    stock: 120,
    imageUrl: '/biscuits_pack_1774074982381.png',
    category: 'SNACK'
  },
  {
    id: 'P-003',
    title: 'Tusker Beer',
    barcode: '678555444333',
    zoneColor: 'Blue',
    shelfId: 'C1',
    rowNum: 1,
    colNum: 10,
    stock: 500,
    imageUrl: '/tusker_beer_bottle_1774075001360.png',
    category: 'ALCOHOL'
  }
];

// Helper to convert to/from Map (Object) for Database integration
export const productToMap = (product: StretProduct) => ({
  ...product,
  updatedAt: new Date().toISOString(),
});

export const productFromMap = (map: any): StretProduct => ({
  id: map.id,
  title: map.title,
  barcode: map.barcode,
  zoneColor: map.zoneColor,
  shelfId: map.shelfId,
  rowNum: Number(map.rowNum),
  colNum: Number(map.colNum),
  stock: Number(map.stock),
  imageUrl: map.imageUrl,
  category: map.category,
});
