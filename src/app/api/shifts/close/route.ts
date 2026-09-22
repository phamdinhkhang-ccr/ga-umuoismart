import { NextRequest, NextResponse } from 'next/server';
import { POST as mainShiftPost } from '../route';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reqWithAction = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ ...body, action: 'CLOSE' }),
    });
    return mainShiftPost(reqWithAction);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
