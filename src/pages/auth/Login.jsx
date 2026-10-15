import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStore, FaUser, FaLock, FaCashRegister, FaShieldAlt, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', { username, password });
            const data = res.data;

            login(data);

            const role = data.role ? data.role.toUpperCase() : 'USER';
            navigate(role === 'ADMIN' ? '/admin/productos' : '/sales');
        } catch (err) {
            console.error('Error de login:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Credenciales inválidas. Verifica tu usuario y contraseña.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickFill = (u, p) => {
        setUsername(u);
        setPassword(p);
    };

    return (
        <div className="login-page">
            <div className="login-wrapper">
                {/* Brand Side / Hero Banner */}
                <div className="login-banner">
                    <div className="banner-content">
                        <div className="banner-logo">
                            <FaStore className="banner-logo-icon" />
                            <span>NexPOS</span>
                        </div>
                        <h2>Gestión Inteligente de Inventario y Ventas</h2>
                        <p>
                            Plataforma integral de punto de venta diseñada para la agilidad de cajeros y el control total de comercios retail.
                        </p>
                        <div className="banner-features">
                            <div className="feature-pill">
                                <FaCashRegister /> Facturación Rápida POS
                            </div>
                            <div className="feature-pill">
                                <FaShieldAlt /> Control de Stock en Tiempo Real
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Side */}
                <div className="login-card">
                    <div className="login-header">
                        <div className="mobile-logo">
                            <FaStore /> NexPOS
                        </div>
                        <h3>Iniciar Sesión</h3>
                        <p className="login-desc">Ingresa tus credenciales para acceder al sistema</p>
                    </div>

                    {error && (
                        <div className="login-alert-error" role="alert">
                            <span>{error}</span>
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="input-group">
                            <label htmlFor="login-username">Usuario</label>
                            <div className="input-field-wrapper">
                                <FaUser className="input-icon" />
                                <input
                                    id="login-username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Nombre de usuario"
                                    required
                                    disabled={loading}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="login-password">Contraseña</label>
                            <div className="input-field-wrapper">
                                <FaLock className="input-icon" />
                                <input
                                    id="login-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-login-submit" disabled={loading}>
                            {loading ? (
                                <span className="btn-spinner"></span>
                            ) : (
                                <>
                                    <span>Ingresar al Sistema</span>
                                    <FaArrowRight />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick credential hints for easy testing (solo en desarrollo:
                        en Azure la clave de admin está en Key Vault) */}
                    {import.meta.env.DEV && (
                    <div className="demo-credentials-box">
                        <span className="demo-title">Accesos Rápidos de Prueba:</span>
                        <div className="demo-buttons">
                            <button
                                type="button"
                                className="btn-demo-pill"
                                onClick={() => handleQuickFill('admin', 'admin')}
                            >
                                Admin (admin / admin)
                            </button>
                        </div>
                    </div>
                    )}

                    <div className="login-footer">
                        <FaShieldAlt className="shield-icon" />
                        <span>NexPOS v2.0 • Sistema Seguro</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
