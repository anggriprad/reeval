import { redirect } from 'next/navigation';

export default function PurchasingPage() {
  redirect('/inventory?tab=procurement');
}
