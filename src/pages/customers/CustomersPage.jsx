import { useState, useEffect, useMemo } from 'react';
import {
    FaUsers,
    FaPlus,
    FaSearch,
    FaEnvelope,
    FaBuilding
} from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import customerService from '../../api/customerService';
import CustomerFormModal from '../../components/common/CustomerFormModal';
import 'react-toastify/dist/ReactToastify.css';
import './CustomersPage.css';

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

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
        if (!searchTerm) return customers;
        const q = searchTerm.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.docNumber.toLowerCase().includes(q) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q))
        );
    }, [customers, searchTerm]);

    const totalCustomers = customers.length;
    const withEmailCount = customers.filter(c => c.email && c.email.trim().length > 0).length;
    const companyCount = customers.filter(c => c.docType === 'NIT').length;

    const handleCustomerSaved = (newCust) => {
        setCustomers(prev => {
            const exists = prev.find(c => c.id === newCust.id);
            if (exists) {
                return prev.map(c => c.id === newCust.id ? newCust : c);
            }
            return [newCust, ...prev];
        });
    };

    return (
        <div className="customers-dashboard">
            <ToastContainer autoClose={2000} position="top-right" />

            <div className="customers-header-bar">
                <div>
                    <h2><FaUsers /> Directorio de Clientes</h2>
                    <p className="customers-subtitle">
                        Gestión de adquirentes, cédulas/NIT y correos para facturación electrónica DIAN
                    </p>
                </div>
                <button
                    className="btn-create-customer"
                    onClick={() => setShowModal(true)}
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
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>Total Clientes</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)' }}>{totalCustomers}</div>
                    </div>
                </div>

                <div className="customers-kpi-card">
                    <div className="kpi-icon-cust info">
                        <FaEnvelope />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>Con Email DIAN</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>{withEmailCount}</div>
                    </div>
                </div>

                <div className="customers-kpi-card">
                    <div className="kpi-icon-cust accent">
                        <FaBuilding />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>Empresas / NIT</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed' }}>{companyCount}</div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="customers-search-row">
                <div className="customers-search-input-box">
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula, NIT o correo electrónico..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Customers Table */}
            <div className="customers-table-card">
                <table className="customers-data-table">
                    <thead>
                        <tr>
                            <th>Identificación</th>
                            <th>Nombre / Razón Social</th>
                            <th>Correo DIAN</th>
                            <th>Teléfono</th>
                            <th>Ubicación</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                                    Cargando clientes...
                                </td>
                            </tr>
                        ) : filteredCustomers.length > 0 ? (
                            filteredCustomers.map(cust => (
                                <tr key={cust.id}>
                                    <td>
                                        <span className="doc-badge-pill">
                                            {cust.docType} {cust.docNumber}
                                        </span>
                                    </td>
                                    <td>
                                        <strong>{cust.name}</strong>
                                    </td>
                                    <td>
                                        {cust.email ? (
                                            <span className="email-chip">
                                                <FaEnvelope /> {cust.email}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>Sin correo</span>
                                        )}
                                    </td>
                                    <td>{cust.phone || 'N/A'}</td>
                                    <td>
                                        {cust.address ? `${cust.address}, ${cust.city || 'Cali'}` : (cust.city || 'Cali')}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                                    No se encontraron clientes registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <CustomerFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onCustomerSaved={handleCustomerSaved}
            />
        </div>
    );
};

export default CustomersPage;
