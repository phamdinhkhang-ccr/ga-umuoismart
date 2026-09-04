import { NextResponse } from 'next/server';
import { getCloudProducts, setCloudProducts } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const products = getCloudProducts();
    return NextResponse.json({ success: true, products, timestamp: Date.now() }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch cloud products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let updatedProducts: any[] = [];
    const currentProducts = getCloudProducts();

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

    setCloudProducts(updatedProducts);
    return NextResponse.json({ success: true, products: updatedProducts, timestamp: Date.now() }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update cloud products' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, is_available } = await request.json();
    const currentProducts = getCloudProducts();
    const updatedProducts = currentProducts.map(p => p.id === id ? { ...p, is_available } : p);
    setCloudProducts(updatedProducts);
    return NextResponse.json({ success: true, products: updatedProducts, timestamp: Date.now() }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to toggle product availability' }, { status: 500 });
  }
}
