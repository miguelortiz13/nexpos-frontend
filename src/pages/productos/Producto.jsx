import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../api/client";
import { FaSearch, FaBarcode, FaBox, FaTags, FaInfoCircle, FaFilter } from "react-icons/fa";

function Producto() {
  const [productos, setProductos] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/productos`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setProductos(data);
        setFilteredProducts(data);
        const uniqueCategories = [...new Set(data.map(p => p.categoria).filter(Boolean))];
        const uniqueBrands = [...new Set(data.map(p => p.marca).filter(Boolean))];
        setCategories(uniqueCategories);
        setBrands(uniqueBrands);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = productos;

    if (searchTerm) {
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory) {
      result = result.filter(p => p.categoria === selectedCategory);
    }

    if (selectedBrand) {
      result = result.filter(p => p.marca === selectedBrand);
    }

    setFilteredProducts(result);
  }, [searchTerm, selectedCategory, selectedBrand, productos]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedBrand("");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="productos-container">
      <header className="productos-header">
        <h1>
          <FaBox className="header-icon" /> Catálogo de Productos
        </h1>
        <p className="subtitle">
          Visualiza y busca productos por nombre, categoría o marca
        </p>
      </header>

      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="dropdown-filters">
          <div className="filter-group">
            <label><FaFilter /> Categoría:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label><FaFilter /> Marca:</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="">Todas</option>
              {brands.map((brand, index) => (
                <option key={index} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <button
            className="reset-filters"
            onClick={handleResetFilters}
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-id">
                <FaBarcode /> ID: {product.id}
              </div>

              {product.imagen ? (
                <img
                  src={product.imagen}
                  alt={product.nombre}
                  className="product-image"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150?text=Imagen+no+disponible';
                  }}
                />
              ) : (
                <div className="product-image placeholder">
                  <span>Imagen no disponible</span>
                </div>
              )}

              <div className="product-info">
                <h3 className="product-name">{product.nombre}</h3>

                <div className="product-meta">
                  <span className="product-brand">
                    <FaTags /> {product.marca || "Sin marca"}
                  </span>
                  <span className="product-category">
                    {product.categoria || "Sin categoría"}
                  </span>
                </div>

                <div className="product-price">
                  ${product.precio.toFixed(2)}
                </div>

                <div className="product-stock">
                  Stock: {product.cantidad} unidades
                </div>

                {product.descripcion && (
                  <div className="product-description">
                    <FaInfoCircle /> {product.descripcion}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>No se encontraron productos con los filtros seleccionados</p>
            <button onClick={handleResetFilters}>Mostrar todos los productos</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Producto;