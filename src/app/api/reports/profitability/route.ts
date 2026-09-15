import { GET as ProfitabilityGET } from '@/app/api/reports/product-profitability/route';

export async function GET(request: any) {
  return ProfitabilityGET(request);
}
