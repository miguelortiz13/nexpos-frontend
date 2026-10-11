import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Lazy loading de rutas para optimización y code-splitting
const HomePage = lazy(() => import("./pages/home/HomePage"));
const Producto = lazy(() => import("./pages/productos/Producto"));
const ProductoVisualizador = lazy(() => import("./pages/productos/ProductoVisualizador"));
const ProductoCRUD = lazy(() => import("./pages/productos/ProductoCRUD"));
const SalesPage = lazy(() => import("./pages/sales/SalesPage"));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));
const UsersPage = lazy(() => import("./pages/users/UsersPage"));
const CashShiftPage = lazy(() => import("./pages/cash/CashShiftPage"));
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const PurchasesPage = lazy(() => import("./pages/purchases/PurchasesPage"));
const Login = lazy(() => import("./pages/auth/Login"));

const PageLoader = () => (
  <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "0.85rem",
    color: "#4b5563"
  }}>
    <div style={{
      width: "36px",
      height: "36px",
      border: "3px solid #e5e7eb",
      borderTop: "3px solid #059669",
      borderRadius: "50%",
      animation: "spin 0.75s linear infinite"
    }} />
    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Cargando módulo NexPOS...</span>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

function App() {
  return (
    <div className="app-container">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Login limpio e independiente */}
          <Route path="/login" element={<Login />} />

          {/* Rutas enmarcadas en el Layout de la aplicación */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  {/* Rutas públicas */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/productos" element={<Producto />} />
                  <Route path="/producto/:id" element={<ProductoVisualizador />} />

                  {/* Rutas protegidas: Cajeros / Usuarios autenticados */}
                  <Route
                    path="/sales"
                    element={
                      <ProtectedRoute>
                        <SalesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/caja"
                    element={
                      <ProtectedRoute>
                        <CashShiftPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/customers"
                    element={
                      <ProtectedRoute>
                        <CustomersPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Rutas protegidas: Exclusivas para ADMIN */}
                  <Route
                    path="/admin/productos"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <ProductoCRUD />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/purchases"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <PurchasesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <ReportsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <ProtectedRoute requiredRole="ADMIN">
                        <UsersPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
