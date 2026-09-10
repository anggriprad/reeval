const fs = require('fs');
const path = 'c:/Users/Dell i7/Documents/My Documents/Reeval/erp-reeval/src/app/order/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add ChevronDown, ChevronUp to lucide-react imports
if (!content.includes('ChevronDown')) {
    content = content.replace('AlertCircle', 'AlertCircle,\n  ChevronDown,\n  ChevronUp');
}

// 2. Add expandedOrders state
if (!content.includes('const [expandedOrders')) {
    content = content.replace(
      "const [errorMsg, setErrorMsg] = useState('');",
      "const [errorMsg, setErrorMsg] = useState('');\n  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});\n\n  const toggleExpandOrder = (id: string) => {\n    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));\n  };"
    );
}

// 3. Rewrite the Card rendering block.
const oldCardStart = content.indexOf('<Card key={order.id} className="hover:border-slate-300 dark:hover:border-slate-600 transition-colors relative">');
const oldCardEnd = content.indexOf('</Card>', oldCardStart) + '</Card>'.length;

const newCardCode = `<Card key={order.id} className="hover:border-slate-300 dark:hover:border-slate-600 transition-colors relative p-0 overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col gap-4">
                  {/* TOP SECTION: Header (Order Number & Status) + Dates & Sales (Top Right) */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                          {order.orderNumber}
                        </span>
                        <Badge className={getOrderStatusColor(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="flex flex-col text-xs text-slate-500 dark:text-slate-400 mt-1.5 space-y-1">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {order.customer.name} {order.customer.phone ? \`(\${order.customer.phone})\` : ''}
                        </span>
                        {order.customer.address && (
                          <span className="pl-5 text-[11px] text-slate-500 leading-tight">
                            {order.customer.address}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-left sm:text-right text-xs text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50 min-w-[140px]">
                      <div className="block"><span className="font-semibold text-slate-700 dark:text-slate-300">Tanggal:</span> {formatDate(order.createdAt)}</div>
                      <div className="block"><span className="font-semibold text-slate-700 dark:text-slate-300">Sales:</span> {order.createdBy}</div>
                    </div>
                  </div>

                  {order.status === 'CANCELED' && order.cancelReason && (
                    <div className="text-xs text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 p-2.5 rounded-lg border border-red-100 dark:border-red-900/50">
                      <span className="font-bold">Alasan Pembatalan:</span> {order.cancelReason}
                    </div>
                  )}

                  {/* MIDDLE SECTION: Order Items */}
                  <div className="space-y-2">
                    {order.items.slice(0, expandedOrders[order.id] ? order.items.length : 1).map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-start justify-between text-xs text-slate-700 dark:text-slate-300 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <div className="flex-1 space-y-1">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-500">{item.qty}x</span>
                            {item.productName}
                            {item.isCustom && (
                              <span className="inline-block text-[9px] text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase border border-indigo-200 dark:border-indigo-800/60">
                                KUSTOM
                              </span>
                            )}
                          </div>
                          
                          {item.variantLabel && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-6">
                              {item.variantLabel}
                            </div>
                          )}

                          {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 pl-6 mt-1">
                              {item.selectedModifiers.map(mGroup => (
                                mGroup.selectedOptions.map(opt => (
                                  <span key={opt.optionId} className="text-[9px] bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-100 dark:border-slate-700 px-1.5 py-0.5 rounded-md font-medium">
                                    +{opt.name}
                                  </span>
                                ))
                              ))}
                            </div>
                          )}

                          {item.customNotes && (
                            <div className="mt-1 pl-6 text-[10px] text-slate-600 dark:text-slate-400 italic">
                              Catatan: {item.customNotes}
                            </div>
                          )}
                        </div>
                        <div className="font-mono text-slate-500 dark:text-slate-400 shrink-0 text-right sm:mt-0.5 font-semibold">
                          {formatCurrency(item.unitPrice * item.qty)}
                        </div>
                      </div>
                    ))}
                    
                    {order.items.length > 1 && (
                      <button
                        onClick={() => toggleExpandOrder(order.id)}
                        className="w-full text-center py-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        {expandedOrders[order.id] ? (
                          <><ChevronUp className="h-3 w-3" /> Sembunyikan item</>
                        ) : (
                          <><ChevronDown className="h-3 w-3" /> Tampilkan {order.items.length - 1} item lainnya...</>
                        )}
                      </button>
                    )}
                  </div>

                  {/* BOTTOM SECTION: Total & Action Buttons (Right Aligned) */}
                  <div className="flex flex-col sm:flex-row items-end justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 mt-1">
                    <div className="hidden sm:block"></div> {/* Spacer for left side if needed */}
                    <div className="flex flex-wrap items-center justify-end gap-4 w-full sm:w-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">Total Harga</span>
                        <span className="font-mono text-lg font-extrabold text-indigo-600 dark:text-indigo-400 leading-none">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 relative border-l border-slate-200 dark:border-slate-700 pl-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDetailModal(order.id)}
                          className="text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Detail
                        </Button>

                        {canApproveOrder(currentUser.role) && order.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => handleProcessOrder(order.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Proses
                          </Button>
                        )}

                        {/* MORE OPTIONS BUTTON FOR PENDING ORDERS (EDIT & DELETE/BATALKAN) */}
                        {order.status === 'PENDING' && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenActionMenuId(isMenuOpen ? null : order.id)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300 transition-colors"
                              title="Opsi Lanjutan"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 z-30 py-1.5 text-xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    router.push(\`/order/create?edit=\${order.id}\`);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700 text-left font-medium"
                                >
                                  <Edit className="h-3.5 w-3.5 text-indigo-600" />
                                  Edit Pesanan
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenCancelModal(order.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 text-left font-medium border-t border-slate-100 dark:border-slate-700/60"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Batalkan Order
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>`;

content = content.replace(content.substring(oldCardStart, oldCardEnd), newCardCode);

fs.writeFileSync(path, content);
