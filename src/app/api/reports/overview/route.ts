import { GET as DashboardGET } from '@/app/api/dashboard/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: any) {
  return DashboardGET(request);
}
