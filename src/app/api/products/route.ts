import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.cloud_store');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {}
}

const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    name: 'Gà Ủ Muối Nguyên Con',
    category: 'Món Gà Ủ Muối',
    unit: 'Con',
    price: 190000,
    cost_price: 110000,
    is_available: true,
    is_best_seller: true,
    batch_code: 'LÔ-GUM-0409',
    production_date: '2026-09-04',
    shelf_life_days: 14,
    expiry_date: '2026-09-18'
  },
  {
    id: 'p2',
    name: 'Gà Ủ Muối Nửa Con',
    category: 'Món Gà Ủ Muối',
    unit: 'Nửa con',
    price: 100000,
    cost_price: 58000,
    is_available: true,
    is_best_seller: true,
    batch_code: 'LÔ-GUM-0409',
    production_date: '2026-09-04',
    shelf_life_days: 14,
    expiry_date: '2026-09-18'
  },
  {
    id: 'p3',
    name: 'Chân Gà Rút Xương Sả Tắc',
    category: 'Món Ăn Kèm',
    unit: 'Hũ 500g',
    price: 65000,
    cost_price: 32000,
    is_available: true,
    is_best_seller: true,
    batch_code: 'LÔ-CG-0409',
    production_date: '2026-09-04',
    shelf_life_days: 7,
    expiry_date: '2026-09-11'
  },
  {
    id: 'p4',
    name: 'Cánh Gà Ủ Muối (Phần 4 Cánh)',
    category: 'Món Gà Ủ Muối',
    unit: 'Phần',
    price: 85000,
    cost_price: 45000,
    is_available: true,
    is_best_seller: false,
    batch_code: 'LÔ-CGUM-0409',
    production_date: '2026-09-04',
    shelf_life_days: 10,
    expiry_date: '2026-09-14'
  },
  {
    id: 'p5',
    name: 'Trà Tắc Khổng Lồ',
    category: 'Nước Uống',
    unit: 'Ly 1 Lit',
    price: 20000,
    cost_price: 6000,
    is_available: true,
    is_best_seller: true,
    batch_code: 'LÔ-TT-0409',
    production_date: '2026-09-04',
    shelf_life_days: 2,
    expiry_date: '2026-09-06'
  }
];

function readProducts(): any[] {
  ensureStorage();
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_PRODUCTS;
}

function writeProducts(products: any[]) {
  ensureStorage();
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
  } catch (e) {}
}

export async function GET() {
  try {
    const products = readProducts();
    return NextResponse.json({ success: true, products, timestamp: Date.now() });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch cloud products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let updatedProducts: any[] = [];
    const currentProducts = readProducts();

    if (Array.isArray(body)) {
      updatedProducts = body;
    } else if (body && body.id) {
      const index = currentProducts.findIndex(p => p.id === body.id);
      if (index >= 0) {
        currentProducts[index] = { ...currentProducts[index], ...body };
        updatedProducts = [...currentProducts];
      } else {
        updatedProducts = [body, ...currentProducts];
      }
    } else {
      return NextResponse.json({ success: false, error: 'Invalid product data' }, { status: 400 });
    }

    writeProducts(updatedProducts);
    return NextResponse.json({ success: true, products: updatedProducts, timestamp: Date.now() });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update cloud products' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, is_available } = await request.json();
    const currentProducts = readProducts();
    const updatedProducts = currentProducts.map(p => p.id === id ? { ...p, is_available } : p);
    writeProducts(updatedProducts);
    return NextResponse.json({ success: true, products: updatedProducts, timestamp: Date.now() });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to toggle product availability' }, { status: 500 });
  }
}
