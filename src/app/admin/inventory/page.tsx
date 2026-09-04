import { redirect } from 'next/navigation';

export default function InventoryRootPage() {
  redirect('/admin/inventory/import');
}
