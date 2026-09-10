'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp, initialOrderFormConfiguration } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatVariantLabel } from '@/lib/utils';
import type { Product, ProductVariantSKU, SalesOrderItem, SelectedModifierGroup } from '@/lib/types';
import regionsData from '@/lib/regions.json';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  Check,
  Search,
  Package,
  AlertCircle,
  FileText,
  BedDouble,
  Layers,
  Box
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = { BedDouble, Layers, Box };

function CreateOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const {
    salesOrders,
    products,
    attributes,
    productCategories,
    masterModifierGroups,
    createSalesOrder,
    updateSalesOrder,
    orderFormConfiguration,
    isCustomOrderFormEnabled,
    shippingRates,
    isShippingRateEnabled,
  } = useApp();

  const activeFormConfig = isCustomOrderFormEnabled ? orderFormConfiguration : initialOrderFormConfiguration;

  // Form States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Cart Order Items State
  const [orderItems, setOrderItems] = useState<SalesOrderItem[]>([]);

  // Custom Fields State (for dynamically added generic fields like dropdown, radio, etc)
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string | string[]>>({});

  // Catalog Modal State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Selected Product for Variant Attributes Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({});
  const [selectedModifiersState, setSelectedModifiersState] = useState<Record<string, string[]>>({});
  const [modalIsCustom, setModalIsCustom] = useState<boolean>(false);
  const [modalCustomNotes, setModalCustomNotes] = useState<string>('');

  // Derived state for Delivery Configuration Dropdowns
  const availableRegencies = React.useMemo(() => {
    if (!isShippingRateEnabled) return [];
    const rIds = Array.from(new Set(shippingRates.map(r => r.regencyId)));
    return regionsData.regencies.filter(r => rIds.includes(r.id));
  }, [isShippingRateEnabled, shippingRates]);

  const availableDistricts = React.useMemo(() => {
    if (!isShippingRateEnabled || !customerCity) return [];

    // Check if the selected city has a flat rate
    const hasFlatRate = shippingRates.some(r => r.regencyId === customerCity && r.isFlatCityRate);

    if (hasFlatRate) {
      // Return ALL districts for this regency
      return regionsData.districts.filter(d => d.regency_id === customerCity);
    } else {
      // Only return districts that have specific shipping rates configured
      const configuredDistrictIds = shippingRates
        .filter(r => r.regencyId === customerCity && r.districtId)
        .map(r => r.districtId);
      return regionsData.districts.filter(d => d.regency_id === customerCity && configuredDistrictIds.includes(d.id));
    }
  }, [isShippingRateEnabled, customerCity, shippingRates]);

  const calculatedShippingCost = React.useMemo(() => {
    if (!isShippingRateEnabled || !customerCity || !customerDistrict) return 0;

    // Check for flat rate first
    const flatRate = shippingRates.find(r => r.regencyId === customerCity && r.isFlatCityRate);
    if (flatRate) {
      return flatRate.rate;
    }

    // Otherwise look for specific district rate
    const districtRate = shippingRates.find(r => r.regencyId === customerCity && r.districtId === customerDistrict);
    return districtRate ? districtRate.rate : 0;
  }, [isShippingRateEnabled, customerCity, customerDistrict, shippingRates]);

  // Load existing order data if in edit mode
  useEffect(() => {
    if (editId) {
      const orderToEdit = salesOrders.find(o => o.id === editId);
      if (orderToEdit) {
        setCustomerName(orderToEdit.customer.name);
        let cleanPhone = (orderToEdit.customer.phone || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('62')) cleanPhone = cleanPhone.slice(2);
        cleanPhone = cleanPhone.replace(/^0+/, '');
        setCustomerPhone(cleanPhone);
        setCustomerAddress(orderToEdit.customer.address || '');
        setOrderNotes(orderToEdit.orderNotes || '');
        setOrderItems(orderToEdit.items);
      }
    }
  }, [editId, salesOrders]);

  const handlePhoneChange = (val: string) => {
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('62')) {
      digits = digits.slice(2);
    }
    digits = digits.replace(/^0+/, '');
    setCustomerPhone(digits);
  };

  // --- Handlers: Catalog & Variant Selection ---
  const openProductSelector = (product: Product) => {
    setSelectedProduct(product);
    // Initialize default attribute values with first value of each variant type
    const vts = product.variantTypes || [];
    const initialAttrs: Record<string, string> = {};
    vts.forEach(vt => {
      if (vt.values.length > 0) {
        initialAttrs[vt.name] = vt.values[0];
      }
    });
    setSelectedAttributeValues(initialAttrs);
    setSelectedModifiersState({});
    setModalIsCustom(false);
    setModalCustomNotes('');
  };

  // Find matching SKU based on selected attribute values
  const getMatchingVariant = React.useCallback((): ProductVariantSKU | undefined => {
    if (!selectedProduct) return undefined;
    return selectedProduct.variants.find(v => {
      return Object.entries(selectedAttributeValues).every(
        ([key, val]) => v.combination[key] === val
      );
    }) || selectedProduct.variants[0];
  }, [selectedProduct, selectedAttributeValues]);

  const calculatedModalUnitPrice = React.useMemo(() => {
    if (!selectedProduct) return 0;
    const matchingVariant = getMatchingVariant();
    const basePrice = matchingVariant ? matchingVariant.price : 0;

    let modifierPrice = 0;
    const productModifiers = selectedProduct.modifierGroupIds
      ? masterModifierGroups.filter(g => selectedProduct.modifierGroupIds?.includes(g.id))
      : [];

    if (productModifiers.length > 0) {
      productModifiers.forEach(group => {
        const selectedOptIds = selectedModifiersState[group.id] || [];
        const selectedOpts = group.options.filter(opt => selectedOptIds.includes(opt.id));
        modifierPrice += selectedOpts.reduce((sum, opt) => sum + opt.additionalPrice, 0);
      });
    }

    return basePrice + modifierPrice;
  }, [selectedProduct, getMatchingVariant, selectedModifiersState, masterModifierGroups]);

  const handleAddItemToCart = () => {
    if (!selectedProduct) return;
    const matchingVariant = getMatchingVariant();
    const basePrice = matchingVariant ? matchingVariant.price : 0;

    // Calculate modifier price
    let modifierPrice = 0;
    const selectedModifiersForOrder: SelectedModifierGroup[] = [];

    const productModifiers = selectedProduct.modifierGroupIds
      ? masterModifierGroups.filter(g => selectedProduct.modifierGroupIds?.includes(g.id))
      : [];

    if (productModifiers.length > 0) {
      productModifiers.forEach(group => {
        const selectedOptIds = selectedModifiersState[group.id] || [];
        const selectedOpts = group.options.filter(opt => selectedOptIds.includes(opt.id));

        if (selectedOpts.length > 0) {
          selectedModifiersForOrder.push({
            groupId: group.id,
            groupName: group.name,
            selectedOptions: selectedOpts.map(opt => ({
              optionId: opt.id,
              name: opt.name,
              additionalPrice: opt.additionalPrice,
              bom: opt.bom
            }))
          });
          modifierPrice += selectedOpts.reduce((sum, opt) => sum + opt.additionalPrice, 0);
        }
      });
    }

    const unitPrice = basePrice + modifierPrice;

    // Build attribute combo label as a sub-line string (values only: "160x200 cm • Midili")
    const attributeParts = Object.values(selectedAttributeValues);
    const variantSubLabel = attributeParts.join(' • ');

    const newItem: SalesOrderItem = {
      productId: selectedProduct.id,
      variantId: matchingVariant?.id,
      productName: selectedProduct.name, // Pure main product title
      variantLabel: variantSubLabel,    // Sub-line underneath title
      qty: 1,                           // Default 1 unit, quantity adjusted on cart
      unitPrice,
      selectedModifiers: selectedModifiersForOrder,
      isCustom: modalIsCustom,
      customNotes: modalCustomNotes.trim(),
    };

    setOrderItems(prev => [...prev, newItem]);

    // IMMEDIATELY CLOSE MODAL & CLEAR SELECTION
    setSelectedProduct(null);
    setShowCatalogModal(false);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemCustomToggle = (index: number, isCustom: boolean) => {
    setOrderItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, isCustom, customNotes: isCustom ? item.customNotes : '' };
      }
      return item;
    }));
  };

  const handleItemNotesChange = (index: number, notes: string) => {
    setOrderItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, customNotes: notes };
      }
      return item;
    }));
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    if (qty <= 0) return;
    setOrderItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, qty };
      }
      return item;
    }));
  };

  const handleCustomFieldChange = (id: string, value: string | string[]) => {
    setCustomFieldsData(prev => ({ ...prev, [id]: value }));
  };

  // Submit Sales Order
  const handleSubmitOrder = () => {
    setFormError('');
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setFormError('Data pelanggan (Nama, No. Telepon, dan Alamat Lengkap Pengiriman) wajib diisi.');
      return;
    }

    if (isShippingRateEnabled && (!customerCity || !customerDistrict)) {
      setFormError('Kota/Kabupaten dan Kecamatan pengiriman wajib dipilih.');
      return;
    }
    if (orderItems.length === 0) {
      setFormError('Keranjang pesanan masih kosong. Silakan tambah minimal 1 produk.');
      return;
    }


    // Validation: Dynamic Fields
    for (const container of activeFormConfig) {
      for (const field of container.fields) {
        if (['field-customer-name', 'field-customer-phone', 'field-customer-address', 'field-order-notes', 'field-product-list'].includes(field.id)) {
          continue; // Handled separately
        }
        if (field.isRequired) {
          const val = customFieldsData[field.id];
          if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && !val.trim())) {
            setFormError(`Field "${field.label}" wajib diisi.`);
            return;
          }
        }
      }
    }

    const finalPhone = `62${customerPhone.trim()}`;

    let finalAddress = customerAddress.trim();
    if (isShippingRateEnabled) {
      const cityName = regionsData.regencies.find(r => r.id === customerCity)?.name || '';
      const districtName = regionsData.districts.find(d => d.id === customerDistrict)?.name || '';
      if (cityName && districtName) {
        const suffix = `Kec. ${districtName}, ${cityName}`;
        if (!finalAddress.includes(suffix)) {
          finalAddress = finalAddress + (finalAddress.endsWith(',') ? ' ' : ', ') + suffix;
        }
      }
    }

    const customerObj = {
      name: customerName.trim(),
      phone: finalPhone,
      address: finalAddress
    };

    // Serialize custom fields into orderNotes
    let finalOrderNotes = orderNotes;
    const customFieldsEntries = Object.entries(customFieldsData);
    if (customFieldsEntries.length > 0) {
      finalOrderNotes += (finalOrderNotes ? '\n\n' : '') + '--- Informasi Tambahan ---\n';
      for (const [key, value] of customFieldsEntries) {
        // find label
        let label = key;
        for (const c of activeFormConfig) {
          const f = c.fields.find(x => x.id === key);
          if (f) label = f.label;
        }
        const strVal = Array.isArray(value) ? value.join(', ') : value;
        finalOrderNotes += `${label}: ${strVal}\n`;
      }
    }

    if (editId) {
      updateSalesOrder(editId, customerObj, orderItems, finalOrderNotes, calculatedShippingCost);
    } else {
      createSalesOrder(customerObj, orderItems, finalOrderNotes, calculatedShippingCost);
    }

    router.push('/order');
  };

  // Filter products for catalog picker
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const totalAmount = orderItems.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);

  const renderProductCart = () => (
    <div className="space-y-4 w-full">
      {orderItems.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">Keranjang pesanan masih kosong</p>
          <p className="text-xs text-slate-400 mt-1">Klik tombol "Tambah Produk" untuk memilih katalog produk dan variasi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderItems.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/50 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  {/* Line 1: Pure Main Product Title */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {item.productName}
                    </h4>
                  </div>

                  {/* Line 2: Distinct Sub-Line Underneath for Variant Attributes */}
                  {item.variantLabel && (
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700/60 inline-block">
                      {formatVariantLabel(item.variantLabel)}
                    </div>
                  )}

                  {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.selectedModifiers.map(mGroup => (
                        mGroup.selectedOptions.map(opt => (
                          <span key={opt.optionId} className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                            +{opt.name} ({formatCurrency(opt.additionalPrice)})
                          </span>
                        ))
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Qty controls */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleItemQtyChange(idx, item.qty - 1)}
                      className="px-2 py-0.5 font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded text-xs"
                    >
                      -
                    </button>
                    <span className="px-2 font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {item.qty} Unit
                    </span>
                    <button
                      type="button"
                      onClick={() => handleItemQtyChange(idx, item.qty + 1)}
                      className="px-2 py-0.5 font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded text-xs"
                    >
                      +
                    </button>
                  </div>

                  {/* Price Subtotal */}
                  <div className="text-right font-mono">
                    <div className="text-[11px] text-slate-400">@ {formatCurrency(item.unitPrice)}</div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {formatCurrency(item.unitPrice * item.qty)}
                    </div>
                  </div>

                  {/* Delete Item */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Hapus Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Always display Catatan Kustom Produk (Opsional) */}
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan Produk (Opsional)
                </label>
                <Input
                  type="text"
                  value={item.customNotes || ''}
                  onChange={e => handleItemNotesChange(idx, e.target.value)}
                  inputSize="sm"
                />
              </div>
            </div>
          ))}

        </div>
      )}
      <Button
        onClick={() => setShowCatalogModal(true)}
        size='sm'
        variant='outline'
      >
        <Plus className="h-4 w-4" />
        Tambah Produk
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        backHref="/order"
        title={editId ? "Edit Sales Order" : "Buat Sales Order Baru"}
      />

      {/* DYNAMIC FORM RENDERING */}
      {activeFormConfig.map((container) => {
        return (
          <div key={container.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            {container.title && container.title.trim().length > 0 && (
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                {container.title}
              </h3>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {container.fields.map(field => {
                const hasLabel = Boolean(field.label && field.label.trim().length > 0);
                const renderLabel = () => {
                  if (!hasLabel) return null;
                  return (
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                    </label>
                  );
                };

                if (field.type === 'product_list') {
                  return (
                    <div key={field.id} className="md:col-span-2">
                      {renderProductCart()}
                    </div>
                  );
                }

                if (field.id === 'field-customer-name') {
                  return (
                    <div key={field.id} className="md:col-span-1">
                      {renderLabel()}
                      <Input
                        type="text"
                        placeholder={field.placeholder}
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                      />
                    </div>
                  );
                }

                if (field.id === 'field-customer-phone') {
                  return (
                    <div key={field.id} className="md:col-span-1">
                      {renderLabel()}
                      <div className="flex items-center rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-colors shadow-xs">
                        <span className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-xs font-bold border-r border-slate-200 dark:border-slate-600 select-none">
                          +62
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder={field.placeholder}
                          value={customerPhone}
                          onChange={e => handlePhoneChange(e.target.value)}
                          className="w-full bg-transparent px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                }

                if (field.id === 'field-customer-address') {
                  return (
                    <React.Fragment key={field.id}>
                      {isShippingRateEnabled && (
                        <>
                          <div className="md:col-span-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                              Kota / Kabupaten <span className="text-red-500">*</span>
                            </label>
                            <Select
                              value={customerCity}
                              onChange={e => {
                                setCustomerCity(e.target.value);
                                setCustomerDistrict('');
                              }}
                            >
                              <option value="">-- Pilih Kota/Kab. --</option>
                              {availableRegencies.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </Select>
                          </div>
                          <div className="md:col-span-1">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                              Kecamatan <span className="text-red-500">*</span>
                            </label>
                            <Select
                              value={customerDistrict}
                              onChange={e => setCustomerDistrict(e.target.value)}
                              disabled={!customerCity}
                            >
                              <option value="">-- Pilih Kecamatan --</option>
                              {availableDistricts.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </Select>
                          </div>
                        </>
                      )}
                      <div className="md:col-span-2">
                        {renderLabel()}
                        <textarea
                          rows={2}
                          placeholder={field.placeholder}
                          value={customerAddress}
                          onChange={e => setCustomerAddress(e.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors shadow-xs"
                        />
                      </div>
                    </React.Fragment>
                  );
                }

                if (field.id === 'field-order-notes') {
                  return (
                    <div key={field.id} className="md:col-span-2">
                      {renderLabel()}
                      <textarea
                        rows={2}
                        placeholder={field.placeholder}
                        value={orderNotes}
                        onChange={e => setOrderNotes(e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors shadow-xs"
                      />
                    </div>
                  );
                }

                // Fallback generic field handling
                return (
                  <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : 'md:col-span-1'}>
                    {renderLabel()}
                    {field.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        placeholder={field.placeholder}
                        value={(customFieldsData[field.id] as string) || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors shadow-xs"
                      />
                    ) : field.type === 'dropdown' ? (
                      <Select
                        value={(customFieldsData[field.id] as string) || ''}
                        onChange={(e: any) => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full"
                      >
                        <option value="" disabled>{hasLabel ? `Pilih ${field.label}` : 'Pilih Opsi'}</option>
                        {field.options?.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </Select>
                    ) : field.type === 'checkbox' ? (
                      <div className="space-y-2">
                        {field.options?.map((opt, i) => {
                          const checkedArr = (customFieldsData[field.id] as string[]) || [];
                          return (
                            <label key={i} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                value={opt}
                                checked={checkedArr.includes(opt)}
                                onChange={(e: any) => {
                                  if (e.target.checked) {
                                    handleCustomFieldChange(field.id, [...checkedArr, opt]);
                                  } else {
                                    handleCustomFieldChange(field.id, checkedArr.filter(v => v !== opt));
                                  }
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={(customFieldsData[field.id] as string) || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {formError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900/60">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* SECTION 4: SUMMARY & SUBMIT FOOTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 w-1/3">
          {isShippingRateEnabled ? (
            <>
              <div className='flex w-full justify-between text-xs text-slate-500 dark:text-slate-400'>
                <span>Subtotal Produk ({orderItems.length} item)</span>
                <strong className="font-mono text-slate-700 dark:text-slate-200">{formatCurrency(totalAmount)}</strong>
              </div>
              <div className='flex w-full justify-between text-xs text-slate-500 dark:text-slate-400'>
                <span>Ongkos Kirim</span>
                <strong className="font-mono text-slate-700 dark:text-slate-200">{formatCurrency(calculatedShippingCost)}</strong>
              </div>
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Total Pesanan</span>
                <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(totalAmount + calculatedShippingCost)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col w-full">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total Pesanan</span>
              <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmitOrder}
          size='lg'
        >
          <Check className="h-4 w-4" />
          {editId ? "Simpan Perubahan" : "Buat Pesanan"}
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: MARKETPLACE CATALOG & INTERACTIVE VARIANT ATTRIBUTE SELECTOR */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showCatalogModal || !!selectedProduct}
        onClose={() => {
          setShowCatalogModal(false);
          setSelectedProduct(null);
        }}
        onBack={selectedProduct ? () => setSelectedProduct(null) : undefined}
        title={selectedProduct ? `Pilih Varian` : 'Katalog Produk'}
        size="lg"
      >
        {/* STEP A: CATALOG GRID / LIST PICKER */}
        {!selectedProduct && (
          <div className="space-y-4">
            {/* Search & Category Filter */}
            <div className="space-y-3">
              <Input
                icon={Search}
                type="text"
                placeholder="Cari nama produk atau kategori..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                containerClassName="w-full"
                inputSize="sm"
              />

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${selectedCategory === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                >
                  Semua
                </button>
                {productCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-all ${selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                  Tidak ada produk yang cocok dengan pencarian.
                </div>
              ) : (
                filteredProducts.map(prod => {
                  const IconComp = iconMap[prod.imageIcon || 'BedDouble'] || BedDouble;
                  const minPrice = Math.min(...prod.variants.map(v => v.price));
                  const maxPrice = Math.max(...prod.variants.map(v => v.price));
                  const priceStr = minPrice === maxPrice
                    ? formatCurrency(minPrice)
                    : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => openProductSelector(prod)}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/40 cursor-pointer transition-all flex items-start gap-3 group"
                    >
                      <div className="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 dark:bg-indigo-950 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                        <IconComp className="h-6 w-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {prod.category}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-indigo-600">
                          {prod.name}
                        </h4>
                        <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                          {priceStr}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP B: INTERACTIVE ATTRIBUTE-BY-ATTRIBUTE VARIANT SELECTOR */}
        {selectedProduct && (
          <div className="space-y-5">
            {/* Product Card Container (Without Pricelist) */}
            {(() => {
              const IconComp = iconMap[selectedProduct.imageIcon || 'BedDouble'] || BedDouble;
              return (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/40 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 dark:bg-indigo-950 dark:text-indigo-400">
                    <IconComp className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {selectedProduct.category}
                    </span>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                      {selectedProduct.name}
                    </h4>
                  </div>
                </div>
              );
            })()}

            {/* Render Variant Attributes One-by-One as Pill Buttons */}
            {(selectedProduct.variantTypes || []).map(vt => (
              <div key={vt.name} className="space-y-2">
                <label className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 block">
                  {vt.name}
                </label>

                <div className="flex flex-wrap gap-2">
                  {vt.values.map(val => {
                    const isSelected = selectedAttributeValues[vt.name] === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSelectedAttributeValues({ ...selectedAttributeValues, [vt.name]: val })}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Optional Modifiers Selection */}
            {selectedProduct.modifierGroupIds && selectedProduct.modifierGroupIds.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  Add-On (Opsional)
                </label>
                {masterModifierGroups
                  .filter(g => selectedProduct.modifierGroupIds?.includes(g.id))
                  .map(group => (
                    <div key={group.id} className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block">{group.name}</span>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map(opt => {
                          const currentSelected = selectedModifiersState[group.id] || [];
                          const isChecked = currentSelected.includes(opt.id);

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (group.selectType === 'SINGLE') {
                                  setSelectedModifiersState({ ...selectedModifiersState, [group.id]: isChecked ? [] : [opt.id] });
                                } else {
                                  const updated = isChecked
                                    ? currentSelected.filter(id => id !== opt.id)
                                    : [...currentSelected, opt.id];
                                  setSelectedModifiersState({ ...selectedModifiersState, [group.id]: updated });
                                }
                              }}
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${isChecked
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                            >
                              {opt.name} ({formatCurrency(opt.additionalPrice)})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Price Preview & Submit Button (No redundant Qty input in Modal!) */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="font-mono">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Harga Satuan</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-base">
                  {formatCurrency(calculatedModalUnitPrice)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setSelectedProduct(null)}>
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleAddItemToCart}
                >
                  Tambahkan ke Pesanan
                </Button>
              </div>
            </div>
          </div>
        )
        }
      </Modal >
    </div >
  );
}

export default function CreateSalesOrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat form sales order...</div>}>
      <CreateOrderContent />
    </Suspense>
  );
}
