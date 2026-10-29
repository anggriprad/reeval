'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useApp, initialOrderFormConfiguration } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSIONS } from '@/lib/permissions';
import { orderService, CreateSalesOrderRequest } from '@/services/order.service';
import { productService, mapProductOptionToProduct } from '@/services/product.service';
import { shippingRateService } from '@/services/shipping-rate.service';
import { productModifierService } from '@/services/product-modifier.service';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatVariantLabel } from '@/lib/utils';
import type {
  Product,
  ProductVariantSKU,
  SalesOrderItem,
  SelectedModifierGroup,
  FormContainer,
  FormField,
  ShippingRate,
  ProductModifierGroup,
} from '@/lib/types';
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
  Box,
  Armchair,
  Sofa,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Wrench,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  BedDouble,
  Layers,
  Box,
  Armchair,
  Sofa,
  Package,
  Lamp,
  Tv,
  Coffee,
  Hammer,
  Wrench,
  Frame,
  Palette,
  Scissors,
  Shield,
  Tag,
  ShoppingBag,
  Archive,
  FolderTree,
  Sparkles,
};

export function CreateOrderContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const targetListHref = '/order';
  const { toast } = useToast();
  const { can } = usePermission();

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
    updateOrderFormConfiguration,
    setIsCustomOrderFormEnabled,
    shippingRates,
    isShippingRateEnabled,
    setIsShippingRateEnabled,
  } = useApp();

  const [dynamicFormConfig, setDynamicFormConfig] = useState<FormContainer[]>([]);
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [loadedShippingRates, setLoadedShippingRates] = useState<ShippingRate[]>([]);
  const [serverShippingRateEnabled, setServerShippingRateEnabled] = useState<boolean | null>(null);
  const [apiModifierGroups, setApiModifierGroups] = useState<ProductModifierGroup[]>([]);

  // Fetch latest dynamic form template & shipping rate config from server
  useEffect(() => {
    orderService
      .getOrderConfig()
      .then((res) => {
        if (res.success && res.data) {
          setIsCustomOrderFormEnabled(res.data.is_custom_form_enabled);
          if (res.data.form_containers && res.data.form_containers.length > 0) {
            setDynamicFormConfig(res.data.form_containers as any);
            updateOrderFormConfiguration(res.data.form_containers as any);
          }
          if (typeof res.data.is_shipping_rate_enabled === 'boolean') {
            const isEnabled = res.data.is_shipping_rate_enabled;
            setServerShippingRateEnabled(isEnabled);
            setIsShippingRateEnabled(isEnabled);
            if (isEnabled) {
              shippingRateService
                .getOverview()
                .then((srRes) => {
                  if (srRes.success && srRes.data?.configured_areas) {
                    const flattened: ShippingRate[] = [];
                    srRes.data.configured_areas.forEach((area) => {
                      if (area.is_flat_city_rate) {
                        flattened.push({
                          id: `rate-${area.regency_id}`,
                          provinceId: area.province_id,
                          provinceName: area.province_name,
                          regencyId: area.regency_id,
                          regencyName: area.regency_name,
                          rate: area.flat_rate,
                          isFlatCityRate: true,
                        });
                      }
                      if (area.district_rates && area.district_rates.length > 0) {
                        area.district_rates.forEach((dr) => {
                          flattened.push({
                            id: `rate-${area.regency_id}-${dr.district_id}`,
                            provinceId: area.province_id,
                            provinceName: area.province_name,
                            regencyId: area.regency_id,
                            regencyName: area.regency_name,
                            districtId: dr.district_id,
                            districtName: dr.district_name,
                            rate: dr.rate,
                            isFlatCityRate: false,
                          });
                        });
                      }
                    });
                    setLoadedShippingRates(flattened);
                  }
                })
                .catch((err) => {
                  console.warn('Gagal memuat shipping rates overview:', err);
                });
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat template order config dari backend:', err);
      });
  }, [setIsCustomOrderFormEnabled, updateOrderFormConfiguration, setIsShippingRateEnabled]);

  // Fetch product options directly from API /product/products/options & modifier groups
  useEffect(() => {
    productService
      .getProductOptions()
      .then((res) => {
        if (res.success && res.data) {
          const mapped = res.data.map(mapProductOptionToProduct);
          setApiProducts(mapped);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat produk options dari backend:', err);
      });

    productModifierService
      .getGroups({ per_page: 100 })
      .then((res) => {
        if (res.success && res.data) {
          const mapped: ProductModifierGroup[] = res.data.map((g) => {
            const groupOptions = g.options || [];
            return {
              id: String(g.id),
              name: g.name,
              selectType: g.select_type as 'SINGLE' | 'MULTI',
              minSelect: g.select_type === 'SINGLE' ? 1 : 0,
              maxSelect: g.select_type === 'SINGLE' ? 1 : groupOptions.length,
              isRequired: false,
              isActive: true,
              options: groupOptions.map((opt) => ({
                id: String(opt.id),
                name: opt.name,
                additionalPrice: opt.additional_price,
                bom: (opt.bom || []).map((b) => ({
                  materialId: String(b.material_id),
                  qty: b.quantity,
                })),
              })),
            };
          });
          setApiModifierGroups(mapped);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat modifier groups dari backend:', err);
      });
  }, []);

  const effectiveShippingRateEnabled =
    serverShippingRateEnabled !== null ? serverShippingRateEnabled : isShippingRateEnabled;
  const effectiveShippingRates =
    loadedShippingRates.length > 0 ? loadedShippingRates : shippingRates;
  const availableProducts = apiProducts.length > 0 ? apiProducts : products;
  const availableModifierGroups =
    apiModifierGroups.length > 0 ? apiModifierGroups : masterModifierGroups;

  const availableCategories = React.useMemo(() => {
    const cats = new Set<string>();
    availableProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    productCategories.forEach((c) => cats.add(c));
    return Array.from(cats);
  }, [availableProducts, productCategories]);

  const activeFormConfig =
    isCustomOrderFormEnabled && dynamicFormConfig.length > 0
      ? dynamicFormConfig
      : orderFormConfiguration && orderFormConfiguration.length > 0
      ? orderFormConfiguration
      : initialOrderFormConfiguration;

  // Form States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!effectiveShippingRateEnabled) return [];
    const rIds = Array.from(new Set(effectiveShippingRates.map(r => r.regencyId)));
    return regionsData.regencies.filter(r => rIds.includes(r.id));
  }, [effectiveShippingRateEnabled, effectiveShippingRates]);

  const availableDistricts = React.useMemo(() => {
    if (!effectiveShippingRateEnabled || !customerCity) return [];

    // Check if the selected city has a flat rate
    const hasFlatRate = effectiveShippingRates.some(r => r.regencyId === customerCity && r.isFlatCityRate);

    if (hasFlatRate) {
      // Return ALL districts for this regency
      return regionsData.districts.filter(d => d.regency_id === customerCity);
    } else {
      // Only return districts that have specific shipping rates configured
      const configuredDistrictIds = effectiveShippingRates
        .filter(r => r.regencyId === customerCity && r.districtId)
        .map(r => r.districtId);
      return regionsData.districts.filter(d => d.regency_id === customerCity && configuredDistrictIds.includes(d.id));
    }
  }, [effectiveShippingRateEnabled, customerCity, effectiveShippingRates]);

  const calculatedShippingCost = React.useMemo(() => {
    if (!effectiveShippingRateEnabled || !customerCity || !customerDistrict) return 0;

    // Check for flat rate first
    const flatRate = effectiveShippingRates.find(r => r.regencyId === customerCity && r.isFlatCityRate);
    if (flatRate) {
      return flatRate.rate;
    }

    // Otherwise look for specific district rate
    const districtRate = effectiveShippingRates.find(r => r.regencyId === customerCity && r.districtId === customerDistrict);
    return districtRate ? districtRate.rate : 0;
  }, [effectiveShippingRateEnabled, customerCity, customerDistrict, effectiveShippingRates]);

  // Load existing order data if in edit mode (from backend or fallback to local salesOrders)
  useEffect(() => {
    if (!editId) return;

    const populateForm = (orderToEdit: { customer: { name: string; phone?: string; address?: string; city?: string; district?: string }; orderNotes?: string; items: SalesOrderItem[] }) => {
      setCustomerName(orderToEdit.customer.name);
      let cleanPhone = (orderToEdit.customer.phone || '').replace(/\D/g, '');
      if (cleanPhone.startsWith('62')) cleanPhone = cleanPhone.slice(2);
      cleanPhone = cleanPhone.replace(/^0+/, '');
      setCustomerPhone(cleanPhone);
      setCustomerAddress(orderToEdit.customer.address || '');
      if (orderToEdit.customer.city) {
        const reg = regionsData.regencies.find(r => r.id === orderToEdit.customer.city || r.name.toLowerCase() === orderToEdit.customer.city?.toLowerCase());
        if (reg) setCustomerCity(reg.id);
      }
      if (orderToEdit.customer.district) {
        const dist = regionsData.districts.find(d => d.id === orderToEdit.customer.district || d.name.toLowerCase() === orderToEdit.customer.district?.toLowerCase());
        if (dist) setCustomerDistrict(dist.id);
      }
      setOrderNotes(orderToEdit.orderNotes || '');
      setOrderItems(orderToEdit.items);
    };

    orderService.getOrderById(editId)
      .then(res => {
        if (res.success && res.data) {
          const mappedItems: SalesOrderItem[] = (res.data.items || []).map(itm => ({
            productId: String(itm.product_id),
            variantId: itm.variant_id ? String(itm.variant_id) : undefined,
            productName: itm.product_name,
            variantLabel: itm.variant_label,
            qty: itm.qty,
            unitPrice: itm.unit_price,
            selectedModifiers: typeof itm.selected_modifiers === 'string' ? JSON.parse(itm.selected_modifiers) : (itm.selected_modifiers || []),
            isCustom: Boolean(itm.is_custom),
            customNotes: itm.custom_notes || '',
          }));
          populateForm({
            customer: {
              name: res.data.customer_name,
              phone: res.data.customer_phone,
              address: res.data.customer_address,
              city: res.data.customer_city_name || res.data.customer_city_id,
              district: res.data.customer_district_name || res.data.customer_district_id,
            },
            orderNotes: res.data.order_notes,
            items: mappedItems,
          });
          if (res.data.custom_fields && typeof res.data.custom_fields === 'object') {
            setCustomFieldsData(res.data.custom_fields as any);
          }
        }
      })
      .catch(() => {
        const orderToEdit = salesOrders.find(o => o.id === editId);
        if (orderToEdit) {
          populateForm(orderToEdit);
        }
      });
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
    // User requested NO default attribute values selected initially
    setSelectedAttributeValues({});
    setSelectedModifiersState({});
    setModalIsCustom(false);
    setModalCustomNotes('');
  };

  const isAllAttributesSelected = React.useMemo(() => {
    if (!selectedProduct) return false;
    const vts = selectedProduct.variantTypes || [];
    if (vts.length === 0) return true;
    return vts.every(vt => Boolean(selectedAttributeValues[vt.name]));
  }, [selectedProduct, selectedAttributeValues]);

  // Find matching SKU based on selected attribute values
  const getMatchingVariant = React.useCallback((): ProductVariantSKU | undefined => {
    if (!selectedProduct || !isAllAttributesSelected) return undefined;
    return selectedProduct.variants.find(v => {
      return Object.entries(selectedAttributeValues).every(
        ([key, val]) => v.combination[key] === val
      );
    });
  }, [selectedProduct, isAllAttributesSelected, selectedAttributeValues]);

  const calculatedModalUnitPrice = React.useMemo(() => {
    if (!selectedProduct) return 0;
    const matchingVariant = getMatchingVariant();
    const basePrice = matchingVariant 
      ? matchingVariant.price 
      : Math.min(...(selectedProduct.variants?.map(v => v.price) || [0]));

    let modifierPrice = 0;
    const productModifiers = selectedProduct.modifierGroupIds
      ? availableModifierGroups.filter(g => selectedProduct.modifierGroupIds?.includes(g.id))
      : [];

    if (productModifiers.length > 0) {
      productModifiers.forEach(group => {
        const selectedOptIds = selectedModifiersState[group.id] || [];
        const selectedOpts = group.options.filter(opt => selectedOptIds.includes(opt.id));
        modifierPrice += selectedOpts.reduce((sum, opt) => sum + opt.additionalPrice, 0);
      });
    }

    return basePrice + modifierPrice;
  }, [selectedProduct, getMatchingVariant, selectedModifiersState, availableModifierGroups]);

  const handleAddItemToCart = () => {
    if (!selectedProduct || !isAllAttributesSelected) return;
    const matchingVariant = getMatchingVariant();
    if (!matchingVariant && (selectedProduct.variantTypes || []).length > 0) return;
    const basePrice = matchingVariant ? matchingVariant.price : 0;

    // Calculate modifier price
    let modifierPrice = 0;
    const selectedModifiersForOrder: SelectedModifierGroup[] = [];

    const productModifiers = selectedProduct.modifierGroupIds
      ? availableModifierGroups.filter(g => selectedProduct.modifierGroupIds?.includes(g.id))
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
  const handleSubmitOrder = async () => {
    setFormError('');
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setFormError('Data pelanggan (Nama, No. Telepon, dan Alamat Lengkap Pengiriman) wajib diisi.');
      return;
    }

    if (effectiveShippingRateEnabled && (!customerCity || !customerDistrict)) {
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
    let selectedCityName = '';
    let selectedDistrictName = '';
    if (effectiveShippingRateEnabled) {
      const cityName = regionsData.regencies.find(r => r.id === customerCity)?.name || customerCity || '';
      const districtName = regionsData.districts.find(d => d.id === customerDistrict)?.name || customerDistrict || '';
      selectedCityName = cityName;
      selectedDistrictName = districtName;
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
      address: finalAddress,
      city: selectedCityName || undefined,
      district: selectedDistrictName || undefined,
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
          const f = c.fields.find((x: FormField) => x.id === key);
          if (f) label = f.label;
        }
        const strVal = Array.isArray(value) ? value.join(', ') : value;
        finalOrderNotes += `${label}: ${strVal}\n`;
      }
    }

    const payloadItems = orderItems.map((item) => ({
      product_id: Number(item.productId) || 1,
      variant_id: item.variantId ? Number(item.variantId) : null,
      product_name: item.productName,
      variant_label: item.variantLabel || '',
      qty: item.qty,
      unit_price: item.unitPrice,
      selected_modifiers: item.selectedModifiers || [],
      is_custom: Boolean(item.isCustom),
      custom_notes: item.customNotes || '',
    }));

    const orderPayload: CreateSalesOrderRequest = {
      customer_name: customerObj.name,
      customer_phone: customerObj.phone,
      customer_address: customerObj.address,
      customer_city_id: customerCity || undefined,
      customer_city_name: selectedCityName || undefined,
      customer_district_id: customerDistrict || undefined,
      customer_district_name: selectedDistrictName || undefined,
      shipping_cost: calculatedShippingCost,
      order_notes: finalOrderNotes,
      custom_fields: customFieldsData,
      items: payloadItems,
    };

    setIsSubmitting(true);
    try {
      if (editId) {
        const res = await orderService.updateOrder(editId, orderPayload);
        if (res.success) {
          toast.success('Pesanan Diperbarui', 'Data sales order berhasil diperbarui.');
          updateSalesOrder(editId, customerObj, orderItems, finalOrderNotes, calculatedShippingCost);
          router.push(targetListHref);
          return;
        } else {
          setFormError(res.message || 'Gagal memperbarui pesanan');
        }
      } else {
        const res = await orderService.createOrder(orderPayload);
        if (res.success) {
          toast.success('Pesanan Dibuat', `Sales order ${res.data?.order_number || ''} berhasil dibuat.`);
          createSalesOrder(customerObj, orderItems, finalOrderNotes, calculatedShippingCost);
          router.push(targetListHref);
          return;
        } else {
          setFormError(res.message || 'Gagal membuat pesanan');
        }
      }
    } catch (err: any) {
      console.warn('Backend order call failed, syncing local mock:', err);
      if (editId) {
        updateSalesOrder(editId, customerObj, orderItems, finalOrderNotes, calculatedShippingCost);
      } else {
        createSalesOrder(customerObj, orderItems, finalOrderNotes, calculatedShippingCost);
      }
      toast.success(editId ? 'Pesanan Diperbarui' : 'Pesanan Dibuat', 'Pesanan berhasil disimpan.');
      router.push(targetListHref);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products for catalog picker
  const filteredProducts = availableProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const totalAmount = orderItems.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);

  const renderProductCart = () => (
    <div className="space-y-4 w-full">
      {orderItems.length === 0 ? (
        <div className="p-8 sm:p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm sm:text-xs">Keranjang pesanan masih kosong</p>
          <p className="text-xs text-slate-400 mt-1">Klik tombol &quot;Tambah Produk&quot; untuk memilih katalog produk dan variasi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderItems.map((item, idx) => {
            const product = availableProducts.find(p => p.id === item.productId || p.name === item.productName);
            const IconComp = iconMap[product?.imageIcon || 'BedDouble'] || BedDouble;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/50 shadow-sm space-y-3"
              >
                {/* DESKTOP LAYOUT (sm:grid hidden on mobile, visible on desktop) */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center gap-4">
                  {/* Left: Product Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    {product?.image ? (
                      <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                        <img src={product.image} alt={item.productName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                        <IconComp className="h-6 w-6" />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {item.productName}
                      </h4>

                      {item.variantLabel && (
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-100 dark:border-slate-700/60 inline-block">
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
                  </div>

                  {/* Middle (Desktop): Action Qty - diposisikan tepat di tengah card */}
                  <div className="flex justify-center px-2">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(idx, item.qty - 1)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 transition-all text-sm cursor-pointer"
                        title="Kurangi Kuantitas"
                      >
                        -
                      </button>
                      <span className="min-w-[48px] text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(idx, item.qty + 1)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95 transition-all text-sm cursor-pointer"
                        title="Tambah Kuantitas"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Right (Desktop): Total Price (hanya harga total setelah dikali qty) + Delete button */}
                  <div className="flex items-center justify-end gap-4 min-w-0">
                    <div className="text-right font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(item.unitPrice * item.qty)}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer shrink-0"
                      title="Hapus Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* MOBILE LAYOUT (sm:hidden, visible on mobile) */}
                <div className="sm:hidden space-y-3">
                  {/* Baris 1: Product image/icon, Nama item, Nama varian, dan Icon button hapus di pojok kanan */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {product?.image ? (
                        <div className="h-11 w-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800">
                          <img src={product.image} alt={item.productName} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-11 w-11 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                          <IconComp className="h-5 w-5" />
                        </div>
                      )}

                      <div className="space-y-1 min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {item.productName}
                        </h4>

                        {item.variantLabel && (
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700/60 inline-block truncate max-w-full">
                            {formatVariantLabel(item.variantLabel)}
                          </div>
                        )}

                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.selectedModifiers.map(mGroup => (
                              mGroup.selectedOptions.map(opt => (
                                <span key={opt.optionId} className="text-[11.5px] bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                                  +{opt.name} ({formatCurrency(opt.additionalPrice)})
                                </span>
                              ))
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pojok Kanan: Icon button hapus */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 -mr-1.5 -mt-1 text-slate-400 hover:text-red-600 active:text-red-600 rounded-lg hover:bg-red-50 active:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 touch-manipulation cursor-pointer"
                      title="Hapus Item"
                      aria-label="Hapus Item"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Baris 2: Action button kuantitas di kiri & Nominal total harga di kanan (menghemat 1 baris) */}
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(idx, item.qty - 1)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 shadow-xs active:scale-95 transition-all text-base touch-manipulation cursor-pointer"
                        title="Kurangi Kuantitas"
                        aria-label="Kurangi Kuantitas"
                      >
                        -
                      </button>
                      <span className="min-w-[44px] text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(idx, item.qty + 1)}
                        className="h-9 w-9 flex items-center justify-center rounded-lg font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 shadow-xs active:scale-95 transition-all text-base touch-manipulation cursor-pointer"
                        title="Tambah Kuantitas"
                        aria-label="Tambah Kuantitas"
                      >
                        +
                      </button>
                    </div>

                    {/* Nominal Total Harga tanpa label "Total Harga" */}
                    <span className="font-mono font-extrabold text-base text-slate-900 dark:text-white shrink-0">
                      {formatCurrency(item.unitPrice * item.qty)}
                    </span>
                  </div>
                </div>

                {/* Always display Catatan Kustom Produk (Opsional) */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <Textarea
                    autoResize
                    rows={1}
                    inputSize="sm"
                    placeholder="Catatan produk (opsional)"
                    value={item.customNotes || ''}
                    onChange={e => handleItemNotesChange(idx, e.target.value)}
                  />
                </div>
            </div>
          );
        })}

        </div>
      )}
      <Button
        onClick={() => setShowCatalogModal(true)}
        variant="outline-primary"
        className="w-full md:w-auto"
      >
        <Plus className="h-4 w-4" />
        Tambah Produk
      </Button>
    </div>
  );

  return (
    <div className="space-y-5 md:space-y-6 max-w-5xl mx-auto max-md:-mx-4 max-md:-mt-4 pb-4 md:pb-8">
      <PageHeader
        backHref={targetListHref}
        title={editId ? "Edit Pesanan" : "Buat Pesanan"}
      />

      {/* DYNAMIC FORM RENDERING */}
      {activeFormConfig.map((container) => {
        return (
          <Card key={container.id} noRounded="mobile" className="p-4 sm:p-6 space-y-5 sm:space-y-4">
            {container.title && container.title.trim().length > 0 && (
              <h3 className="font-bold text-base sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                {container.title}
              </h3>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-4">
              {container.fields.map((field: FormField) => {
                const hasLabel = Boolean(field.label && field.label.trim().length > 0);

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
                      <Input
                        label={hasLabel ? field.label : undefined}
                        required={field.isRequired}
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
                      <Input
                        label={hasLabel ? field.label : undefined}
                        required={field.isRequired}
                        type="text"
                        inputMode="numeric"
                        prefix="+62"
                        placeholder={field.placeholder}
                        value={customerPhone}
                        onChange={e => handlePhoneChange(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  );
                }

                if (field.id === 'field-customer-address') {
                  return (
                    <React.Fragment key={field.id}>
                      {effectiveShippingRateEnabled && (
                        <>
                          <div className="md:col-span-1">
                            <Select
                              label="Kota / Kabupaten"
                              required
                              value={customerCity}
                              onChange={e => {
                                setCustomerCity(e.target.value);
                                setCustomerDistrict('');
                              }}
                            >
                              <option value="" disabled></option>
                              {availableRegencies.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </Select>
                          </div>
                          <div className="md:col-span-1">
                            <Select
                              label="Kecamatan"
                              required
                              value={customerDistrict}
                              onChange={e => setCustomerDistrict(e.target.value)}
                              disabled={!customerCity}
                            >
                              <option value="" disabled></option>
                              {availableDistricts.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </Select>
                          </div>
                        </>
                      )}
                      <div className="md:col-span-2">
                        <Textarea
                          label={hasLabel ? field.label : undefined}
                          required={field.isRequired}
                          rows={3}
                          placeholder={field.placeholder}
                          value={customerAddress}
                          onChange={e => setCustomerAddress(e.target.value)}
                        />
                      </div>
                    </React.Fragment>
                  );
                }

                if (field.id === 'field-order-notes') {
                  return (
                    <div key={field.id} className="md:col-span-2">
                      <Textarea
                        label={hasLabel ? field.label : undefined}
                        required={field.isRequired}
                        rows={3}
                        placeholder={field.placeholder}
                        value={orderNotes}
                        onChange={e => setOrderNotes(e.target.value)}
                      />
                    </div>
                  );
                }

                // Fallback generic field handling
                return (
                  <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : 'md:col-span-1'}>
                    {field.type === 'textarea' ? (
                      <Textarea
                        label={hasLabel ? field.label : undefined}
                        required={field.isRequired}
                        rows={3}
                        placeholder={field.placeholder}
                        value={(customFieldsData[field.id] as string) || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                      />
                    ) : field.type === 'dropdown' ? (
                      <Select
                        label={hasLabel ? field.label : undefined}
                        required={field.isRequired}
                        value={(customFieldsData[field.id] as string) || ''}
                        onChange={(e: any) => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full"
                      >
                        <option value="" disabled></option>
                        {field.options?.map((opt: string, i: number) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </Select>
                    ) : field.type === 'checkbox' ? (
                      <div>
                        {hasLabel && (
                          <label className="mb-2 md:mb-1.5 block text-[13px] md:text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {field.label} {field.isRequired && <span className="ml-1 text-red-500 font-bold">*</span>}
                          </label>
                        )}
                        <div className="space-y-2">
                          {field.options?.map((opt: string, i: number) => {
                            const checkedArr = (customFieldsData[field.id] as string[]) || [];
                            return (
                              <Checkbox
                                key={i}
                                label={opt}
                                checked={checkedArr.includes(opt)}
                                onChange={(checked) => {
                                  if (checked) {
                                    handleCustomFieldChange(field.id, [...checkedArr, opt]);
                                  } else {
                                    handleCustomFieldChange(field.id, checkedArr.filter(v => v !== opt));
                                  }
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <Input
                        label={hasLabel ? field.label : undefined}
                        required={field.isRequired}
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
          </Card>
        );
      })}

      {formError && (
        <div className="mx-4 md:mx-0 flex items-center gap-3 rounded-xl bg-red-50 p-3.5 text-[13.5px] md:text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900/60">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* SECTION 4: SUMMARY & SUBMIT FOOTER */}
      <div className="mt-8 md:mt-10 px-4 md:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent border-0 shadow-none">
        <div className="space-y-1.5 w-full sm:w-auto sm:min-w-[280px]">
          {effectiveShippingRateEnabled ? (
            <>
              <div className='flex w-full justify-between text-[13.5px] sm:text-xs text-slate-500 dark:text-slate-400'>
                <span>Subtotal Produk ({orderItems.length} item)</span>
                <strong className="font-mono text-slate-700 dark:text-slate-200">{formatCurrency(totalAmount)}</strong>
              </div>
              <div className='flex w-full justify-between text-[13.5px] sm:text-xs text-slate-500 dark:text-slate-400'>
                <span>Ongkos Kirim</span>
                <strong className="font-mono text-slate-700 dark:text-slate-200">{formatCurrency(calculatedShippingCost)}</strong>
              </div>
              <div className="flex w-full items-center justify-between pt-1">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Total Pesanan</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(totalAmount + calculatedShippingCost)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-row items-center justify-between md:flex-col md:items-start w-full">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total Pesanan</span>
              <span className="text-lg sm:text-xl md:text-2xl font-bold md:font-black font-mono text-indigo-600 dark:text-indigo-400">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmitOrder}
          size="lg"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
        >
          <Check className="h-4 w-4" />
          {isSubmitting ? 'Menyimpan...' : editId ? "Simpan Perubahan" : "Buat Pesanan"}
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
        mobileBottomSheet
        sheetHeight="full"
        actions={
          selectedProduct ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
              {/* Informasi Harga Satuan: di atas tombol aksi pada mobile, di kiri pada desktop */}
              <div className="flex items-center justify-between sm:flex-col sm:items-start font-mono">
                <span className="text-xs sm:text-[11px] text-slate-500 dark:text-slate-400 font-sans font-medium">
                  Harga Satuan
                </span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-lg sm:text-base">
                  {isAllAttributesSelected ? formatCurrency(calculatedModalUnitPrice) : '-'}
                </span>
              </div>

              {/* Tombol Aksi: diletakkan di paling bawah pada mobile, di kanan pada desktop */}
              <div className="w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={handleAddItemToCart}
                  disabled={!isAllAttributesSelected}
                  className="w-full sm:w-auto"
                >
                  Tambahkan ke Pesanan
                </Button>
              </div>
            </div>
          ) : undefined
        }
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
              />

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3.5 py-2 md:px-3 md:py-1 text-[13px] md:text-xs font-semibold rounded-xl md:rounded-lg shrink-0 transition-all cursor-pointer ${selectedCategory === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                >
                  Semua
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 md:px-3 md:py-1 text-[13px] md:text-xs font-semibold rounded-xl md:rounded-lg shrink-0 transition-all cursor-pointer ${selectedCategory === cat
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-0.5">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-400 text-[13.5px] md:text-xs">
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
                      {prod.image ? (
                        <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform">
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 dark:bg-indigo-950 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                          <IconComp className="h-6 w-6" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {prod.category}
                        </span>
                        <h4 className="font-bold text-sm md:text-xs text-slate-900 dark:text-white truncate group-hover:text-indigo-600">
                          {prod.name}
                        </h4>
                        <div className="text-[13.5px] md:text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
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
                  {selectedProduct.image ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 dark:bg-indigo-950 dark:text-indigo-400">
                      <IconComp className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {selectedProduct.category}
                    </span>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                      {selectedProduct.name}
                    </h4>
                  </div>
                </div>
              );
            })()}

            {/* Render Variant Attributes One-by-One with Swatch Images Preview if Available */}
            {(selectedProduct.variantTypes || []).map(vt => {
              const matchedMasterAttr = attributes.find(a => a.name.trim().toLowerCase() === vt.name.trim().toLowerCase());
              const hasAnyImage = vt.values.some(val => Boolean(vt.valueImages?.[val] || matchedMasterAttr?.valueImages?.[val]));

              return (
                <div key={vt.name} className="space-y-2">
                  <div>
                    <label className="text-[13px] sm:text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 block">
                      {vt.name}
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {vt.values.map(val => {
                      const isSelected = selectedAttributeValues[vt.name] === val;
                      const imgUrl = vt.valueImages?.[val] || matchedMasterAttr?.valueImages?.[val];

                      if (hasAnyImage) {
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setSelectedAttributeValues({ ...selectedAttributeValues, [vt.name]: val })}
                            className={`group relative flex flex-col items-center p-2.5 sm:p-2 rounded-xl border-2 transition-all text-center min-w-[84px] sm:min-w-[88px] max-w-[120px] ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-100'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            {/* Preview Gambar Atribut di atas label */}
                            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 shrink-0 mb-1.5 flex items-center justify-center">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={val}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                  <ImageIcon className="h-5 w-5" />
                                  <span className="text-[10px] mt-0.5">Polos</span>
                                </div>
                              )}
                            </div>

                            {/* Label Pilihan Atribut */}
                            <span className="text-sm sm:text-xs font-semibold leading-tight line-clamp-2 break-words">
                              {val}
                            </span>

                            {/* Active Check Indicator */}
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 h-4 w-4 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm z-10">
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSelectedAttributeValues({ ...selectedAttributeValues, [vt.name]: val })}
                          className={`px-4 py-2.5 sm:px-3.5 sm:py-1.5 text-sm sm:text-xs font-semibold rounded-xl border transition-all min-h-[42px] sm:min-h-0 flex items-center justify-center active:scale-95 touch-manipulation ${
                            isSelected
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
              );
            })}

            {/* Optional Modifiers Selection */}
            {selectedProduct.modifierGroupIds && selectedProduct.modifierGroupIds.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  Add-On (Opsional)
                </label>
                {availableModifierGroups
                  .filter(g => selectedProduct.modifierGroupIds?.includes(g.id))
                  .map(group => (
                    <div key={group.id} className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3 sm:p-2.5 rounded-xl">
                      <span className="text-xs sm:text-[11px] font-semibold text-slate-500 uppercase block">{group.name}</span>
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
                              className={`px-3.5 py-2 sm:px-2.5 sm:py-1 text-[13px] sm:text-xs font-medium rounded-xl sm:rounded-lg border transition-all min-h-[40px] sm:min-h-0 flex items-center cursor-pointer ${isChecked
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
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function CreateSalesOrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat form sales order...</div>}>
      <CreateOrderContent />
    </Suspense>
  );
}
