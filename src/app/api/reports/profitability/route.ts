import { GET as ProfitabilityGET } from '@/app/api/reports/product-profitability/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: any) {
  return ProfitabilityGET(request);
}
