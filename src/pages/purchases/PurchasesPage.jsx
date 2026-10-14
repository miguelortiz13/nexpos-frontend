import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    FaUserTie,
    FaRobot,
    FaWhatsapp,
    FaShoppingCart,
    FaRedo,
    FaChartLine,
    FaBolt
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import api from '../../api/client';
import { getSuppliers, createSupplier, updateSupplier, toggleSupplierStatus } from '../../api/supplierService';
import { getPurchases, createPurchase, cancelPurchase, getPayablesSummary } from '../../api/purchaseService';
import { getForecastAnalysis } from '../../api/forecastingService';
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
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'RECEIVE'); // 'RECEIVE', 'HISTORY', 'SUPPLIERS', 'PAYABLES', 'FORECASTING'
    const [loading, setLoading] = useState(false);

    // Datos base
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [payablesSummary, setPayablesSummary] = useState(null);

    // Estado del Asistente de Reabastecimiento IA (Pilar E)
    const [forecastingData, setForecastingData] = useState(null);
    const [forecastDays, setForecastDays] = useState(14);
    const [forecastTargetDays, setForecastTargetDays] = useState(15);
    const [forecastingLoading, setForecastingLoading] = useState(false);
    const [forecastFilterStatus, setForecastFilterStatus] = useState('ALL');
    const [forecastSearch, setForecastSearch] = useState('');
    const [forecastSupplierFilter, setForecastSupplierFilter] = useState('ALL');

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

    const loadForecasting = async (days = forecastDays, target = forecastTargetDays) => {
        setForecastingLoading(true);
        try {
            const data = await getForecastAnalysis(days, target);
            setForecastingData(data);
        } catch (err) {
            console.error('Error cargando pronóstico de inventario:', err);
            toast.error('Error al generar pronóstico de inventario');
        } finally {
            setForecastingLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'HISTORY') loadPurchases();
        if (tab === 'PAYABLES') loadPayables();
        if (tab === 'SUPPLIERS') loadInitialData();
        if (tab === 'FORECASTING') loadForecasting();
    };

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && ['RECEIVE', 'HISTORY', 'SUPPLIERS', 'PAYABLES', 'FORECASTING'].includes(tabParam)) {
            handleTabChange(tabParam);
        }
    }, [searchParams]);

    const handleConvertToPurchase = (supplierGroup) => {
        if (!supplierGroup || !supplierGroup.items || supplierGroup.items.length === 0) {
            toast.warn('No hay productos sugeridos en este grupo');
            return;
        }

        if (supplierGroup.supplierId) {
            setSelectedSupplierId(supplierGroup.supplierId.toString());
            const supp = suppliers.find(s => s.id === supplierGroup.supplierId);
            if (supp && supp.paymentTermsDays > 0) {
                setPaymentMethod('CREDITO_PROVEEDOR');
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + supp.paymentTermsDays);
                setPaymentDueDate(targetDate.toISOString().split('T')[0]);
            } else {
                setPaymentMethod('EFECTIVO');
            }
        } else {
            setSelectedSupplierId('');
        }

        setSupplierInvoiceNumber(`PEDIDO-IA-${new Date().toISOString().slice(5, 10).replace('-', '')}`);
        setPurchaseNotes(`Orden sugerida automáticamente por el Asistente IA de Reabastecimiento para cobertura de ${forecastTargetDays} días.`);

        const preloadedItems = supplierGroup.items.map(item => {
            const cost = Number(item.unitCost) || 0;
            const qty = Number(item.suggestedOrderQty) || 1;
            const taxRate = 0.19;
            const taxAmount = cost * taxRate * qty;
            const subtotal = cost * qty;
            const total = subtotal + taxAmount;

            return {
                product: {
                    id: item.productId,
                    nombre: item.productName,
                    codigoBarras: item.barcode,
                    cantidad: item.currentStock,
                    costPrice: cost
                },
                quantity: qty,
                unitCost: cost,
                taxRate,
                taxAmount,
                subtotal,
                total
            };
        });

        setPurchaseItems(preloadedItems);
        setActiveTab('RECEIVE');
        toast.success(`¡${preloadedItems.length} producto(s) cargados en la recepción para ${supplierGroup.supplierName}!`);
    };

    const handleSendWhatsApp = (supplierGroup) => {
        if (!supplierGroup.supplierPhone) {
            toast.warn(`El proveedor "${supplierGroup.supplierName}" no tiene teléfono registrado. Edita sus datos en el Directorio.`);
            return;
        }
        const cleanPhone = supplierGroup.supplierPhone.replace(/[^0-9]/g, '');
        const phoneWithCountry = cleanPhone.length === 10 ? `57${cleanPhone}` : cleanPhone;
        const encoded = encodeURIComponent(supplierGroup.suggestedWhatsAppMessage || '');
        window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
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

    const filteredForecastItems = useMemo(() => {
        if (!forecastingData || !forecastingData.items) return [];

        return forecastingData.items.filter(item => {
            const matchesSearch = !forecastSearch.trim() ||
                item.productName.toLowerCase().includes(forecastSearch.toLowerCase()) ||
                (item.barcode && item.barcode.includes(forecastSearch)) ||
                (item.category && item.category.toLowerCase().includes(forecastSearch.toLowerCase()));

            if (!matchesSearch) return false;

            if (forecastSupplierFilter !== 'ALL') {
                const sId = item.suggestedSupplierId ? String(item.suggestedSupplierId) : 'NONE';
                if (sId !== String(forecastSupplierFilter)) return false;
            }

            if (forecastFilterStatus === 'RISK') {
                return ['OUT_OF_STOCK', 'CRITICAL', 'LOW_STOCK'].includes(item.stockStatus);
            }
            if (forecastFilterStatus !== 'ALL' && item.stockStatus !== forecastFilterStatus) {
                return false;
            }

            return true;
        });
    }, [forecastingData, forecastSearch, forecastFilterStatus, forecastSupplierFilter]);

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
                <button
                    className={`tab-btn tab-btn-ai ${activeTab === 'FORECASTING' ? 'active' : ''}`}
                    onClick={() => handleTabChange('FORECASTING')}
                >
                    <FaRobot /> Asistente IA Reabastecimiento
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
            {/* TAB 5: ASISTENTE IA DE REABASTECIMIENTO & PRONÓSTICO      */}
            {/* ========================================================= */}
            {activeTab === 'FORECASTING' && (
                <div className="forecasting-tab-content">
                    {/* Header Controls Bar */}
                    <div className="forecast-controls-card">
                        <div className="forecast-title-area">
                            <h3><FaRobot className="icon-ai" /> Asistente Inteligente de Reabastecimiento & Pronóstico (AI)</h3>
                            <p>
                                Proyección algorítmica de agotamiento de stock basada en velocidad histórica de venta por producto y sugerencias de reabastecimiento agrupadas por proveedor.
                            </p>
                        </div>
                        <div className="forecast-controls-form">
                            <div className="control-field">
                                <label><FaHistory /> Ventana de Análisis:</label>
                                <select
                                    value={forecastDays}
                                    onChange={(e) => {
                                        const d = Number(e.target.value);
                                        setForecastDays(d);
                                        loadForecasting(d, forecastTargetDays);
                                    }}
                                    className="form-control"
                                >
                                    <option value={7}>Últimos 7 días (Semanal)</option>
                                    <option value={14}>Últimos 14 días (Quincenal)</option>
                                    <option value={30}>Últimos 30 días (Mensual)</option>
                                </select>
                            </div>
                            <div className="control-field">
                                <label><FaCalendarAlt /> Cobertura Deseada:</label>
                                <select
                                    value={forecastTargetDays}
                                    onChange={(e) => {
                                        const t = Number(e.target.value);
                                        setForecastTargetDays(t);
                                        loadForecasting(forecastDays, t);
                                    }}
                                    className="form-control"
                                >
                                    <option value={7}>7 días de stock</option>
                                    <option value={15}>15 días de stock</option>
                                    <option value={30}>30 días de stock</option>
                                </select>
                            </div>
                            <button
                                className="btn-refresh-forecast"
                                onClick={() => loadForecasting()}
                                disabled={forecastingLoading}
                            >
                                <FaRedo className={forecastingLoading ? 'icon-spin' : ''} />
                                <span>{forecastingLoading ? 'Calculando...' : 'Recalcular'}</span>
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards Grid */}
                    {forecastingData && (
                        <div className="forecast-kpi-grid">
                            <div className="forecast-kpi-card kpi-out">
                                <div className="kpi-icon"><FaTimesCircle /></div>
                                <div className="kpi-info">
                                    <span className="kpi-num">{forecastingData.outOfStockCount}</span>
                                    <span className="kpi-lbl">Agotados (Stock 0)</span>
                                </div>
                            </div>
                            <div className="forecast-kpi-card kpi-crit">
                                <div className="kpi-icon"><FaExclamationTriangle /></div>
                                <div className="kpi-info">
                                    <span className="kpi-num">{forecastingData.criticalCount}</span>
                                    <span className="kpi-lbl">Nivel Crítico (&le; 2 días)</span>
                                </div>
                            </div>
                            <div className="forecast-kpi-card kpi-low">
                                <div className="kpi-icon"><FaClock /></div>
                                <div className="kpi-info">
                                    <span className="kpi-num">{forecastingData.lowStockCount}</span>
                                    <span className="kpi-lbl">Bajo Stock (&le; 5 días)</span>
                                </div>
                            </div>
                            <div className="forecast-kpi-card kpi-reorder">
                                <div className="kpi-icon"><FaBoxes /></div>
                                <div className="kpi-info">
                                    <span className="kpi-num">{forecastingData.reorderRequiredCount}</span>
                                    <span className="kpi-lbl">Ítems a Reordenar</span>
                                </div>
                            </div>
                            <div className="forecast-kpi-card kpi-invest">
                                <div className="kpi-icon"><FaMoneyBillWave /></div>
                                <div className="kpi-info">
                                    <span className="kpi-num">{formatCOP(forecastingData.totalInvestmentRequired)}</span>
                                    <span className="kpi-lbl">Inversión Estimada Requerida</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sección 1: Pedidos Sugeridos Agrupados por Proveedor */}
                    <div className="forecast-section-card">
                        <div className="forecast-section-header">
                            <div>
                                <h4><FaTruck /> Pedidos Sugeridos por Proveedor ({forecastingData?.supplierGroups?.length || 0})</h4>
                                <p>Sugerencias consolidadas por distribuidor habitual para cotizar o emitir en 1 clic.</p>
                            </div>
                        </div>

                        {forecastingLoading ? (
                            <div className="text-center py-5">
                                <div className="forecast-spinner"></div>
                                <p className="mt-2 text-muted">Analizando velocidad de venta y calculando reposición...</p>
                            </div>
                        ) : !forecastingData || forecastingData.supplierGroups.length === 0 ? (
                            <div className="alert-healthy-stock">
                                <FaCheckCircle className="icon-success-large" />
                                <div>
                                    <h5>¡Inventario en Estado Óptimo!</h5>
                                    <p>No se requieren compras inmediatas para los próximos {forecastTargetDays} días según el ritmo de ventas actual.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="supplier-groups-grid">
                                {forecastingData.supplierGroups.map((group, idx) => (
                                    <div key={group.supplierId || `none-${idx}`} className="supplier-group-card">
                                        <div className="group-card-header">
                                            <div>
                                                <h5 className="group-supplier-name">{group.supplierName}</h5>
                                                <span className="group-supplier-meta">
                                                    NIT: {group.supplierNit} {group.supplierPhone ? `• Tel: ${group.supplierPhone}` : ''}
                                                </span>
                                            </div>
                                            <div className="group-cost-badge">
                                                <span>Total Estimado</span>
                                                <strong>{formatCOP(group.totalEstimatedCost)}</strong>
                                            </div>
                                        </div>

                                        <div className="group-card-body">
                                            <div className="group-metrics-pills">
                                                <span className="pill-metric">{group.itemCount} producto{group.itemCount > 1 ? 's' : ''}</span>
                                                <span className="pill-metric">{group.totalUnits} unidades a pedir</span>
                                            </div>

                                            <div className="group-items-preview">
                                                {group.items.slice(0, 4).map(it => (
                                                    <div key={it.productId} className="preview-item-row">
                                                        <span className="preview-name">{it.productName}</span>
                                                        <span className="preview-qty"><strong>{it.suggestedOrderQty}</strong> und</span>
                                                    </div>
                                                ))}
                                                {group.items.length > 4 && (
                                                    <div className="preview-more">
                                                        + {group.items.length - 4} producto(s) adicional(es)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="group-card-actions">
                                            {group.supplierPhone && (
                                                <button
                                                    className="btn-action-whatsapp"
                                                    onClick={() => handleSendWhatsApp(group)}
                                                    title="Abrir chat de WhatsApp con orden formateada"
                                                >
                                                    <FaWhatsapp /> Pedir por WhatsApp
                                                </button>
                                            )}
                                            <button
                                                className="btn-action-convert"
                                                onClick={() => handleConvertToPurchase(group)}
                                                title="Cargar estos ítems en el formulario de recepción de compra"
                                            >
                                                <FaShoppingCart /> Crear Compra Directa
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sección 2: Tabla de Rotación y Pronóstico por Producto */}
                    <div className="forecast-section-card mt-4">
                        <div className="forecast-section-header">
                            <div>
                                <h4><FaBoxes /> Detalle de Rotación y Pronóstico por Producto</h4>
                                <p>Monitoreo individual de rotación, días restantes y estado de cada producto del catálogo.</p>
                            </div>
                        </div>

                        {/* Filtros de Tabla */}
                        <div className="forecast-table-filters">
                            <div className="filter-search-box">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto por nombre, código de barras o categoría..."
                                    value={forecastSearch}
                                    onChange={(e) => setForecastSearch(e.target.value)}
                                    className="form-control"
                                />
                            </div>

                            <div className="filter-select-group">
                                <select
                                    value={forecastFilterStatus}
                                    onChange={(e) => setForecastFilterStatus(e.target.value)}
                                    className="form-control"
                                >
                                    <option value="ALL">Todos los Estados</option>
                                    <option value="RISK">En Riesgo (Agotados + Críticos + Bajo)</option>
                                    <option value="OUT_OF_STOCK">Agotados (Stock 0)</option>
                                    <option value="CRITICAL">Nivel Crítico (&le; 2 días)</option>
                                    <option value="LOW_STOCK">Bajo Stock (&le; 5 días)</option>
                                    <option value="MODERATE">Moderado (6 a 14 días)</option>
                                    <option value="HEALTHY">Saludable (&gt; 14 días)</option>
                                    <option value="NO_MOVEMENT">Sin Rotación</option>
                                </select>

                                <select
                                    value={forecastSupplierFilter}
                                    onChange={(e) => setForecastSupplierFilter(e.target.value)}
                                    className="form-control"
                                >
                                    <option value="ALL">Todos los Proveedores</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={String(s.id)}>{s.companyName}</option>
                                    ))}
                                    <option value="NONE">Sin Proveedor Asignado</option>
                                </select>
                            </div>
                        </div>

                        {/* Tabla de Productos */}
                        <div className="table-responsive">
                            <table className="purchases-table forecast-table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Stock Actual</th>
                                        <th>Ventas ({forecastDays}d)</th>
                                        <th>Velocidad Diaria</th>
                                        <th>Días Restantes</th>
                                        <th>Nivel de Riesgo</th>
                                        <th>Cantidad Sugerida</th>
                                        <th>Inversión Estimada</th>
                                        <th>Proveedor Sugerido</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredForecastItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="text-center py-4 text-muted">
                                                No se encontraron productos que coincidan con los filtros seleccionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredForecastItems.map(item => {
                                            const statusBadges = {
                                                OUT_OF_STOCK: { label: 'Agotado', cls: 'badge-status-out' },
                                                CRITICAL: { label: 'Crítico', cls: 'badge-status-crit' },
                                                LOW_STOCK: { label: 'Bajo Stock', cls: 'badge-status-low' },
                                                MODERATE: { label: 'Moderado', cls: 'badge-status-mod' },
                                                HEALTHY: { label: 'Saludable', cls: 'badge-status-ok' },
                                                NO_MOVEMENT: { label: 'Sin Ventas', cls: 'badge-status-none' }
                                            };
                                            const badge = statusBadges[item.stockStatus] || { label: item.stockStatus, cls: '' };

                                            return (
                                                <tr key={item.productId}>
                                                    <td>
                                                        <div className="item-name-cell">
                                                            <strong>{item.productName}</strong>
                                                            <span className="item-sub-meta">
                                                                {item.category || 'General'} {item.barcode ? `• Cód: ${item.barcode}` : ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={item.currentStock <= 0 ? 'text-danger font-bold' : (item.currentStock <= item.minStock ? 'text-warning font-bold' : '')}>
                                                            {item.currentStock} und (Mín: {item.minStock})
                                                        </span>
                                                    </td>
                                                    <td>{item.totalSoldInPeriod} und</td>
                                                    <td><strong>{item.dailySaleVelocity}</strong> /día</td>
                                                    <td>
                                                        {item.estimatedDaysRemaining != null ? (
                                                            <span className={item.estimatedDaysRemaining <= 2 ? 'text-danger font-bold' : (item.estimatedDaysRemaining <= 5 ? 'text-warning font-bold' : '')}>
                                                                {item.estimatedDaysRemaining} días
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`forecast-status-badge ${badge.cls}`}>
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {item.suggestedOrderQty > 0 ? (
                                                            <strong className="text-primary font-bold">
                                                                +{item.suggestedOrderQty} und
                                                            </strong>
                                                        ) : (
                                                            <span className="text-muted">0</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {item.suggestedOrderQty > 0 ? (
                                                            <strong>{formatCOP(item.estimatedOrderCost)}</strong>
                                                        ) : (
                                                            <span className="text-muted">$0</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="supplier-col-name">{item.suggestedSupplierName}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
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
