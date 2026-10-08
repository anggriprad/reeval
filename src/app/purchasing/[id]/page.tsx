import { redirect } from 'next/navigation';

export default async function PurchasingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/inventory/procurement/${id}`);
}
