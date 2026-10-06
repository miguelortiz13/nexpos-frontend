import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaSearch,
    FaShoppingCart,
    FaTrash,
    FaPlus,
    FaMinus,
    FaMoneyBillWave,
    FaBarcode,
    FaBox,
    FaCheckCircle,
    FaFilePdf,
    FaCreditCard,
    FaMobileAlt,
    FaTimes,
    FaRedo,
    FaReceipt,
    FaTh,
    FaList,
    FaPrint,
    FaUserPlus,
    FaUserCheck
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import useHardwareScanner from '../../hooks/useHardwareScanner';
import ThermalReceiptModal from '../../components/common/ThermalReceiptModal';
import CustomerFormModal from '../../components/common/CustomerFormModal';
import { playBarcodeBeep } from '../../utils/audio';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../api/client';
import cashShiftService from '../../api/cashShiftService';
import customerService from '../../api/customerService';
import './SalesPage.css';

const formatCOP = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
};

const SalesPage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [activeShift, setActiveShift] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('TODAS');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('pos_view_mode') || 'grid');

    // Modal de Pago
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
    const [amountPaid, setAmountPaid] = useState('');
    const [customerId, setCustomerId] = useState(1);
    const [customerName, setCustomerName] = useState('Consumidor Final');
    const [customerDoc, setCustomerDoc] = useState('222222222222');
    const [customerEmail, setCustomerEmail] = useState('facturacion@nexpos.com.co');
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [customerSuggestions, setCustomerSuggestions] = useState([]);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    // Modal de Factura / Éxito
    const [completedSale, setCompletedSale] = useState(null);
    const [showThermalReceipt, setShowThermalReceipt] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchActiveShift();
    }, []);

    const fetchActiveShift = async () => {
        try {
            const shift = await cashShiftService.getActiveShift();
            setActiveShift(shift || null);
        } catch (error) {
            console.error('Error al consultar turno activo:', error);
        }
    };

    useEffect(() => {
        localStorage.setItem('pos_view_mode', viewMode);
    }, [viewMode]);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/api/productos');
            setProducts(res.data);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            toast.error('Error al cargar inventario');
        }
    };

    // Extract unique categories for POS quick filtering
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.categoria).filter(Boolean));
        return ['TODAS', ...Array.from(cats)];
    }, [products]);

    const addToCart = (product, quantity = 1) => {
        if (!product || product.cantidad <= 0) {
            toast.error('Producto sin stock disponible');
            return;
        }

        const existing = cart.find(item => item.id === product.id);
        const currentQtyInCart = existing ? existing.quantity : 0;
        const newTotalQty = currentQtyInCart + quantity;

        if (newTotalQty > product.cantidad) {
            toast.warn(`Stock insuficiente. Solo quedan ${product.cantidad} unidades en inventario.`);
            return;
        }

        setCart(prev => {
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { ...product, quantity }];
        });
    };

    // Global Hardware Scanner Listener (USB / Bluetooth / Wireless handheld readers)
    const handleHardwareScan = (scannedCode) => {
        const code = scannedCode.trim();
        const product = products.find(p => p.codigoBarras === code || p.id?.toString() === code);

        if (product) {
            if (product.cantidad <= 0) {
                playBarcodeBeep('error');
                toast.error(`Producto agotado: ${product.nombre}`);
                return;
            }
            addToCart(product, 1);
            toast.success(`✓ ${product.nombre} agregado al carrito`);
        } else {
            playBarcodeBeep('error');
            toast.warn(`Código no registrado: ${code}`);
            setSearchTerm(code);
        }
    };

    useHardwareScanner({
        onScan: handleHardwareScan,
        enabled: !showPaymentModal && !completedSale && !showScanner
    });

    const handleCameraScan = (code) => {
        const product = products.find(p => p.codigoBarras === code || p.id?.toString() === code);
        if (product) {
            if (product.cantidad <= 0) {
                toast.error(`Producto agotado: ${product.nombre}`);
                return;
            }
            addToCart(product, 1);
            toast.success(`Escaneado: ${product.nombre}`);
            setShowScanner(false);
        } else {
            toast.warn(`Producto no encontrado con código: ${code}`);
            setSearchTerm(code);
        }
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('¿Deseas vaciar todos los productos del carrito?')) {
            setCart([]);
        }
    };

    const updateQuantity = (productId, delta) => {
        const itemInCart = cart.find(i => i.id === productId);
        if (!itemInCart) return;

        const product = products.find(p => p.id === productId);
        const newQty = itemInCart.quantity + delta;

        if (newQty <= 0) {
            removeFromCart(productId);
            return;
        }

        if (product && newQty > product.cantidad) {
            toast.warn(`Stock máximo disponible alcanzado (${product.cantidad} unidades).`);
            return;
        }

        setCart(prev => prev.map(item =>
            item.id === productId ? { ...item, quantity: newQty } : item
        ));
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (Number(item.precio) * item.quantity), 0);
    };

    const openCheckout = () => {
        if (cart.length === 0) return;
        const total = calculateTotal();
        setPaymentMethod('EFECTIVO');
        setAmountPaid(total.toString());
        setCustomerName('Consumidor Final');
        setCustomerDoc('222222222222');
        setShowPaymentModal(true);
    };

    const handleCustomerSearch = async (query) => {
        setCustomerSearchQuery(query);
        if (!query || query.trim().length < 2) {
            setCustomerSuggestions([]);
            return;
        }
        try {
            const results = await customerService.search(query.trim());
            setCustomerSuggestions(results || []);
        } catch {
            setCustomerSuggestions([]);
        }
    };

    const selectCustomer = (cust) => {
        setCustomerId(cust.id);
        setCustomerDoc(cust.docNumber);
        setCustomerName(cust.name);
        setCustomerEmail(cust.email || 'facturacion@nexpos.com.co');
        setCustomerSuggestions([]);
        setCustomerSearchQuery('');
    };

    const resetToConsumidorFinal = () => {
        setCustomerId(1);
        setCustomerDoc('222222222222');
        setCustomerName('Consumidor Final');
        setCustomerEmail('facturacion@nexpos.com.co');
        setCustomerSuggestions([]);
        setCustomerSearchQuery('');
    };

    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        const total = calculateTotal();
        const paid = Number(amountPaid) || total;

        if (paymentMethod === 'EFECTIVO' && paid < total) {
            toast.error(`El monto recibido (${formatCOP(paid)}) no puede ser menor al total (${formatCOP(total)})`);
            return;
        }

        setLoading(true);

        const saleRequest = {
            customerId: customerId || 1,
            customerName: customerName.trim() || 'Consumidor Final',
            customerDoc: customerDoc.trim() || '222222222222',
            customerEmail: customerEmail?.trim() || null,
            paymentMethod,
            amountPaid: paymentMethod === 'EFECTIVO' ? paid : total,
            items: cart.map(item => ({
                productId: item.id,
                quantity: item.quantity
            }))
        };

        try {
            const res = await api.post('/api/sales', saleRequest);
            const createdSale = res.data;

            toast.success('¡Venta realizada con éxito!');
            setCompletedSale(createdSale);
            setShowPaymentModal(false);
            setCart([]);

            await fetchProducts();
            await fetchActiveShift();
        } catch (error) {
            console.error('Error al procesar la venta:', error);
            const msg = error.response?.data?.message || error.message || 'Error al procesar la venta';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const downloadInvoice = async (saleId) => {
        try {
            const response = await api.get(`/api/sales/${saleId}/invoice`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `factura_nexpos_${saleId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al descargar factura:', error);
            toast.error('Error al descargar la factura PDF');
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'TODAS' || p.categoria === selectedCategory;
        const matchesSearch = !searchTerm ||
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.codigoBarras && p.codigoBarras.includes(searchTerm)) ||
            (p.marca && p.marca.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const total = calculateTotal();
    const paidNumber = Number(amountPaid) || 0;
    const change = Math.max(0, paidNumber - total);

    return (
        <div className="pos-layout">
            <ToastContainer autoClose={2000} position="top-right" />

            {/* Left Main Section: Catalog & Search */}
            <div className="pos-main-panel">
                {/* Indicador de Turno de Caja */}
                {activeShift ? (
                    <div className="pos-shift-indicator-bar open">
                        <div className="shift-indicator-info">
                            <span className="shift-status-dot"></span>
                            <span>
                                <strong>Turno #{activeShift.id} Activo</strong> ({activeShift.cashierUsername}) • Base: {formatCOP(activeShift.initialAmount)} • Ventas Turno: {formatCOP(activeShift.totalSalesAmount)}
                            </span>
                        </div>
                        <button className="btn-shift-link" onClick={() => navigate('/caja')}>
                            <FaMoneyBillWave /> Control de Caja & Arqueo
                        </button>
                    </div>
                ) : (
                    <div className="pos-shift-indicator-bar warning">
                        <div className="shift-indicator-info">
                            <span>⚠️ <strong>Caja Cerrada:</strong> No hay un turno activo. Abre tu turno para controlar el flujo de efectivo y arqueo.</span>
                        </div>
                        <button className="btn-shift-open-fast" onClick={() => navigate('/caja')}>
                            <FaPlus /> Iniciar Turno
                        </button>
                    </div>
                )}

                {/* Search Bar & Scanner Trigger */}
                <div className="pos-search-header">
                    <div className="pos-search-wrapper">
                        <FaSearch className="pos-search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar o escanear con pistola láser USB..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                className="pos-search-clear"
                                onClick={() => setSearchTerm('')}
                                title="Limpiar búsqueda"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                    <button
                        className="btn-pos-scanner"
                        onClick={() => setShowScanner(true)}
                        title="Abrir escáner con cámara"
                    >
                        <FaBarcode />
                        <span>Cámara</span>
                    </button>
                </div>

                {/* Category Row with Dual View Mode Selector */}
                <div className="pos-category-row">
                    <div className="pos-category-bar">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                className={`pos-category-pill ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="pos-view-mode-toggle" title="Cambiar modo de visualización">
                        <button
                            className={`btn-view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Vista Cuadrícula (Cards)"
                        >
                            <FaTh />
                        </button>
                        <button
                            className={`btn-view-toggle ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="Vista Lista Compacta (Tabla POS)"
                        >
                            <FaList />
                        </button>
                    </div>
                </div>

                {/* Products View: Grid vs List */}
                {viewMode === 'grid' ? (
                    <div className="pos-products-grid">
                        {filteredProducts.map(product => {
                            const inCart = cart.find(item => item.id === product.id);
                            const isOutOfStock = product.cantidad <= 0;
                            const isLowStock = product.cantidad > 0 && product.cantidad <= 5;

                            return (
                                <div
                                    key={product.id}
                                    className={`pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                                    onClick={() => {
                                        if (!isOutOfStock) {
                                            addToCart(product, 1);
                                        }
                                    }}
                                >
                                    <div className="pos-card-header">
                                        <span className="pos-card-category">{product.categoria || 'General'}</span>
                                        <span className={`pos-stock-chip ${isOutOfStock ? 'empty' : isLowStock ? 'low' : 'ok'}`}>
                                            {isOutOfStock ? 'AGOTADO' : `${product.cantidad} disp.`}
                                        </span>
                                    </div>

                                    <div className="pos-card-body">
                                        <h4 className="pos-card-title">{product.nombre}</h4>
                                        <span className="pos-card-brand">{product.marca || 'Genérico'}</span>
                                    </div>

                                    <div className="pos-card-footer">
                                        <span className="pos-card-price">{formatCOP(product.precio)}</span>
                                        {inCart ? (
                                            <span className="pos-cart-badge">{inCart.quantity} en caja</span>
                                        ) : (
                                            <button
                                                className="pos-quick-add-btn"
                                                disabled={isOutOfStock}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart(product, 1);
                                                }}
                                                title="Agregar"
                                            >
                                                <FaPlus />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredProducts.length === 0 && (
                            <div className="pos-no-products">
                                <FaBox size={40} />
                                <p>No se encontraron productos con estos criterios</p>
                                <button onClick={() => { setSearchTerm(''); setSelectedCategory('TODAS'); }}>
                                    Restablecer filtros
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Vista Lista Compacta (Alta densidad para cajeros) */
                    <div className="pos-products-list-wrapper">
                        <table className="pos-list-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Producto</th>
                                    <th>Marca</th>
                                    <th className="text-right">Precio</th>
                                    <th className="text-center">Stock</th>
                                    <th className="text-center">Agregar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(product => {
                                    const inCart = cart.find(item => item.id === product.id);
                                    const isOutOfStock = product.cantidad <= 0;
                                    const isLowStock = product.cantidad > 0 && product.cantidad <= 5;

                                    return (
                                        <tr
                                            key={product.id}
                                            className={`pos-list-row ${isOutOfStock ? 'out-of-stock' : ''}`}
                                            onClick={() => !isOutOfStock && addToCart(product, 1)}
                                        >
                                            <td className="list-barcode-col">
                                                <FaBarcode /> {product.codigoBarras || product.id}
                                            </td>
                                            <td className="list-name-col">
                                                <strong>{product.nombre}</strong>
                                                {inCart && (
                                                    <span className="list-in-cart-indicator">
                                                        ({inCart.quantity} en caja)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="list-brand-col">{product.marca || 'Genérico'}</td>
                                            <td className="text-right list-price-col">
                                                {formatCOP(product.precio)}
                                            </td>
                                            <td className="text-center">
                                                <span className={`pos-stock-chip ${isOutOfStock ? 'empty' : isLowStock ? 'low' : 'ok'}`}>
                                                    {isOutOfStock ? 'Agotado' : `${product.cantidad} disp.`}
                                                </span>
                                            </td>
                                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className="btn-list-add"
                                                    disabled={isOutOfStock}
                                                    onClick={() => addToCart(product, 1)}
                                                    title="Agregar a la cuenta"
                                                >
                                                    <FaPlus />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="empty-list-cell">
                                            No se encontraron productos
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Right Side: POS Register & Cart Summary */}
            <div className="pos-cart-panel">
                <div className="pos-cart-header">
                    <div className="cart-title-wrapper">
                        <FaShoppingCart className="cart-icon" />
                        <h3>Caja Registradora</h3>
                    </div>
                    {cart.length > 0 && (
                        <button className="btn-clear-cart" onClick={clearCart} title="Vaciar Carrito">
                            <FaTrash />
                        </button>
                    )}
                </div>

                {/* Cart Line Items */}
                <div className="pos-cart-items">
                    {cart.length > 0 ? (
                        cart.map(item => (
                            <div key={item.id} className="pos-cart-row">
                                <div className="cart-row-info">
                                    <h5 className="cart-item-name">{item.nombre}</h5>
                                    <span className="cart-item-unit-price">
                                        {formatCOP(item.precio)} c/u
                                    </span>
                                </div>

                                <div className="cart-row-controls">
                                    <div className="cart-qty-buttons">
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            className="qty-btn"
                                            title="Disminuir"
                                        >
                                            <FaMinus />
                                        </button>
                                        <span className="qty-number">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="qty-btn"
                                            title="Aumentar"
                                        >
                                            <FaPlus />
                                        </button>
                                    </div>
                                    <span className="cart-row-subtotal">
                                        {formatCOP(Number(item.precio) * item.quantity)}
                                    </span>
                                    <button
                                        className="btn-remove-item"
                                        onClick={() => removeFromCart(item.id)}
                                        title="Eliminar producto"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="pos-empty-cart">
                            <FaReceipt className="empty-cart-icon" />
                            <h4>Caja en Espera</h4>
                            <p>Escanea con lector láser USB o toca un producto para iniciar la venta.</p>
                        </div>
                    )}
                </div>

                {/* Cart Total Breakdown & Checkout Button */}
                <div className="pos-checkout-section">
                    <div className="pos-summary-breakdown">
                        <div className="summary-line">
                            <span>Artículos:</span>
                            <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} unidades</span>
                        </div>
                        <div className="summary-line">
                            <span>IVA (Incluido):</span>
                            <span>{formatCOP(0)}</span>
                        </div>
                        <div className="summary-line total-line">
                            <span>TOTAL:</span>
                            <span className="grand-total-amount">{formatCOP(total)}</span>
                        </div>
                    </div>

                    <button
                        className="btn-pos-checkout"
                        disabled={cart.length === 0 || loading}
                        onClick={openCheckout}
                    >
                        <FaMoneyBillWave />
                        <span>COBRAR ({formatCOP(total)})</span>
                    </button>
                </div>
            </div>

            {/* Redesigned Camera Scanner Modal */}
            {showScanner && (
                <div className="modal-overlay">
                    <BarcodeScanner
                        onScan={handleCameraScan}
                        onClose={() => setShowScanner(false)}
                    />
                </div>
            )}

            {/* Payment & Checkout Modal */}
            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal-content payment-modal-box">
                        <div className="modal-header-styled">
                            <h3><FaMoneyBillWave /> Cobro y Facturación</h3>
                            <button className="btn-close-modal" onClick={() => setShowPaymentModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="payment-total-banner">
                            <span className="total-banner-label">TOTAL A COBRAR</span>
                            <span className="total-banner-value">{formatCOP(total)}</span>
                        </div>

                        <form onSubmit={handleConfirmPayment}>
                            {/* Customer Information & DIAN Selection */}
                            <div className="customer-selection-card">
                                <div className="customer-card-header">
                                    <label>Cliente / Facturación DIAN</label>
                                    <div className="customer-card-actions">
                                        <button
                                            type="button"
                                            className={`btn-cust-pill ${customerDoc === '222222222222' ? 'primary' : ''}`}
                                            onClick={resetToConsumidorFinal}
                                            title="Asignar Consumidor Final predeterminado"
                                        >
                                            Consumidor Final
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-cust-pill"
                                            onClick={() => setShowCustomerModal(true)}
                                            title="Registrar nuevo cliente con Cédula/NIT y correo"
                                        >
                                            <FaUserPlus /> + Nuevo
                                        </button>
                                    </div>
                                </div>

                                {/* Smart Autocomplete / Search Box */}
                                <div className="customer-search-box-pos">
                                    <input
                                        type="text"
                                        className="customer-search-input"
                                        placeholder="Buscar por Cédula, NIT o Nombre..."
                                        value={customerSearchQuery}
                                        onChange={e => handleCustomerSearch(e.target.value)}
                                    />
                                    {customerSuggestions.length > 0 && (
                                        <div className="customer-suggestions-dropdown">
                                            {customerSuggestions.map(cust => (
                                                <div
                                                    key={cust.id}
                                                    className="customer-suggestion-item"
                                                    onClick={() => selectCustomer(cust)}
                                                >
                                                    <div>
                                                        <div className="cust-sugg-name">{cust.name}</div>
                                                        <div className="cust-sugg-meta">
                                                            <span>{cust.docType} {cust.docNumber}</span>
                                                            {cust.email && <span>• {cust.email}</span>}
                                                        </div>
                                                    </div>
                                                    <FaCheckCircle style={{ color: 'var(--primary)' }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Active Customer Badge */}
                                <div className="active-customer-badge">
                                    <div className="active-cust-info">
                                        <span className="active-cust-name">{customerName}</span>
                                        <div className="active-cust-details">
                                            <span>Doc: {customerDoc}</span>
                                            {customerEmail && (
                                                <span className="dian-email-tag">• Email DIAN: {customerEmail}</span>
                                            )}
                                        </div>
                                    </div>
                                    <FaUserCheck style={{ color: 'var(--primary)', fontSize: '1.2rem' }} />
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="form-group-pos">
                                <label>Método de Pago</label>
                                <div className="payment-methods-grid">
                                    <button
                                        type="button"
                                        className={`btn-method-choice ${paymentMethod === 'EFECTIVO' ? 'active' : ''}`}
                                        onClick={() => {
                                            setPaymentMethod('EFECTIVO');
                                            setAmountPaid(total.toString());
                                        }}
                                    >
                                        <FaMoneyBillWave />
                                        <span>Efectivo</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn-method-choice ${paymentMethod === 'TARJETA' ? 'active' : ''}`}
                                        onClick={() => {
                                            setPaymentMethod('TARJETA');
                                            setAmountPaid(total.toString());
                                        }}
                                    >
                                        <FaCreditCard />
                                        <span>Tarjeta</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn-method-choice ${paymentMethod === 'TRANSFERENCIA' ? 'active' : ''}`}
                                        onClick={() => {
                                            setPaymentMethod('TRANSFERENCIA');
                                            setAmountPaid(total.toString());
                                        }}
                                    >
                                        <FaMobileAlt />
                                        <span>Transferencia / Nequi</span>
                                    </button>
                                </div>
                            </div>

                            {/* Cash Input & Quick Bills */}
                            {paymentMethod === 'EFECTIVO' && (
                                <div className="cash-payment-card">
                                    <div className="form-group-pos">
                                        <label>Monto Recibido del Cliente ($)</label>
                                        <input
                                            type="number"
                                            step="100"
                                            min={total}
                                            value={amountPaid}
                                            onChange={e => setAmountPaid(e.target.value)}
                                            required
                                            autoFocus
                                            className="cash-input"
                                        />
                                    </div>

                                    {/* Denomination shortcuts */}
                                    <div className="quick-denominations">
                                        <button type="button" onClick={() => setAmountPaid(total.toString())}>
                                            Exacto ({formatCOP(total)})
                                        </button>
                                        <button type="button" onClick={() => setAmountPaid((Math.ceil(total / 10000) * 10000).toString())}>
                                            Redondeo
                                        </button>
                                        <button type="button" onClick={() => setAmountPaid((paidNumber + 10000).toString())}>
                                            + $10.000
                                        </button>
                                        <button type="button" onClick={() => setAmountPaid((paidNumber + 20000).toString())}>
                                            + $20.000
                                        </button>
                                        <button type="button" onClick={() => setAmountPaid((paidNumber + 50000).toString())}>
                                            + $50.000
                                        </button>
                                        <button type="button" onClick={() => setAmountPaid((paidNumber + 100000).toString())}>
                                            + $100.000
                                        </button>
                                    </div>

                                    {/* Cambio / Vuelto Display */}
                                    <div className={`change-display-box ${paidNumber < total ? 'error' : ''}`}>
                                        <span className="change-label">Cambio / Vuelto al Cliente:</span>
                                        <span className="change-amount-value">{formatCOP(change)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="modal-footer-actions">
                                <button
                                    type="button"
                                    className="btn-modal-cancel"
                                    onClick={() => setShowPaymentModal(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modal-confirm"
                                    disabled={loading || (paymentMethod === 'EFECTIVO' && paidNumber < total)}
                                >
                                    {loading ? 'Procesando Venta...' : `Confirmar Cobro • ${formatCOP(total)}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success / Invoice Modal */}
            {completedSale && (
                <div className="modal-overlay">
                    <div className="modal-content success-modal-box">
                        <div className="success-icon-wrapper">
                            <FaCheckCircle className="success-check-icon" />
                        </div>
                        <h3>¡Venta Completada con Éxito!</h3>
                        <p className="success-invoice-id">Factura Oficial No. #{completedSale.id}</p>

                        <div className="success-ticket-card">
                            <div className="ticket-line">
                                <span>Cliente:</span>
                                <strong>{completedSale.customerName}</strong>
                            </div>
                            <div className="ticket-line">
                                <span>C.C. / NIT:</span>
                                <strong>{completedSale.customerDoc}</strong>
                            </div>
                            <div className="ticket-line">
                                <span>Medio de Pago:</span>
                                <strong>{completedSale.paymentMethod}</strong>
                            </div>
                            <div className="ticket-line total">
                                <span>Total Cobrado:</span>
                                <strong className="ticket-total">{formatCOP(completedSale.totalAmount)}</strong>
                            </div>
                            {completedSale.paymentMethod === 'EFECTIVO' && (
                                <div className="ticket-line change">
                                    <span>Cambio Entregado:</span>
                                    <strong>{formatCOP(completedSale.changeAmount)}</strong>
                                </div>
                            )}
                        </div>

                        <div className="success-modal-buttons">
                            <button
                                className="btn-print-thermal-action"
                                onClick={() => setShowThermalReceipt(true)}
                                title="Imprimir tiquete de caja para impresora térmica (58mm/80mm)"
                            >
                                <FaPrint />
                                <span>Tiquete POS</span>
                            </button>
                            <button
                                className="btn-download-pdf"
                                onClick={() => downloadInvoice(completedSale.id)}
                            >
                                <FaFilePdf />
                                <span>Factura PDF</span>
                            </button>
                            <button
                                className="btn-next-sale"
                                onClick={() => {
                                    setCompletedSale(null);
                                    setShowThermalReceipt(false);
                                }}
                            >
                                <FaRedo />
                                <span>Nueva Venta</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Tiquete Térmico POS (58mm / 80mm) */}
            <ThermalReceiptModal
                sale={completedSale}
                isOpen={showThermalReceipt}
                onClose={() => setShowThermalReceipt(false)}
            />

            {/* Modal de Registro Rápido de Clientes POS */}
            <CustomerFormModal
                isOpen={showCustomerModal}
                onClose={() => setShowCustomerModal(false)}
                onCustomerSaved={selectCustomer}
                initialDocNumber={customerSearchQuery}
            />
        </div>
    );
};

export default SalesPage;
