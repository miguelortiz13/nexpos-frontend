import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import HomePage from "./pages/home/HomePage";
import Producto from "./pages/productos/Producto";
import ProductoVisualizador from "./pages/productos/ProductoVisualizador";
import ProductoCRUD from "./pages/productos/ProductoCRUD";
import SalesPage from "./pages/sales/SalesPage";
import ReportsPage from "./pages/reports/ReportsPage";
import UsersPage from "./pages/users/UsersPage";
import CashShiftPage from "./pages/cash/CashShiftPage";
import CustomersPage from "./pages/customers/CustomersPage";
import Login from "./pages/auth/Login";

function App() {
  return (
    <div className="app-container">
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
    </div>
  );
}

export default App;
