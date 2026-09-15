import { POST as ChatPOST } from '@/app/api/chat/route';

export async function POST(request: Request) {
  return ChatPOST(request);
}
