import { GET as DashboardGET } from '@/app/api/dashboard/route';

export async function GET(request: any) {
  return DashboardGET(request);
}
