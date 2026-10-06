import { useState, useEffect } from 'react';
import { FaUserCircle, FaSignOutAlt, FaCashRegister, FaCircle, FaFileInvoiceDollar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CompanyConfigModal from '../common/CompanyConfigModal';
import './Topbar.css';

const Topbar = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showFiscalModal, setShowFiscalModal] = useState(false);
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = currentTime.toLocaleDateString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });

    return (
        <header className="topbar">
            {/* Left section: Store branding & Status */}
            <div className="topbar-left">
                <div className="store-pill">
                    <span className="store-name">NexPOS Sede Principal</span>
                    <span className="divider">•</span>
                    <span className="status-badge online">
                        <FaCircle className="status-pulse-dot" /> En Línea
                    </span>
                </div>
            </div>

            {/* Right section: Quick actions, Live Clock, User Profile */}
            <div className="topbar-right">
                {isAuthenticated && (
                    <button
                        className="btn-quick-pos"
                        onClick={() => navigate('/sales')}
                        title="Ir directo a Punto de Venta"
                    >
                        <FaCashRegister />
                        <span>Abrir POS</span>
                    </button>
                )}

                {isAdmin && (
                    <button
                        className="btn-quick-config"
                        onClick={() => setShowFiscalModal(true)}
                        title="Configuración Fiscal y Facturación Electrónica DIAN"
                    >
                        <FaFileInvoiceDollar />
                        <span>Fiscal DIAN</span>
                    </button>
                )}

                <div className="live-clock">
                    <span className="clock-time">{formattedTime}</span>
                    <span className="clock-date">{formattedDate}</span>
                </div>

                <div className="topbar-divider"></div>

                <div className="user-profile">
                    <div className="user-avatar-badge">
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user?.username || (isAuthenticated ? 'Usuario' : 'Invitado')}</span>
                        <span className="user-role">
                            {isAdmin ? 'ADMINISTRADOR' : (isAuthenticated ? 'CAJERO' : 'INVITADO')}
                        </span>
                    </div>
                    {isAuthenticated && (
                        <button
                            onClick={handleLogout}
                            className="btn-topbar-logout"
                            title="Cerrar Sesión"
                        >
                            <FaSignOutAlt />
                        </button>
                    )}
                </div>
            </div>

            {isAdmin && (
                <CompanyConfigModal
                    isOpen={showFiscalModal}
                    onClose={() => setShowFiscalModal(false)}
                />
            )}
        </header>
    );
};

export default Topbar;
