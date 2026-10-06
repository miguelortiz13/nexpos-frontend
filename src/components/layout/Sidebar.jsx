import { NavLink, useNavigate } from 'react-router-dom';
import {
    FaBox,
    FaShoppingCart,
    FaChartBar,
    FaUsers,
    FaChevronLeft,
    FaChevronRight,
    FaHome,
    FaSignOutAlt,
    FaSignInAlt,
    FaStore,
    FaCashRegister,
    FaMoneyBillWave,
    FaAddressCard
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ collapsed, setCollapsed }) => {
    const { isAuthenticated, isAdmin, user, logout } = useAuth();
    const navigate = useNavigate();

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Header / Brand */}
            <div className="sidebar-header">
                <div className="brand-wrapper">
                    <div className="brand-logo-icon">
                        <FaStore />
                    </div>
                    {!collapsed && (
                        <div className="brand-text">
                            <span className="brand-name">NexPOS</span>
                            <span className="brand-tagline">POS & Retail</span>
                        </div>
                    )}
                </div>
                <button
                    className="collapse-btn"
                    onClick={toggleCollapse}
                    title={collapsed ? "Expandir menú" : "Colapsar menú"}
                    aria-label="Toggle sidebar"
                >
                    {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
                </button>
            </div>

            {/* Navigation Groups */}
            <nav className="sidebar-nav">
                {/* General */}
                <div className="nav-group">
                    {!collapsed && <span className="nav-group-label">PRINCIPAL</span>}
                    <ul>
                        <li>
                            <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
                                <FaHome className="nav-icon" />
                                {!collapsed && <span className="nav-text">Inicio</span>}
                            </NavLink>
                        </li>
                    </ul>
                </div>

                {/* POS Operations */}
                {isAuthenticated && (
                    <div className="nav-group">
                        {!collapsed && <span className="nav-group-label">PUNTO DE VENTA</span>}
                        <ul>
                            <li>
                                <NavLink to="/sales" className={({ isActive }) => `pos-link ${isActive ? 'active' : ''}`}>
                                    <FaCashRegister className="nav-icon pos-icon" />
                                    {!collapsed && (
                                        <div className="nav-text-container">
                                            <span className="nav-text">Caja / POS</span>
                                            <span className="pos-badge">VENTAS</span>
                                        </div>
                                    )}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/caja" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    <FaMoneyBillWave className="nav-icon" />
                                    {!collapsed && <span className="nav-text">Control de Caja</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/customers" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    <FaAddressCard className="nav-icon" />
                                    {!collapsed && <span className="nav-text">Clientes / DIAN</span>}
                                </NavLink>
                            </li>
                        </ul>
                    </div>
                )}

                {/* Admin Management */}
                {isAdmin && (
                    <div className="nav-group">
                        {!collapsed && <span className="nav-group-label">ADMINISTRACIÓN</span>}
                        <ul>
                            <li>
                                <NavLink to="/admin/productos" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    <FaBox className="nav-icon" />
                                    {!collapsed && <span className="nav-text">Inventario</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/reports" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    <FaChartBar className="nav-icon" />
                                    {!collapsed && <span className="nav-text">Reportes de Venta</span>}
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : '')}>
                                    <FaUsers className="nav-icon" />
                                    {!collapsed && <span className="nav-text">Usuarios y Cajeros</span>}
                                </NavLink>
                            </li>
                        </ul>
                    </div>
                )}
            </nav>

            {/* Footer / User Profile & Logout */}
            <div className="sidebar-footer">
                {isAuthenticated ? (
                    <div className="sidebar-user-card">
                        {!collapsed && (
                            <div className="user-info-meta">
                                <span className="user-name-display">{user?.username || 'Usuario'}</span>
                                <span className="user-role-badge">
                                    {isAdmin ? 'ADMINISTRADOR' : 'CAJERO'}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="btn-sidebar-logout"
                            title="Cerrar Sesión"
                        >
                            <FaSignOutAlt />
                            {!collapsed && <span>Salir</span>}
                        </button>
                    </div>
                ) : (
                    <NavLink to="/login" className="btn-sidebar-login">
                        <FaSignInAlt />
                        {!collapsed && <span>Iniciar Sesión</span>}
                    </NavLink>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
