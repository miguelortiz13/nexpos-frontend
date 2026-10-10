import { useState, useEffect, useMemo } from 'react';
import {
    FaUsers,
    FaPlus,
    FaSearch,
    FaEnvelope,
    FaMoneyBillWave,
    FaHandHoldingUsd,
    FaHistory,
    FaEdit,
    FaCreditCard,
    FaCheckCircle,
    FaExclamationCircle
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import customerService from '../../api/customerService';
import CustomerFormModal from '../../components/common/CustomerFormModal';
import CustomerPaymentModal from '../../components/common/CustomerPaymentModal';
import CustomerCreditHistoryModal from '../../components/common/CustomerCreditHistoryModal';
import CreditPaymentReceiptModal from '../../components/common/CreditPaymentReceiptModal';
import 'react-toastify/dist/ReactToastify.css';
import './CustomersPage.css';

const formatCOP = (val) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(val) || 0);
};

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL'); // ALL, WITH_DEBT, CREDIT_ENABLED
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showFormModal, setShowFormModal] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState(null);
    const [customerToPay, setCustomerToPay] = useState(null);
    const [customerHistoryToView, setCustomerHistoryToView] = useState(null);
    const [paymentReceiptToView, setPaymentReceiptToView] = useState(null);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await customerService.getAll();
            setCustomers(data || []);
        } catch (err) {
            console.error('Error al cargar clientes:', err);
            toast.error('No se pudo cargar la lista de clientes');
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = useMemo(() => {
        let list = customers;

        if (filterCategory === 'WITH_DEBT') {
            list = list.filter(c => Number(c.currentDebt) > 0);
        } else if (filterCategory === 'CREDIT_ENABLED') {
            list = list.filter(c => Boolean(c.creditAllowed));
        }

        if (!searchTerm) return list;
        const q = searchTerm.toLowerCase();
        return list.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.docNumber.toLowerCase().includes(q) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q))
        );
    }, [customers, searchTerm, filterCategory]);

    // Financial KPIs
    const totalCustomers = customers.length;
    const totalDebt = customers.reduce((sum, c) => sum + (Number(c.currentDebt) || 0), 0);
    const withDebtCount = customers.filter(c => Number(c.currentDebt) > 0).length;
    const creditEnabledCount = customers.filter(c => Boolean(c.creditAllowed)).length;
    const totalCreditLimit = customers.reduce((sum, c) => sum + (Number(c.creditLimit) || 0), 0);

    const handleCustomerSaved = (savedCust) => {
        setCustomers(prev => {
            const exists = prev.find(c => c.id === savedCust.id);
            if (exists) {
                return prev.map(c => c.id === savedCust.id ? savedCust : c);
            }
            return [savedCust, ...prev];
        });
        setCustomerToEdit(null);
    };

    const handlePaymentSuccess = (movement) => {
        loadCustomers();
        if (customerToPay) {
            setPaymentReceiptToView({
                movement,
                customer: customerToPay
            });
        }
    };

    const openEditModal = (cust) => {
        setCustomerToEdit(cust);
        setShowFormModal(true);
    };

    const openCreateModal = () => {
        setCustomerToEdit(null);
        setShowFormModal(true);
    };

    return (
        <div className="customers-dashboard">
            <ToastContainer autoClose={2000} position="top-right" />

            <div className="customers-header-bar">
                <div>
                    <h2><FaUsers /> Clientes & Cartera (Crédito POS)</h2>
                    <p className="customers-subtitle">
                        Directorio de clientes, facturación electrónica DIAN y control de cuentas por cobrar (fiado)
                    </p>
                </div>
                <button
                    className="btn-create-customer"
                    onClick={openCreateModal}
                >
                    <FaPlus /> Nuevo Cliente
                </button>
            </div>

            {/* KPI Cards */}
            <div className="customers-kpi-grid">
                <div className="customers-kpi-card">
                    <div className="kpi-icon-cust primary">
                        <FaUsers />
                    </div>
                    <div>
                        <div className="kpi-label">Total Clientes</div>
                        <div className="kpi-value primary">{totalCustomers}</div>
                    </div>
                </div>

                <div className="customers-kpi-card danger-card">
                    <div className="kpi-icon-cust danger">
                        <FaHandHoldingUsd />
                    </div>
                    <div>
                        <div className="kpi-label">Cartera por Cobrar (Deuda)</div>
                        <div className="kpi-value danger">{formatCOP(totalDebt)}</div>
                        <div className="kpi-subtext">{withDebtCount} clientes con saldo pendiente</div>
                    </div>
                </div>

                <div className="customers-kpi-card info-card">
                    <div className="kpi-icon-cust info">
                        <FaCreditCard />
                    </div>
                    <div>
                        <div className="kpi-label">Cupo Total Otorgado</div>
                        <div className="kpi-value info">{formatCOP(totalCreditLimit)}</div>
                        <div className="kpi-subtext">{creditEnabledCount} clientes con cupo activo</div>
                    </div>
                </div>
            </div>

            {/* Search Bar & Category Filters */}
            <div className="customers-toolbar-row">
                <div className="customers-search-input-box">
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula, NIT, teléfono o correo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="customers-category-tabs">
                    <button
                        className={`btn-tab ${filterCategory === 'ALL' ? 'active' : ''}`}
                        onClick={() => setFilterCategory('ALL')}
                    >
                        Todos ({customers.length})
                    </button>
                    <button
                        className={`btn-tab debt-tab ${filterCategory === 'WITH_DEBT' ? 'active' : ''}`}
                        onClick={() => setFilterCategory('WITH_DEBT')}
                    >
                        Con Deuda ({withDebtCount})
                    </button>
                    <button
                        className={`btn-tab credit-tab ${filterCategory === 'CREDIT_ENABLED' ? 'active' : ''}`}
                        onClick={() => setFilterCategory('CREDIT_ENABLED')}
                    >
                        Con Cupo Habilitado ({creditEnabledCount})
                    </button>
                </div>
            </div>

            {/* Customers Table */}
            <div className="customers-table-card">
                <table className="customers-data-table">
                    <thead>
                        <tr>
                            <th>Identificación</th>
                            <th>Nombre / Razón Social</th>
                            <th>Contacto</th>
                            <th>Estado de Cartera / Cupo</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="cust-empty-state">
                                    Cargando clientes y cartera...
                                </td>
                            </tr>
                        ) : filteredCustomers.length > 0 ? (
                            filteredCustomers.map(cust => {
                                const debt = Number(cust.currentDebt) || 0;
                                const limit = Number(cust.creditLimit) || 0;
                                const usagePercent = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;

                                return (
                                    <tr key={cust.id} className={debt > 0 ? 'row-with-debt' : ''}>
                                        <td>
                                            <span className="doc-badge-pill">
                                                {cust.docType} {cust.docNumber}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="cust-name-cell">
                                                <strong>{cust.name}</strong>
                                                <span className="cust-city-sub">{cust.city || 'Cali'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="cust-contact-cell">
                                                {cust.email && (
                                                    <span className="email-chip" title="Correo para factura DIAN">
                                                        <FaEnvelope /> {cust.email}
                                                    </span>
                                                )}
                                                {cust.phone && (
                                                    <span className="phone-chip">
                                                        {cust.phone}
                                                    </span>
                                                )}
                                                {!cust.email && !cust.phone && (
                                                    <span className="empty-contact">Sin contacto</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {cust.creditAllowed ? (
                                                <div className="credit-status-cell">
                                                    <div className="credit-amounts-row">
                                                        {debt > 0 ? (
                                                            <span className="debt-pill alert">
                                                                <FaExclamationCircle /> Deuda: {formatCOP(debt)}
                                                            </span>
                                                        ) : (
                                                            <span className="debt-pill clean">
                                                                <FaCheckCircle /> Al Día ($0)
                                                            </span>
                                                        )}
                                                        <span className="limit-sub">Cupo: {formatCOP(limit)}</span>
                                                    </div>
                                                    {limit > 0 && (
                                                        <div className="credit-progress-bar" title={`Uso de cupo: ${usagePercent}%`}>
                                                            <div
                                                                className={`progress-fill ${usagePercent > 80 ? 'danger' : usagePercent > 50 ? 'warning' : 'ok'}`}
                                                                style={{ width: `${usagePercent}%` }}
                                                            ></div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="no-credit-badge">
                                                    Sin Crédito
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <div className="cust-actions-flex">
                                                {debt > 0 && (
                                                    <button
                                                        className="btn-action-pay"
                                                        onClick={() => setCustomerToPay(cust)}
                                                        title="Registrar abono o pago a deuda"
                                                    >
                                                        <FaMoneyBillWave /> Abonar
                                                    </button>
                                                )}

                                                <button
                                                    className="btn-action-history"
                                                    onClick={() => setCustomerHistoryToView(cust)}
                                                    title="Ver estado de cuenta e historial de movimientos"
                                                >
                                                    <FaHistory /> Estado Cuenta
                                                </button>

                                                <button
                                                    className="btn-action-edit"
                                                    onClick={() => openEditModal(cust)}
                                                    title="Editar datos y configurar cupo de crédito"
                                                >
                                                    <FaEdit />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="5" className="cust-empty-state">
                                    No se encontraron clientes con los filtros seleccionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Registro / Edición de Cliente */}
            <CustomerFormModal
                isOpen={showFormModal}
                onClose={() => {
                    setShowFormModal(false);
                    setCustomerToEdit(null);
                }}
                onCustomerSaved={handleCustomerSaved}
                customerToEdit={customerToEdit}
            />

            {/* Modal de Abono a Cartera */}
            {customerToPay && (
                <CustomerPaymentModal
                    isOpen={Boolean(customerToPay)}
                    onClose={() => setCustomerToPay(null)}
                    customer={customerToPay}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}

            {/* Modal de Historial / Estado de Cuenta */}
            {customerHistoryToView && (
                <CustomerCreditHistoryModal
                    isOpen={Boolean(customerHistoryToView)}
                    onClose={() => setCustomerHistoryToView(null)}
                    customer={customerHistoryToView}
                    onOpenPaymentModal={(c) => setCustomerToPay(c)}
                />
            )}

            {/* Modal de Comprobante Térmico de Recibo de Caja */}
            {paymentReceiptToView && (
                <CreditPaymentReceiptModal
                    isOpen={Boolean(paymentReceiptToView)}
                    onClose={() => setPaymentReceiptToView(null)}
                    movement={paymentReceiptToView.movement}
                    customer={paymentReceiptToView.customer}
                />
            )}
        </div>
    );
};

export default CustomersPage;
