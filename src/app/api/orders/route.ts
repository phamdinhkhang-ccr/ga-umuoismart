import { NextResponse } from 'next/server';
import { 
  getCloudOrders, 
  getCloudNotifs, 
  addCloudOrder, 
  setCloudOrders 
} from '@/lib/serverStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = Number(searchParams.get('since') || 0);

    const allOrders = getCloudOrders();
    const allNotifs = getCloudNotifs();

    const newOrders = since > 0 
      ? allOrders.filter(o => new Date(o.createdAt || o.created_at || 0).getTime() > since)
      : [];

    return NextResponse.json({
      success: true,
      orders: allOrders,
      notifications: allNotifs,
      newOrders,
      hasNew: newOrders.length > 0,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = addCloudOrder(body);

    return NextResponse.json({
      success: true,
      order: result.orders[0],
      notification: result.notification,
      orders: result.orders,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create cloud order' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { orderId, status } = await request.json();
    const currentOrders = getCloudOrders();
    const updatedOrders = currentOrders.map(o => (o.id === orderId || o.order_code === orderId) ? { ...o, status } : o);
    setCloudOrders(updatedOrders);

    return NextResponse.json({ success: true, orders: updatedOrders }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update order status' }, { status: 500 });
  }
}
