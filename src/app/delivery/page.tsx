'use client';

import React, { useState, Suspense } from 'react';
import { useUrlTab } from '@/lib/useUrlTab';
import { useApp } from '@/context/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl, SegmentOption } from '@/components/ui/SegmentedControl';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { canDeliverOrder } from '@/lib/roles';
import {
  Truck,
  FileText,
  MapPin,
  User,
  Car,
  Calendar,
  Printer,
  Package,
  Camera,
  CheckCircle2,
  Check,
  AlertCircle,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

type TabKey = 'queue' | 'in-transit' | 'delivered';

function DeliveryContent() {
  const { salesOrders, deliveryOrders, currentUser, createDeliveryOrder, confirmDelivery } = useApp();

  const [activeTab, setActiveTab] = useUrlTab(
    ['queue', 'in-transit', 'delivered'] as const,
    currentUser.role === 'DRIVER' ? 'in-transit' : 'queue'
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);

  // Create DO form state
  const [selectedSOId, setSelectedSOId] = useState('');
  const [isPreSelected, setIsPreSelected] = useState(false);
  const [driverName, setDriverName] = useState(currentUser.role === 'DRIVER' ? currentUser.name : 'Hasan Basri');
  const [vehiclePlate, setVehiclePlate] = useState('B 9876 KLM');
  const [shipDate, setShipDate] = useState(new Date().toISOString().split('T')[0]);

  // Driver proof confirmation state
  const [receiverName, setReceiverName] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [selectedMockPhoto, setSelectedMockPhoto] = useState('photo-1');
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState('');

  const readyToShip = salesOrders.filter(o => o.status === 'READY');
  const inTransitDOs = deliveryOrders.filter(d => d.status !== 'DELIVERED');
  const deliveredDOs = deliveryOrders.filter(d => d.status === 'DELIVERED');

  const displayReadyToShip = readyToShip.filter(so => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      so.orderNumber.toLowerCase().includes(q) ||
      so.customer.name.toLowerCase().includes(q) ||
      (so.customer.address && so.customer.address.toLowerCase().includes(q)) ||
      so.items.some(i => i.productName.toLowerCase().includes(q))
    );
  });

  const filterDO = (doList: typeof deliveryOrders) => {
    let list = doList;
    if (driverFilter) {
      list = list.filter(d => d.assignedDriverName === driverFilter);
    }
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(d =>
      d.doNumber.toLowerCase().includes(q) ||
      d.salesOrderNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      d.customerAddress.toLowerCase().includes(q) ||
      d.assignedDriverName.toLowerCase().includes(q) ||
      d.vehiclePlate.toLowerCase().includes(q) ||
      d.items.some(i => i.toLowerCase().includes(q))
    );
  };

  const displayInTransitDOs = filterDO(inTransitDOs);
  const displayDeliveredDOs = filterDO(deliveredDOs);

  const selectedSO = salesOrders.find(o => o.id === selectedSOId);
  const previewDO = deliveryOrders.find(d => d.id === showPreviewModal);
  const deliveryToConfirm = deliveryOrders.find(d => d.id === showProofModal);

  const openCreateModalForSO = (soId?: string) => {
    if (soId) {
      setSelectedSOId(soId);
      setIsPreSelected(true);
    } else {
      setSelectedSOId('');
      setIsPreSelected(false);
    }
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSelectedSOId('');
    setIsPreSelected(false);
  };

  const submitDO = () => {
    if (!selectedSOId || !driverName.trim() || !vehiclePlate.trim() || !shipDate) return;
    createDeliveryOrder(selectedSOId, driverName, vehiclePlate, shipDate);
    closeCreateModal();
    setActiveTab('in-transit');
  };

  const handleConfirmDelivery = () => {
    if (!showProofModal || !receiverName.trim()) return;
    const fullProof = `Diterima oleh: ${receiverName}. Catatan: ${proofNote || 'Barang lengkap sesuai SPK & tidak ada cacat.'} [Bukti Foto: Terlampir - Foto Surat Jalan & Unit Dipan Tiba di Lokasi]`;
    confirmDelivery(showProofModal, fullProof);
    setReceiverName('');
    setProofNote('');
    setShowProofModal(null);
  };

  const tabOptions: SegmentOption<TabKey>[] = [
    {
      key: 'queue',
      label: 'Antrean Kirim',
      count: readyToShip.length,
      icon: Package,
    },
    {
      key: 'in-transit',
      label: 'Sedang Diperjalanan',
      count: inTransitDOs.length,
      icon: Truck,
    },
    {
      key: 'delivered',
      label: 'Terkirim',
      count: deliveredDOs.length,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Pengiriman & Surat Jalan"
      >
        <div className="flex items-center gap-2">
          <Link href="/delivery/config">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-1.5" />
              Konfigurasi
            </Button>
          </Link>
          <Button onClick={() => openCreateModalForSO()} disabled={readyToShip.length === 0}>
            <FileText className="h-4 w-4 mr-1.5" />
            Terbitkan Surat Jalan ({readyToShip.length} Siap)
          </Button>
        </div>
      </PageHeader>

      {(() => {
        const drivers = Array.from(new Set(deliveryOrders.map(d => d.assignedDriverName))).filter(Boolean);
        const driverOptions = drivers.length > 0
          ? drivers.map(d => ({ value: d, label: d }))
          : [
            { value: 'Hasan Basri', label: 'Hasan Basri' },
            { value: 'Budi Santoso', label: 'Budi Santoso' },
          ];

        return (
          <SegmentedControl
            options={tabOptions}
            value={activeTab}
            onChange={(tab) => {
              setActiveTab(tab as TabKey);
              setDriverFilter('');
            }}
            filterValue={driverFilter}
            onFilterChange={setDriverFilter}
            filterPlaceholder="Semua Driver Pengirim"
            filterOptions={driverOptions}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Cari surat jalan, order, driver, pelanggan..."
          />
        );
      })()}

      {/* Tab 1: Order Siap Kirim (Admin View) */}
      {activeTab === 'queue' && (
        <Card>
          {displayReadyToShip.length === 0 ? (
            <EmptyState
              title={searchTerm ? "Tidak ada order yang sesuai dengan pencarian" : "Belum ada order yang siap dikirim"}
              description={searchTerm ? "Coba kata kunci pencarian lain." : "Order akan muncul di sini setelah seluruh item SPK diselesaikan oleh tim produksi."}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayReadyToShip.map(so => (
                <div
                  key={so.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/80 dark:bg-slate-800/50 space-y-3 flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {so.orderNumber}
                      </span>
                      <Badge variant="purple" className="text-[10px]">Siap Kirim</Badge>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{so.customer.name}</p>
                      <div className="mt-1 space-y-1">
                        {so.items.map((item, i) => (
                          <div key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                            <span>{item.productName}</span>
                            <span className="font-semibold text-slate-900 dark:text-white">x{item.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-xs text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{so.customer.address}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => openCreateModalForSO(so.id)}
                  >
                    <FileText className="h-3.5 w-3.5" /> Buat Surat Jalan
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 2: Sedang Diperjalanan (Driver & Admin View) */}
      {activeTab === 'in-transit' && (
        <Card>
          {displayInTransitDOs.length === 0 ? (
            <EmptyState
              title={searchTerm ? "Tidak ada pengiriman yang sesuai dengan pencarian" : "Tidak ada pengiriman yang sedang berjalan"}
              description={searchTerm ? "Coba kata kunci pencarian lain." : "Pilih order di tab 'Order Siap Kirim' untuk menerbitkan surat jalan pengiriman baru."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs">
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">No. DO</th>
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">No. Order</th>
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">Pelanggan & Alamat</th>
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">Driver & Plat</th>
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">Tgl Kirim</th>
                    <th className="pb-3 pr-3 text-center font-semibold text-slate-500">Status</th>
                    <th className="pb-3 text-center font-semibold text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...displayInTransitDOs].reverse().map(dOrder => (
                    <tr
                      key={dOrder.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 pr-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {dOrder.doNumber}
                      </td>
                      <td className="py-3.5 pr-3 font-mono text-xs text-slate-500">{dOrder.salesOrderNumber}</td>
                      <td className="py-3.5 pr-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{dOrder.customerName}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{dOrder.customerAddress}</p>
                      </td>
                      <td className="py-3.5 pr-3">
                        <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">{dOrder.assignedDriverName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{dOrder.vehiclePlate}</p>
                      </td>
                      <td className="py-3.5 pr-3 text-slate-500 dark:text-slate-400 text-xs">
                        {formatDate(dOrder.scheduledDate)}
                      </td>
                      <td className="py-3.5 pr-3 text-center">
                        <Badge variant="info">
                          Dalam Pengiriman
                        </Badge>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => setShowPreviewModal(dOrder.id)} title="Cetak Surat Jalan">
                            <Printer className="h-3.5 w-3.5" />
                            Lihat SJ
                          </Button>

                          {canDeliverOrder(currentUser.role) && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => {
                                setShowProofModal(dOrder.id);
                                setReceiverName('');
                                setProofNote('');
                              }}
                            >
                              <Camera className="h-3.5 w-3.5" />
                              Konfirmasi Terkirim
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Surat Jalan Terkirim */}
      {activeTab === 'delivered' && (
        <Card>
          {displayDeliveredDOs.length === 0 ? (
            <EmptyState
              title={searchTerm ? "Tidak ada surat jalan terkirim yang sesuai dengan pencarian" : "Belum ada surat jalan terkirim"}
              description={searchTerm ? "Coba kata kunci pencarian lain." : "Surat jalan yang telah diselesaikan oleh driver akan muncul di sini."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs">
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">No. DO</th>
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">No. Order</th>
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">Pelanggan & Alamat</th>
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">Driver & Plat</th>
                    <th className="pb-3 pr-3 text-left font-semibold text-slate-500">Tgl Kirim</th>
                    <th className="pb-3 pr-3 text-center font-semibold text-slate-500">Status</th>
                    <th className="pb-3 text-center font-semibold text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...displayDeliveredDOs].reverse().map(dOrder => (
                    <tr
                      key={dOrder.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 pr-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {dOrder.doNumber}
                      </td>
                      <td className="py-3.5 pr-3 font-mono text-xs text-slate-500">{dOrder.salesOrderNumber}</td>
                      <td className="py-3.5 pr-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{dOrder.customerName}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{dOrder.customerAddress}</p>
                      </td>
                      <td className="py-3.5 pr-3">
                        <p className="text-slate-800 dark:text-slate-200 text-xs font-medium">{dOrder.assignedDriverName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{dOrder.vehiclePlate}</p>
                      </td>
                      <td className="py-3.5 pr-3 text-slate-500 dark:text-slate-400 text-xs">
                        {formatDate(dOrder.scheduledDate)}
                      </td>
                      <td className="py-3.5 pr-3 text-center">
                        <Badge variant="success">
                          Terkirim
                        </Badge>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => setShowPreviewModal(dOrder.id)} title="Cetak Surat Jalan">
                            <Printer className="h-3.5 w-3.5" />
                            Lihat SJ
                          </Button>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Selesai
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal: Create Delivery Order */}
      <Modal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        title="Penerbitan Surat Jalan"
        size="md"
        actions={
          <>
            <Button variant="outline" onClick={closeCreateModal}>Batal</Button>
            <Button onClick={submitDO} disabled={!selectedSOId || !driverName.trim() || !vehiclePlate.trim() || !shipDate}>
              <Truck className="h-4 w-4" />
              Terbitkan Surat Jalan
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* If pre-selected via order row action, display clean read-only summary card */}
          {isPreSelected && selectedSO ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono">
                  {selectedSO.orderNumber}
                </span>
                <Badge variant="purple" className="text-[10px]">Terkunci dari Baris Order</Badge>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedSO.customer.name}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                📍 {selectedSO.customer.address || 'Alamat tidak dispesifikasikan'}
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Sales Order (Siap Kirim) *
              </label>
              <select
                value={selectedSOId}
                onChange={e => {
                  setSelectedSOId(e.target.value);
                  setIsPreSelected(false);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">-- Pilih Sales Order --</option>
                {readyToShip.map(so => (
                  <option key={so.id} value={so.id}>
                    {so.orderNumber} — {so.customer.name} ({so.items?.length || 0} item)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Kurir / Driver *
            </label>
            <input
              type="text"
              value={driverName}
              onChange={e => setDriverName(e.target.value)}
              placeholder="Contoh: Pak Supri / JNE Express"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Plat Nomor Kendaraan *
            </label>
            <input
              type="text"
              value={vehiclePlate}
              onChange={e => setVehiclePlate(e.target.value)}
              placeholder="Contoh: B 9876 XYZ"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tanggal Pengiriman *
            </label>
            <input
              type="date"
              value={shipDate}
              onChange={e => setShipDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Driver Proof of Delivery */}
      <Modal
        isOpen={!!deliveryToConfirm}
        onClose={() => setShowProofModal(null)}
        title={`Konfirmasi Serah Terima — ${deliveryToConfirm?.doNumber || ''}`}
        size="md"
        actions={
          deliveryToConfirm ? (
            <>
              <Button variant="outline" onClick={() => setShowProofModal(null)}>Batal</Button>
              <Button variant="success" onClick={handleConfirmDelivery} disabled={!receiverName.trim()}>
                <CheckCircle2 className="h-4 w-4" />
                Simpan & Tandai Terkirim
              </Button>
            </>
          ) : undefined
        }
      >
        {deliveryToConfirm && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3.5 dark:bg-slate-800 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Pelanggan:</span><strong className="text-slate-900 dark:text-white">{deliveryToConfirm.customerName}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Tujuan:</span><span className="text-slate-700 dark:text-slate-300 truncate max-w-xs">{deliveryToConfirm.customerAddress}</span></div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Penerima Barang *
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={e => setReceiverName(e.target.value)}
                placeholder="Nama orang yang menerima di lokasi"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Kondisi Serah Terima
              </label>
              <textarea
                value={proofNote}
                onChange={e => setProofNote(e.target.value)}
                placeholder="Kondisi barang lengkap dan terpasang dengan baik."
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                rows={2}
              />
            </div>

            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-indigo-500" /> Lampiran Bukti Foto Driver
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedMockPhoto('photo-1')}
                  className={`rounded-lg border p-2 text-left transition-all ${selectedMockPhoto === 'photo-1'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600'
                    }`}
                >
                  Foto Unit di Lokasi
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMockPhoto('photo-2')}
                  className={`rounded-lg border p-2 text-left transition-all ${selectedMockPhoto === 'photo-2'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 font-semibold'
                    : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600'
                    }`}
                >
                  Tanda Tangan Surat Jalan
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Surat Jalan Print Preview */}
      <Modal isOpen={!!previewDO} onClose={() => setShowPreviewModal(null)} title="Surat Jalan" size="lg">
        {previewDO && (
          <div className="space-y-6">
            <div className="rounded-lg border-2 border-slate-300 p-6 dark:border-slate-600 bg-white dark:bg-slate-900">
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-4 dark:border-slate-400">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">SURAT JALAN</h2>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">PT REEVAL MANUFAKTUR</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
                <div>
                  <p className="text-xs text-slate-400">No. Surat Jalan:</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{previewDO.doNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">No. Order:</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{previewDO.salesOrderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Penerima:</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{previewDO.customerName}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{previewDO.customerAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Driver & Kendaraan:</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{previewDO.assignedDriverName}</p>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400">{previewDO.vehiclePlate}</p>
                </div>
              </div>

              <table className="w-full text-sm mb-5 border border-slate-300 dark:border-slate-600">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-xs">
                    <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left w-12">No</th>
                    <th className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-left">Item Barang</th>
                  </tr>
                </thead>
                <tbody>
                  {previewDO.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 dark:border-slate-600 px-3 py-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 dark:border-slate-600 px-3 py-2 font-medium">{item}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {previewDO.deliveryProofNote && (
                <div className="mb-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <p className="font-semibold mb-1">Catatan Serah Terima:</p>
                  <p>{previewDO.deliveryProofNote}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-6 text-center text-xs pt-4">
                <div>
                  <p className="text-slate-500 mb-10">Gudang,</p>
                  <p className="border-t border-slate-400 pt-1 font-medium">( .................... )</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-10">Driver,</p>
                  <p className="border-t border-slate-400 pt-1 font-medium">( {previewDO.assignedDriverName} )</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-10">Penerima,</p>
                  <p className="border-t border-slate-400 pt-1 font-medium">( {previewDO.customerName} )</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function DeliveryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Memuat Delivery...</div>}>
      <DeliveryContent />
    </Suspense>
  );
}
