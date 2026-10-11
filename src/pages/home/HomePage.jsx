import { Link } from "react-router-dom";
import {
  FaCashRegister,
  FaBoxes,
  FaChartBar,
  FaUsers,
  FaCheckCircle,
  FaArrowRight,
  FaStore,
  FaShieldAlt,
  FaBarcode,
  FaMoneyBillWave,
  FaAddressCard,
  FaTruck
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import "./HomePage.css";

function HomePage() {
  const { user, isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="home-dashboard">
      {/* Welcome Hero / Operational Banner */}
      <section className="home-hero-banner">
        <div className="hero-badge">
          <FaStore /> NexPOS Retail v2.0
        </div>
        <h1 className="hero-main-title">
          {isAuthenticated
            ? `¡Hola de nuevo, ${user?.username || 'Usuario'}!`
            : "Sistema de Punto de Venta & Gestión Comercial NexPOS"}
        </h1>
        <p className="hero-main-desc">
          {isAuthenticated
            ? `Tu terminal está lista para operar. Selecciona un módulo para comenzar tu jornada de trabajo.`
            : "Plataforma integral de inventario, punto de venta y facturación optimizada para comercio retail."}
        </p>

        {!isAuthenticated && (
          <div className="hero-cta-group">
            <Link to="/login" className="btn-hero-primary">
              <span>Iniciar Sesión en el Sistema</span>
              <FaArrowRight />
            </Link>
          </div>
        )}
      </section>

      {/* Quick Operational Shortcuts for Cashiers and Admins */}
      {isAuthenticated && (
        <section className="operational-shortcuts-section">
          <h2 className="section-heading">Accesos Rápidos del Sistema</h2>

          <div className="shortcuts-grid">
            {/* POS Shortcut - Always visible to authenticated users */}
            <Link to="/sales" className="shortcut-card pos-featured">
              <div className="shortcut-icon-box pos-icon-box">
                <FaCashRegister />
              </div>
              <div className="shortcut-content">
                <div className="shortcut-tag">OPERACIÓN DIARIA</div>
                <h3>Punto de Venta (POS)</h3>
                <p>Cobro ágil con lector de código de barras, pago mixto y tiquetes térmicos.</p>
              </div>
              <div className="shortcut-arrow">
                <FaArrowRight />
              </div>
            </Link>

            {/* Cash Shifts & Arqueos */}
            <Link to="/caja" className="shortcut-card">
              <div className="shortcut-icon-box cash-icon-box">
                <FaMoneyBillWave />
              </div>
              <div className="shortcut-content">
                <div className="shortcut-tag">ARQUEO Y CUADRE</div>
                <h3>Control de Caja</h3>
                <p>Apertura de turno, movimientos de caja y cierre ciego con Tiquete Z.</p>
              </div>
              <div className="shortcut-arrow">
                <FaArrowRight />
              </div>
            </Link>

            {/* Customers & Credit / Cartera */}
            <Link to="/customers" className="shortcut-card">
              <div className="shortcut-icon-box customer-icon-box">
                <FaAddressCard />
              </div>
              <div className="shortcut-content">
                <div className="shortcut-tag">DIAN Y CARTERA</div>
                <h3>Clientes & Cartera</h3>
                <p>Gestión de adquirentes DIAN, cupos de crédito, cobros y recibos de caja.</p>
              </div>
              <div className="shortcut-arrow">
                <FaArrowRight />
              </div>
            </Link>

            {/* Inventory Shortcut - Admin only */}
            {isAdmin && (
              <>
                <Link to="/admin/productos" className="shortcut-card">
                  <div className="shortcut-icon-box">
                    <FaBoxes />
                  </div>
                  <div className="shortcut-content">
                    <div className="shortcut-tag">CONTROL DE STOCK</div>
                    <h3>Inventario de Productos</h3>
                    <p>Alta de productos, actualización de precios y alertas de agotados.</p>
                  </div>
                  <div className="shortcut-arrow">
                    <FaArrowRight />
                  </div>
                </Link>

                <Link to="/purchases" className="shortcut-card">
                  <div className="shortcut-icon-box">
                    <FaTruck />
                  </div>
                  <div className="shortcut-content">
                    <div className="shortcut-tag">CADENA DE SUMINISTRO</div>
                    <h3>Compras & Proveedores</h3>
                    <p>Recepción de facturas de distribuidores, actualización de stock y costo promedio ponderado.</p>
                  </div>
                  <div className="shortcut-arrow">
                    <FaArrowRight />
                  </div>
                </Link>

                <Link to="/reports" className="shortcut-card">
                  <div className="shortcut-icon-box">
                    <FaChartBar />
                  </div>
                  <div className="shortcut-content">
                    <div className="shortcut-tag">FINANZAS</div>
                    <h3>Reporte de Ventas</h3>
                    <p>Historial consolidado de facturación, ticket promedio e ingresos.</p>
                  </div>
                  <div className="shortcut-arrow">
                    <FaArrowRight />
                  </div>
                </Link>

                <Link to="/users" className="shortcut-card">
                  <div className="shortcut-icon-box">
                    <FaUsers />
                  </div>
                  <div className="shortcut-content">
                    <div className="shortcut-tag">SEGURIDAD</div>
                    <h3>Usuarios y Cajeros</h3>
                    <p>Gestión de personal de caja y administración con roles protegidos.</p>
                  </div>
                  <div className="shortcut-arrow">
                    <FaArrowRight />
                  </div>
                </Link>
              </>
            )}
          </div>
        </section>
      )}

      {/* System Features Highlights */}
      <section className="features-highlight-section">
        <h2 className="section-heading">Garantías Operativas NexPOS</h2>

        <div className="system-features-grid">
          <div className="system-feature-item">
            <div className="feature-icon-circle">
              <FaBarcode />
            </div>
            <h4>Lectura Óptica Inmediata</h4>
            <p>Compatible con lectores láser USB y escáner de cámara integrado para un cobro veloz.</p>
          </div>

          <div className="system-feature-item">
            <div className="feature-icon-circle">
              <FaShieldAlt />
            </div>
            <h4>Deducción de Stock Transaccional</h4>
            <p>Transacciones atómicas ACID que previenen sobreventas y descuadres de inventario.</p>
          </div>

          <div className="system-feature-item">
            <div className="feature-icon-circle">
              <FaCheckCircle />
            </div>
            <h4>Facturación y Medios de Pago</h4>
            <p>Soporte para Efectivo con cálculo de vuelto exacto, Tarjetas y transferencias móviles.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
