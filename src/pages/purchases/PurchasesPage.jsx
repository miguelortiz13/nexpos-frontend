import { useState, useEffect, useMemo } from 'react';
import {
    FaTruck,
    FaPlus,
    FaSearch,
    FaBoxes,
    FaFileInvoiceDollar,
    FaHistory,
    FaCalendarAlt,
    FaMoneyBillWave,
    FaCheckCircle,
    FaTimesCircle,
    FaTrash,
    FaEye,
    FaBan,
    FaEdit,
    FaClock,
    FaExclamationTriangle,
    FaArrowRight,
    FaExchangeAlt,
    FaUserTie
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import api from '../../api/client';
import { getSuppliers, createSupplier, updateSupplier, toggleSupplierStatus } from '../../api/supplierService';
import { getPurchases, createPurchase, cancelPurchase, getPayablesSummary } from '../../api/purchaseService';
import 'react-toastify/dist/ReactToastify.css';
import './PurchasesPage.css';

const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(val) || 0);
};

export default function PurchasesPage() {
    const [activeTab, setActiveTab] = useState('RECEIVE'); // 'RECEIVE', 'HISTORY', 'SUPPLIERS', 'PAYABLES'
    const [loading, setLoading] = useState(false);

    // Datos base
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [payablesSummary, setPayablesSummary] = useState(null);

    // Formulario de Nueva Compra
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [paymentDueDate, setPaymentDueDate] = useState('');
    const [purchaseNotes, setPurchaseNotes] = useState('');
    const [purchaseItems, setPurchaseItems] = useState([]);

    // Buscador de productos en formulario
    const [productSearch, setProductSearch] = useState('');
    const [selectedProductToAdd, setSelectedProductToAdd] = useState(null);
    const [incomingQty, setIncomingQty] = useState(1);
    const [incomingUnitCost, setIncomingUnitCost] = useState('');
    const [incomingTaxRate, setIncomingTaxRate] = useState(0.19);

    // Modales
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [supplierForm, setSupplierForm] = useState({
        nit: '',
        companyName: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        city: 'Cali',
        paymentTermsDays: 0,
        notes: ''
    });

    const [detailPurchase, setDetailPurchase] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [cancelModalData, setCancelModalData] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    // Filtros de historial
    const [historySearch, setHistorySearch] = useState('');
    const [historySupplierFilter, setHistorySupplierFilter] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [suppData, prodData] = await Promise.all([
                getSuppliers(),
                api.get('/api/productos').then(r => r.data || [])
            ]);
            setSuppliers(suppData || []);
            setProducts(prodData || []);
        } catch (err) {
            console.error('Error cargando datos iniciales:', err);
            toast.error('Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const loadPurchases = async () => {
        try {
            const data = await getPurchases();
            setPurchases(data || []);
        } catch (err) {
            console.error('Error cargando compras:', err);
            toast.error('No se pudo cargar el historial de compras');
        }
    };

    const loadPayables = async () => {
        try {
            const [summary, allPurchases] = await Promise.all([
                getPayablesSummary(),
                getPurchases({ paymentStatus: 'PENDING', status: 'RECEIVED' })
            ]);
            setPayablesSummary(summary);
            setPurchases(allPurchases || []);
        } catch (err) {
            console.error('Error cargando cuentas por pagar:', err);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'HISTORY') loadPurchases();
        if (tab === 'PAYABLES') loadPayables();
        if (tab === 'SUPPLIERS') loadInitialData();
    };

    // Auto-ajustar fecha de vencimiento según proveedor seleccionado y método de pago
    useEffect(() => {
        if (!selectedSupplierId) return;
        const supp = suppliers.find(s => String(s.id) === String(selectedSupplierId));
        if (supp && paymentMethod === 'CREDITO_PROVEEDOR') {
            const days = supp.paymentTermsDays > 0 ? supp.paymentTermsDays : 30;
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            setPaymentDueDate(targetDate.toISOString().split('T')[0]);
        }
    }, [selectedSupplierId, paymentMethod, suppliers]);

    // Filtrar productos para selector de autocompletado
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return [];
        const term = productSearch.toLowerCase();
        return products.filter(p =>
            (p.nombre && p.nombre.toLowerCase().includes(term)) ||
            (p.codigoBarras && p.codigoBarras.includes(term))
        ).slice(0, 8);
    }, [products, productSearch]);

    // Seleccionar producto para agregar a la compra
    const handleSelectProduct = (prod) => {
        setSelectedProductToAdd(prod);
        setIncomingUnitCost(prod.costPrice && Number(prod.costPrice) > 0 ? prod.costPrice : (prod.precio * 0.7));
        setIncomingTaxRate(prod.ivaRate != null ? Number(prod.ivaRate) : 0.19);
        setProductSearch('');
    };

    // Agregar producto a la lista de compra
    const handleAddItemToPurchase = () => {
        if (!selectedProductToAdd) {
            toast.warning('Selecciona un producto para agregar');
            return;
        }
        const qty = parseInt(incomingQty, 10);
        const cost = parseFloat(incomingUnitCost);

        if (isNaN(qty) || qty <= 0) {
            toast.warning('La cantidad debe ser mayor a 0');
            return;
        }
        if (isNaN(cost) || cost <= 0) {
            toast.warning('El costo unitario de compra debe ser mayor a 0');
            return;
        }

        const existingIndex = purchaseItems.findIndex(i => i.productId === selectedProductToAdd.id);

        if (existingIndex >= 0) {
            // Actualizar si ya estaba en la lista
            const updated = [...purchaseItems];
            updated[existingIndex].quantity += qty;
            updated[existingIndex].unitCost = cost;
            updated[existingIndex].taxRate = incomingTaxRate;
            setPurchaseItems(updated);
        } else {
            setPurchaseItems([
                ...purchaseItems,
                {
                    productId: selectedProductToAdd.id,
                    productName: selectedProductToAdd.nombre,
                    productBarcode: selectedProductToAdd.codigoBarras,
                    currentStock: selectedProductToAdd.cantidad || 0,
                    currentCost: selectedProductToAdd.costPrice || 0,
                    quantity: qty,
                    unitCost: cost,
                    taxRate: incomingTaxRate
                }
            ]);
        }

        // Limpiar campos temporales
        setSelectedProductToAdd(null);
        setIncomingQty(1);
        setIncomingUnitCost('');
    };

    const handleRemoveItem = (index) => {
        setPurchaseItems(purchaseItems.filter((_, idx) => idx !== index));
    };

    // Cálculos de PMP e importes totales en vivo
    const purchaseCalculations = useMemo(() => {
        let subtotal = 0;
        let taxTotal = 0;

        const itemsWithPmp = purchaseItems.map(item => {
            const itemSubtotal = item.quantity * item.unitCost;
            const itemTax = itemSubtotal * item.taxRate;
            const itemTotal = itemSubtotal + itemTax;

            subtotal += itemSubtotal;
            taxTotal += itemTax;

            // Fórmula PMP
            const currStock = item.currentStock;
            const currCost = Number(item.currentCost) || 0;
            let projectedPmp;

            if (currStock <= 0) {
                projectedPmp = item.unitCost;
            } else {
                const totalVal = (currStock * currCost) + (item.quantity * item.unitCost);
                const totalQty = currStock + item.quantity;
                projectedPmp = totalVal / totalQty;
            }

            const pmpDiffPercent = currCost > 0
                ? (((projectedPmp - currCost) / currCost) * 100).toFixed(1)
                : 0;

            return {
                ...item,
                itemSubtotal,
                itemTax,
                itemTotal,
                projectedPmp,
                pmpDiffPercent,
                projectedNewStock: currStock + item.quantity
            };
        });

        return {
            items: itemsWithPmp,
            subtotal,
            taxTotal,
            total: subtotal + taxTotal
        };
    }, [purchaseItems]);

    // Procesar recepción de compra en Backend
    const handleProcessPurchase = async () => {
        if (!selectedSupplierId) {
            toast.error('Debes seleccionar un proveedor');
            return;
        }
        if (purchaseItems.length === 0) {
            toast.error('Agrega al menos un producto a la compra');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                supplierId: Number(selectedSupplierId),
                supplierInvoiceNumber: supplierInvoiceNumber.trim() || null,
                paymentMethod,
                paymentDueDate: paymentMethod === 'CREDITO_PROVEEDOR' ? paymentDueDate : null,
                notes: purchaseNotes.trim() || null,
                items: purchaseItems.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitCost: i.unitCost,
                    taxRate: i.taxRate
                }))
            };

            const created = await createPurchase(payload);
            toast.success(`¡Compra ${created.purchaseNumber} recepcionada con éxito! Stock y PMP actualizados.`);

            // Limpiar formulario y recargar catálogo
            setPurchaseItems([]);
            setSupplierInvoiceNumber('');
            setPurchaseNotes('');
            loadInitialData();
            setActiveTab('HISTORY');
            loadPurchases();
        } catch (err) {
            console.error('Error al recepcionar compra:', err);
            const msg = err.response?.data?.message || 'Error al registrar la compra';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Anulación de compra
    const handleConfirmCancelPurchase = async () => {
        if (!cancelModalData) return;
        setLoading(true);
        try {
            await cancelPurchase(cancelModalData.id, cancelReason);
            toast.success(`Compra ${cancelModalData.purchaseNumber} anulada y stock revertido correctamente`);
            setCancelModalData(null);
            setCancelReason('');
            loadPurchases();
            loadInitialData();
        } catch (err) {
            console.error('Error al anular compra:', err);
            const msg = err.response?.data?.message || 'No se pudo anular la compra';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // Gestión de Proveedores (Modal)
    const handleOpenSupplierModal = (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setSupplierForm({
                nit: supplier.nit,
                companyName: supplier.companyName,
                contactName: supplier.contactName || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address || '',
                city: supplier.city || 'Cali',
                paymentTermsDays: supplier.paymentTermsDays || 0,
                notes: supplier.notes || ''
            });
        } else {
            setEditingSupplier(null);
            setSupplierForm({
                nit: '',
                companyName: '',
                contactName: '',
                phone: '',
                email: '',
                address: '',
                city: 'Cali',
                paymentTermsDays: 0,
                notes: ''
            });
        }
        setShowSupplierModal(true);
    };

    const handleSaveSupplier = async (e) => {
        e.preventDefault();
        if (!supplierForm.nit.trim() || !supplierForm.companyName.trim()) {
            toast.warning('NIT y Razón Social son campos requeridos');
            return;
        }

        try {
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, supplierForm);
                toast.success('Proveedor actualizado correctamente');
            } else {
                const created = await createSupplier(supplierForm);
                toast.success('Proveedor registrado con éxito');
                if (activeTab === 'RECEIVE') {
                    setSelectedSupplierId(String(created.id));
                }
            }
            setShowSupplierModal(false);
            loadInitialData();
        } catch (err) {
            console.error('Error guardando proveedor:', err);
            const msg = err.response?.data?.message || 'Error al guardar el proveedor';
            toast.error(msg);
        }
    };

    const handleToggleSupplierStatus = async (id) => {
        try {
            await toggleSupplierStatus(id);
            toast.info('Estado de proveedor modificado');
            loadInitialData();
        } catch (err) {
            console.error('Error toggling supplier status:', err);
            toast.error('No se pudo cambiar el estado del proveedor');
        }
    };

    // Filtrar compras en historial
    const filteredHistory = useMemo(() => {
        return purchases.filter(p => {
            const matchesSearch = !historySearch ||
                (p.purchaseNumber && p.purchaseNumber.toLowerCase().includes(historySearch.toLowerCase())) ||
                (p.supplierName && p.supplierName.toLowerCase().includes(historySearch.toLowerCase())) ||
                (p.supplierInvoiceNumber && p.supplierInvoiceNumber.toLowerCase().includes(historySearch.toLowerCase()));

            const matchesSupplier = !historySupplierFilter || String(p.supplierId) === String(historySupplierFilter);
            const matchesStatus = !historyStatusFilter || p.status === historyStatusFilter;

            return matchesSearch && matchesSupplier && matchesStatus;
        });
    }, [purchases, historySearch, historySupplierFilter, historyStatusFilter]);

    return (
        <div className="purchases-page-container">
            <ToastContainer position="top-right" autoClose={3000} />

            {/* Cabecera Principal */}
            <div className="purchases-header">
                <div>
                    <h2><FaTruck className="icon-main" /> Compras & Proveedores</h2>
                    <p className="purchases-subtitle">
                        Recepción de mercancía a distribuidores, actualización automática de stock y cálculo de Costo Promedio Ponderado (PMP).
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn-new-supplier" onClick={() => handleOpenSupplierModal()}>
                        <FaPlus /> Nuevo Proveedor
                    </button>
                </div>
            </div>

            {/* Selector de Pestañas */}
            <div className="purchases-tabs">
                <button
                    className={`tab-btn ${activeTab === 'RECEIVE' ? 'active' : ''}`}
                    onClick={() => handleTabChange('RECEIVE')}
                >
                    <FaBoxes /> Recepción de Mercancía
                </button>
                <button
                    className={`tab-btn ${activeTab === 'HISTORY' ? 'active' : ''}`}
                    onClick={() => handleTabChange('HISTORY')}
                >
                    <FaHistory /> Historial de Compras
                </button>
                <button
                    className={`tab-btn ${activeTab === 'SUPPLIERS' ? 'active' : ''}`}
                    onClick={() => handleTabChange('SUPPLIERS')}
                >
                    <FaUserTie /> Directorio de Proveedores ({suppliers.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'PAYABLES' ? 'active' : ''}`}
                    onClick={() => handleTabChange('PAYABLES')}
                >
                    <FaMoneyBillWave /> Cuentas por Pagar
                </button>
            </div>

            {/* ========================================================= */}
            {/* TAB 1: RECEPCIÓN DE MERCANCÍA / NUEVA COMPRA             */}
            {/* ========================================================= */}
            {activeTab === 'RECEIVE' && (
                <div className="receive-tab-content">
                    {/* Tarjeta de Datos de Factura del Proveedor */}
                    <div className="purchase-card invoice-meta-card">
                        <h3><FaFileInvoiceDollar /> 1. Datos de la Factura de Compra</h3>
                        <div className="form-grid-3">
                            <div className="form-group">
                                <label>Proveedor *</label>
                                <select
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    className="form-control"
                                >
                                    <option value="">-- Seleccionar Proveedor --</option>
                                    {suppliers.filter(s => s.active).map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.companyName} (NIT: {s.nit}) {s.paymentTermsDays > 0 ? `[${s.paymentTermsDays}d crédito]` : '[Contado]'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Factura Física del Distribuidor</label>
                                <input
                                    type="text"
                                    placeholder="Ej: FE-89214, FAC-1029"
                                    value={supplierInvoiceNumber}
                                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                                    className="form-control"
                                />
                            </div>

                            <div className="form-group">
                                <label>Modalidad de Pago</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="form-control"
                                >
                                    <option value="EFECTIVO">Contado (Efectivo)</option>
                                    <option value="TRANSFERENCIA">Contado (Transferencia Bancaria)</option>
                                    <option value="CREDITO_PROVEEDOR">Crédito Comercial (Cuenta por Pagar)</option>
                                    <option value="OTRO">Otro Medio</option>
                                </select>
                            </div>
                        </div>

                        {paymentMethod === 'CREDITO_PROVEEDOR' && (
                            <div className="credit-alert-box">
                                <FaClock />
                                <div>
                                    <strong>Factura a Crédito:</strong> Fecha límite de pago sugerida:
                                    <input
                                        type="date"
                                        value={paymentDueDate}
                                        onChange={(e) => setPaymentDueDate(e.target.value)}
                                        className="form-control-inline"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tarjeta de Búsqueda y Adición de Ítems */}
                    <div className="purchase-card add-items-card">
                        <h3><FaBoxes /> 2. Selección de Productos a Recepcionar</h3>
                        <div className="add-product-bar">
                            <div className="search-input-wrapper">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto por nombre o escanear código de barras..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="form-control product-search-input"
                                />
                                {filteredProducts.length > 0 && (
                                    <div className="product-dropdown-list">
                                        {filteredProducts.map(p => (
                                            <div
                                                key={p.id}
                                                className="dropdown-item"
                                                onClick={() => handleSelectProduct(p)}
                                            >
                                                <div className="dropdown-item-name">{p.nombre}</div>
                                                <div className="dropdown-item-meta">
                                                    Stock: {p.cantidad} | Costo Actual: {formatCOP(p.costPrice || 0)} | Barras: {p.codigoBarras || 'N/A'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedProductToAdd && (
                                <div className="selected-item-pill">
                                    <span>Seleccionado: <strong>{selectedProductToAdd.nombre}</strong> (Stock actual: {selectedProductToAdd.cantidad})</span>
                                    <button className="btn-clear-pill" onClick={() => setSelectedProductToAdd(null)}>✕</button>
                                </div>
                            )}
                        </div>

                        {selectedProductToAdd && (
                            <div className="item-input-row">
                                <div className="form-group">
                                    <label>Cantidad Recibida</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={incomingQty}
                                        onChange={(e) => setIncomingQty(e.target.value)}
                                        className="form-control input-qty"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Costo Unitario Factura (sin IVA)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Costo unitario"
                                        value={incomingUnitCost}
                                        onChange={(e) => setIncomingUnitCost(e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Tarifa IVA</label>
                                    <select
                                        value={incomingTaxRate}
                                        onChange={(e) => setIncomingTaxRate(parseFloat(e.target.value))}
                                        className="form-control"
                                    >
                                        <option value={0.19}>19% General</option>
                                        <option value={0.05}>5% Reducido</option>
                                        <option value={0.00}>0% Exento</option>
                                    </select>
                                </div>
                                <div className="form-group btn-add-container">
                                    <button className="btn-add-item" onClick={handleAddItemToPurchase}>
                                        <FaPlus /> Agregar a Factura
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tabla de Ítems con Calculadora PMP en Vivo */}
                    <div className="purchase-card items-table-card">
                        <h3><FaExchangeAlt /> 3. Desglose de Mercancía & Proyección de Costo Promedio (PMP)</h3>
                        {purchaseCalculations.items.length === 0 ? (
                            <div className="empty-items-notice">
                                <FaBoxes size={32} />
                                <p>Aún no has agregado productos a esta recepción. Busca un producto arriba para comenzar.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="purchases-table">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cant. Recibida</th>
                                            <th>Costo Factura</th>
                                            <th>IVA</th>
                                            <th>Subtotal</th>
                                            <th>Total Ítem</th>
                                            <th>Impacto en Costo PMP</th>
                                            <th>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchaseCalculations.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <strong>{item.productName}</strong>
                                                    <div className="text-muted small">Cód: {item.productBarcode || 'N/A'} | Stock previo: {item.currentStock}</div>
                                                </td>
                                                <td><span className="badge-qty">+{item.quantity}</span></td>
                                                <td>{formatCOP(item.unitCost)}</td>
                                                <td>{(item.taxRate * 100).toFixed(0)}% ({formatCOP(item.itemTax)})</td>
                                                <td>{formatCOP(item.itemSubtotal)}</td>
                                                <td><strong>{formatCOP(item.itemTotal)}</strong></td>
                                                <td>
                                                    <div className="pmp-indicator-box">
                                                        <div className="pmp-values">
                                                            <span>Anterior: {formatCOP(item.currentCost)}</span>
                                                            <FaArrowRight size={10} />
                                                            <strong className="text-pmp">{formatCOP(item.projectedPmp)}</strong>
                                                        </div>
                                                        <span className={`badge-diff ${Number(item.pmpDiffPercent) >= 0 ? 'diff-up' : 'diff-down'}`}>
                                                            {Number(item.pmpDiffPercent) >= 0 ? `+${item.pmpDiffPercent}%` : `${item.pmpDiffPercent}%`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn-action-icon btn-delete"
                                                        onClick={() => handleRemoveItem(idx)}
                                                        title="Eliminar de la factura"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Resumen Final y Botón de Procesamiento */}
                    {purchaseCalculations.items.length > 0 && (
                        <div className="purchase-summary-bar">
                            <div className="notes-box">
                                <label>Observaciones de Recepción / Notas</label>
                                <textarea
                                    rows="2"
                                    placeholder="Detalles de entrega, transportadora, número de remisión..."
                                    value={purchaseNotes}
                                    onChange={(e) => setPurchaseNotes(e.target.value)}
                                    className="form-control"
                                />
                            </div>
                            <div className="totals-box">
                                <div className="total-row">
                                    <span>Subtotal sin IVA:</span>
                                    <span>{formatCOP(purchaseCalculations.subtotal)}</span>
                                </div>
                                <div className="total-row">
                                    <span>Total IVA Liquidado:</span>
                                    <span>{formatCOP(purchaseCalculations.taxTotal)}</span>
                                </div>
                                <div className="total-row grand-total">
                                    <span>Total a Pagar / Recepcionar:</span>
                                    <strong>{formatCOP(purchaseCalculations.total)}</strong>
                                </div>
                                <button
                                    className="btn-process-purchase"
                                    onClick={handleProcessPurchase}
                                    disabled={loading}
                                >
                                    <FaCheckCircle /> {loading ? 'Procesando e ingresando a stock...' : 'Confirmar e Ingresar a Inventario'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: HISTORIAL DE COMPRAS                               */}
            {/* ========================================================= */}
            {activeTab === 'HISTORY' && (
                <div className="history-tab-content">
                    {/* Barra de Filtros */}
                    <div className="filters-bar">
                        <div className="search-box">
                            <FaSearch />
                            <input
                                type="text"
                                placeholder="Buscar por Nro Compra, Factura de Proveedor..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                            />
                        </div>
                        <select
                            value={historySupplierFilter}
                            onChange={(e) => setHistorySupplierFilter(e.target.value)}
                            className="form-control-filter"
                        >
                            <option value="">Todos los Proveedores</option>
                            {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.companyName}</option>
                            ))}
                        </select>
                        <select
                            value={historyStatusFilter}
                            onChange={(e) => setHistoryStatusFilter(e.target.value)}
                            className="form-control-filter"
                        >
                            <option value="">Todos los Estados</option>
                            <option value="RECEIVED">Recibidas</option>
                            <option value="CANCELLED">Anuladas</option>
                        </select>
                    </div>

                    <div className="table-responsive">
                        <table className="purchases-table">
                            <thead>
                                <tr>
                                    <th>Nro. Compra</th>
                                    <th>Proveedor</th>
                                    <th>Factura Prov.</th>
                                    <th>Fecha Recepción</th>
                                    <th>Total Compra</th>
                                    <th>Forma de Pago</th>
                                    <th>Estado Pago</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="text-center py-4">
                                            No se encontraron compras registradas con los filtros actuales.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistory.map(p => (
                                        <tr key={p.id}>
                                            <td><strong>{p.purchaseNumber}</strong></td>
                                            <td>{p.supplierName}</td>
                                            <td>{p.supplierInvoiceNumber || '—'}</td>
                                            <td>{new Date(p.receivedAt).toLocaleDateString()} {new Date(p.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td><strong>{formatCOP(p.totalAmount)}</strong></td>
                                            <td><span className="badge-payment-method">{p.paymentMethod}</span></td>
                                            <td>
                                                <span className={`badge-payment-status ${p.paymentStatus === 'PAID' ? 'status-paid' : 'status-pending'}`}>
                                                    {p.paymentStatus === 'PAID' ? 'Pagada' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge-status ${p.status === 'RECEIVED' ? 'status-received' : 'status-cancelled'}`}>
                                                    {p.status === 'RECEIVED' ? 'Recibida' : 'Anulada'}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <button
                                                    className="btn-action-icon btn-view"
                                                    onClick={() => {
                                                        setDetailPurchase(p);
                                                        setShowDetailModal(true);
                                                    }}
                                                    title="Ver Detalle"
                                                >
                                                    <FaEye />
                                                </button>
                                                {p.status === 'RECEIVED' && (
                                                    <button
                                                        className="btn-action-icon btn-cancel"
                                                        onClick={() => {
                                                            setCancelModalData(p);
                                                            setCancelReason('');
                                                        }}
                                                        title="Anular Compra"
                                                    >
                                                        <FaBan />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: DIRECTORIO DE PROVEEDORES                          */}
            {/* ========================================================= */}
            {activeTab === 'SUPPLIERS' && (
                <div className="suppliers-tab-content">
                    <div className="table-responsive">
                        <table className="purchases-table">
                            <thead>
                                <tr>
                                    <th>NIT</th>
                                    <th>Razón Social</th>
                                    <th>Contacto</th>
                                    <th>Teléfono</th>
                                    <th>Correo</th>
                                    <th>Ciudad</th>
                                    <th>Plazo Crédito</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="text-center py-4">
                                            No hay proveedores registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    suppliers.map(s => (
                                        <tr key={s.id}>
                                            <td><strong>{s.nit}</strong></td>
                                            <td>{s.companyName}</td>
                                            <td>{s.contactName || '—'}</td>
                                            <td>{s.phone || '—'}</td>
                                            <td>{s.email || '—'}</td>
                                            <td>{s.city}</td>
                                            <td>{s.paymentTermsDays > 0 ? `${s.paymentTermsDays} días` : 'Contado'}</td>
                                            <td>
                                                <span className={`badge-active ${s.active ? 'active-true' : 'active-false'}`}>
                                                    {s.active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <button
                                                    className="btn-action-icon btn-edit"
                                                    onClick={() => handleOpenSupplierModal(s)}
                                                    title="Editar Proveedor"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    className={`btn-action-icon ${s.active ? 'btn-deactivate' : 'btn-activate'}`}
                                                    onClick={() => handleToggleSupplierStatus(s.id)}
                                                    title={s.active ? 'Desactivar' : 'Activar'}
                                                >
                                                    {s.active ? <FaTimesCircle /> : <FaCheckCircle />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: CUENTAS POR PAGAR                                  */}
            {/* ========================================================= */}
            {activeTab === 'PAYABLES' && (
                <div className="payables-tab-content">
                    {/* Tarjetas KPI */}
                    <div className="kpi-grid">
                        <div className="kpi-card kpi-total">
                            <div className="kpi-icon"><FaMoneyBillWave /></div>
                            <div className="kpi-info">
                                <span className="kpi-label">Total Cuentas por Pagar</span>
                                <h3 className="kpi-val">{formatCOP(payablesSummary?.totalPendingAmount || 0)}</h3>
                            </div>
                        </div>

                        <div className="kpi-card kpi-pending">
                            <div className="kpi-icon"><FaClock /></div>
                            <div className="kpi-info">
                                <span className="kpi-label">Facturas Pendientes</span>
                                <h3 className="kpi-val">{payablesSummary?.pendingInvoicesCount || 0}</h3>
                            </div>
                        </div>

                        <div className="kpi-card kpi-overdue">
                            <div className="kpi-icon"><FaExclamationTriangle /></div>
                            <div className="kpi-info">
                                <span className="kpi-label">Facturas Vencidas</span>
                                <h3 className="kpi-val text-danger">{payablesSummary?.overdueInvoicesCount || 0}</h3>
                            </div>
                        </div>

                        <div className="kpi-card kpi-upcoming">
                            <div className="kpi-icon"><FaCalendarAlt /></div>
                            <div className="kpi-info">
                                <span className="kpi-label">Por Vencer</span>
                                <h3 className="kpi-val text-warning">{payablesSummary?.upcomingInvoicesCount || 0}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive mt-4">
                        <table className="purchases-table">
                            <thead>
                                <tr>
                                    <th>Nro. Compra</th>
                                    <th>Proveedor</th>
                                    <th>Factura Distribuidor</th>
                                    <th>Fecha Emisión</th>
                                    <th>Fecha Vencimiento</th>
                                    <th>Importe Pendiente</th>
                                    <th>Estado Vencimiento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.filter(p => p.paymentStatus === 'PENDING').length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            ¡Al día! No tienes facturas a crédito pendientes de pago a proveedores.
                                        </td>
                                    </tr>
                                ) : (
                                    purchases.filter(p => p.paymentStatus === 'PENDING').map(p => {
                                        const dueDate = p.paymentDueDate ? new Date(p.paymentDueDate) : null;
                                        const today = new Date();
                                        const isOverdue = dueDate && dueDate < today;

                                        return (
                                            <tr key={p.id}>
                                                <td><strong>{p.purchaseNumber}</strong></td>
                                                <td>{p.supplierName}</td>
                                                <td>{p.supplierInvoiceNumber || '—'}</td>
                                                <td>{new Date(p.receivedAt).toLocaleDateString()}</td>
                                                <td>{dueDate ? dueDate.toLocaleDateString() : 'Sin plazo fijado'}</td>
                                                <td><strong>{formatCOP(p.totalAmount)}</strong></td>
                                                <td>
                                                    <span className={`badge-due ${isOverdue ? 'due-overdue' : 'due-ok'}`}>
                                                        {isOverdue ? '¡Factura Vencida!' : 'Dentro de Plazo'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: CREAR / EDITAR PROVEEDOR                           */}
            {/* ========================================================= */}
            {showSupplierModal && (
                <div className="modal-backdrop">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3><FaUserTie /> {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                            <button className="btn-close-modal" onClick={() => setShowSupplierModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSaveSupplier}>
                            <div className="modal-body">
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>NIT / Identificación Fiscal *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: 860005224-6"
                                            value={supplierForm.nit}
                                            onChange={(e) => setSupplierForm({ ...supplierForm, nit: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Razón Social / Nombre Comercial *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Bavaria & Cía S.C.A."
                                            value={supplierForm.companyName}
                                            onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Contacto / Asesor de Ventas</label>
                                        <input
                                            type="text"
                                            placeholder="Nombre del preventista"
                                            value={supplierForm.contactName}
                                            onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Teléfono / Celular</label>
                                        <input
                                            type="text"
                                            placeholder="310 123 4567"
                                            value={supplierForm.phone}
                                            onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Correo Electrónico</label>
                                        <input
                                            type="email"
                                            placeholder="pedidos@proveedor.com"
                                            value={supplierForm.email}
                                            onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Días de Crédito Comercial</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0 = Contado, 15, 30 días"
                                            value={supplierForm.paymentTermsDays}
                                            onChange={(e) => setSupplierForm({ ...supplierForm, paymentTermsDays: parseInt(e.target.value, 10) || 0 })}
                                            className="form-control"
                                        />
                                    </div>
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>Dirección</label>
                                        <input
                                            type="text"
                                            placeholder="Carrera 8 # 34-12"
                                            value={supplierForm.address}
                                            onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Ciudad</label>
                                        <input
                                            type="text"
                                            value={supplierForm.city}
                                            onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowSupplierModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar Proveedor</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: DETALLE DE COMPRA                                   */}
            {/* ========================================================= */}
            {showDetailModal && detailPurchase && (
                <div className="modal-backdrop">
                    <div className="modal-card modal-large">
                        <div className="modal-header">
                            <h3><FaFileInvoiceDollar /> Detalle de Compra: {detailPurchase.purchaseNumber}</h3>
                            <button className="btn-close-modal" onClick={() => setShowDetailModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-meta-grid">
                                <div><strong>Proveedor:</strong> {detailPurchase.supplierName} (NIT: {detailPurchase.supplierNit})</div>
                                <div><strong>Factura Proveedor:</strong> {detailPurchase.supplierInvoiceNumber || 'N/A'}</div>
                                <div><strong>Fecha Recepción:</strong> {new Date(detailPurchase.receivedAt).toLocaleString()}</div>
                                <div><strong>Recibido por:</strong> {detailPurchase.registeredBy}</div>
                                <div><strong>Forma de Pago:</strong> {detailPurchase.paymentMethod}</div>
                                <div><strong>Estado:</strong> {detailPurchase.status} | <strong>Pago:</strong> {detailPurchase.paymentStatus}</div>
                            </div>

                            <table className="purchases-table mt-3">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cant.</th>
                                        <th>Costo Unit.</th>
                                        <th>IVA</th>
                                        <th>Subtotal</th>
                                        <th>Total Ítem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailPurchase.items && detailPurchase.items.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.productName}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatCOP(item.unitCost)}</td>
                                            <td>{(item.taxRate * 100).toFixed(0)}% ({formatCOP(item.taxAmount)})</td>
                                            <td>{formatCOP(item.subtotal)}</td>
                                            <td><strong>{formatCOP(item.total)}</strong></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="detail-totals mt-3">
                                <div>Subtotal: {formatCOP(detailPurchase.subtotal)}</div>
                                <div>IVA: {formatCOP(detailPurchase.taxAmount)}</div>
                                <div className="grand-total">Total Compra: {formatCOP(detailPurchase.totalAmount)}</div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={() => setShowDetailModal(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: CONFIRMAR ANULACIÓN DE COMPRA                      */}
            {/* ========================================================= */}
            {cancelModalData && (
                <div className="modal-backdrop">
                    <div className="modal-card">
                        <div className="modal-header header-danger">
                            <h3><FaBan /> Anular Compra #{cancelModalData.purchaseNumber}</h3>
                            <button className="btn-close-modal" onClick={() => setCancelModalData(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p>
                                <strong>¡Atención!</strong> Al anular esta compra, las cantidades recibidas se restarán automáticamente del inventario y se generará un movimiento de auditoría tipo <code>DEVOLUCION</code> en el Kardex.
                            </p>
                            <p>
                                Total de la factura a revertir: <strong>{formatCOP(cancelModalData.totalAmount)}</strong>
                            </p>
                            <div className="form-group mt-3">
                                <label>Motivo de la Anulación *</label>
                                <textarea
                                    required
                                    rows="3"
                                    placeholder="Ej: Factura digitada por error, mercancía devuelta por daño en transporte..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="form-control"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setCancelModalData(null)}>Cancelar</button>
                            <button
                                className="btn-danger"
                                onClick={handleConfirmCancelPurchase}
                                disabled={!cancelReason.trim() || loading}
                            >
                                {loading ? 'Revirtiendo stock...' : 'Confirmar Anulación y Revertir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
