import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const group = searchParams.get('group');

    const whereCondition = group ? { group } : {};
    const settings = await prisma.setting.findMany({
      where: whereCondition,
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ success: true, settings: settingsMap, raw: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json(); // expected object with { key: value, ... } or { settings: [...] }

    if (body.settings && Array.isArray(body.settings)) {
      for (const item of body.settings) {
        await prisma.setting.upsert({
          where: { key: item.key },
          update: { value: item.value, group: item.group || 'GENERAL' },
          create: { key: item.key, value: item.value, group: item.group || 'GENERAL' },
        });
      }
    } else if (typeof body === 'object') {
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string' || typeof value === 'number') {
          let group = 'GENERAL';
          if (key.startsWith('AI_') || key === 'GEMINI_API_KEY') group = 'AI';
          else if (key.startsWith('CMS_')) group = 'CMS';
          else if (key.startsWith('STORE_')) group = 'STORE';

          await prisma.setting.upsert({
            where: { key },
            update: { value: String(value), group },
            create: { key, value: String(value), group },
          });
        }
      }
    }

    try {
      revalidatePath('/');
      revalidatePath('/admin/cms');
      revalidatePath('/admin/store');
      revalidatePath('/admin/branches');
      revalidatePath('/checkout');
    } catch (e) {}

    return NextResponse.json({ success: true, message: 'Đã lưu cấu hình thành công' });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
