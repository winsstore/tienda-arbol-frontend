// ===== PAGINACIÓN =====
let paginaActual = 1;
const productosPorPagina = 6;

// ===== FUNCIONES DE CONVERSIÓN Y FORMATO =====
function convertirAMonedaLocal(montoUSD) {
    return montoUSD * tasaCambio;
}

function formatearUSD(monto) {
    return `$${monto.toFixed(2)}`;
}

function formatearMonedaLocal(monto) {
    return `${SIMBOLO_LOCAL} ${(monto || 0).toFixed(2)}`;
}

// ===== ACTUALIZAR BANNER DE TASA =====
function actualizarBannerTasa() {
    const rateElement = document.getElementById('exchangeRate');
    if (rateElement) {
        rateElement.textContent = `${SIMBOLO_LOCAL} ${tasaCambio.toFixed(2)} por $1`;
    }

    localStorage.setItem('tasaMiTienda', JSON.stringify({
        tasaCambio: tasaCambio,
        monedaLocal: SIMBOLO_LOCAL
    }));
}

// ===== CONFIGURACIÓN DE MONEDA (DESDE BACKEND) =====
let tasaCambio = 36.50; // Valor por defecto
let SIMBOLO_LOCAL = 'Bs.'; // Valor por defecto

// ===== OBTENER TASA DE CAMBIO DEL BACKEND =====
async function obtenerTasaDeCambio() {
    try {
        const response = await fetch('https://tienda-el-arbol-backend.onrender.com/api/config/tasa');
        const config = await response.json();

        if (config.tasaCambio) {
            tasaCambio = config.tasaCambio;
            SIMBOLO_LOCAL = config.monedaLocal || 'Bs.';
            actualizarBannerTasa();
            console.log('✅ Tasa cargada del backend:', tasaCambio);
        } else {
            console.warn('⚠️ Usando tasa por defecto');
            actualizarBannerTasa();
        }
    } catch (error) {
        console.error('❌ Error al obtener tasa del backend:', error);
        tasaCambio = 36.50;
        SIMBOLO_LOCAL = 'Bs.';
        actualizarBannerTasa();
    }
}

// ===== DATOS DE PRODUCTOS (DESDE EL BACKEND) =====
let productosData = [];

// Cargar productos desde el backend
async function cargarProductosDesdeBackend() {
    try {
        const response = await fetch('https://tienda-el-arbol-backend.onrender.com/api/productos');

        if (!response.ok) {
            throw new Error('Error al obtener productos');
        }

        const data = await response.json();

        // Mapear las imágenes para que usen la ruta correcta
        const BACKEND_URL = 'https://tienda-el-arbol-backend.onrender.com';

        productosData = data.map(producto => ({
            ...producto,
            imagen: producto.imagen
                ? (producto.imagen.startsWith('/')
                    ? `${BACKEND_URL}${producto.imagen}`
                    : producto.imagen)
                : 'img/placeholder.jpg'
        }));

        // Filtrar solo productos disponibles
        const productosDisponibles = productosData.filter(p => p.disponible !== false);

        // Reiniciar paginación
        paginaActual = 1;

        cargarProductos(productosDisponibles);

        console.log('✅ Productos cargados desde el backend:', productosDisponibles);
    } catch (error) {
        console.error('❌ Error al cargar productos:', error);
        // Si falla, mostrar mensaje de error
        const container = document.getElementById('productos-container');
        container.innerHTML = '<p class="loading">Error al cargar productos. Por favor, verifica que el backend esté corriendo.</p>';
    }
}

// ===== CARRITO =====
let carrito = [];

// ===== FUNCIONES =====

// Agregar producto al carrito
function agregarAlCarrito(productId) {
    const producto = productosData.find(p => p.id === productId);

    if (!producto) return;

    const itemExistente = carrito.find(item => item.id === productId);

    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1
        });
    }

    actualizarCarrito();
    mostrarNotificacion('Producto añadido al carrito! 🛒');
}

// Actualizar visualización del carrito
function actualizarCarrito() {
    const cartCount = document.querySelector('.cart-count');
    const cartItemsContainer = document.getElementById('cartItems');
    const totalPriceElement = document.querySelector('.total-price');

    if (!cartCount || !cartItemsContainer || !totalPriceElement) {
        return;
    }

    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    cartCount.textContent = totalItems;

    if (carrito.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Tu carrito está vacío</p>';
        totalPriceElement.innerHTML = `
            <div class="cart-total-wrapper">
                <span class="cart-total-primary">Total: $0.00</span>
                <span class="cart-total-secondary">${SIMBOLO_LOCAL} 0.00</span>
            </div>
            <div class="cart-actions">
                <button class="btn-clear-cart" disabled>
                    🗑️ Vaciar Carrito
                </button>
                <button class="btn-checkout" disabled>Proceder al Pago</button>
            </div>
        `;
        return;
    }

    let htmlItems = '';
    let totalUSD = 0;
    let totalLocal = 0;

    carrito.forEach(item => {
        const subtotalUSD = item.precio * item.cantidad;
        const subtotalLocal = convertirAMonedaLocal(subtotalUSD);
        totalUSD += subtotalUSD;
        totalLocal += subtotalLocal;

        htmlItems += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.nombre}</div>
                    <div class="cart-item-price">
                        ${formatearUSD(item.precio)} / unidad
                    </div>
                    <div class="cart-item-total">
                        ${formatearUSD(subtotalUSD)} (${item.cantidad} unidades)
                    </div>
                    <div class="cart-item-total" style="font-size: 0.9rem; color: var(--gray-color);">
                        ${formatearMonedaLocal(subtotalLocal)}
                    </div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                    <span>${item.cantidad}</span>
                    <button class="quantity-btn increase" data-id="${item.id}">+</button>
                </div>
            </div>
        `;
    });

    cartItemsContainer.innerHTML = htmlItems;

    totalPriceElement.innerHTML = `
        <div class="cart-total-wrapper">
            <span class="cart-total-primary">Total: ${formatearUSD(totalUSD)}</span>
            <span class="cart-total-secondary">${formatearMonedaLocal(totalLocal)}</span>
        </div>
        <div class="cart-actions">
            <button class="btn-clear-cart" id="clearCartBtn">
                🗑️ Vaciar Carrito
            </button>
            <button class="btn-checkout" id="checkoutBtn">Proceder al Pago</button>
        </div>
    `;

    // Botón de vaciar carrito
    document.getElementById('clearCartBtn')?.addEventListener('click', function () {
        if (confirm('¿Estás seguro de vaciar todo el carrito?')) {
            carrito = [];
            localStorage.removeItem('carritoMiTienda');
            actualizarCarrito();
            mostrarNotificacion('Carrito vaciado 🗑️');
        }
    });

    // Botón de checkout
    document.getElementById('checkoutBtn')?.addEventListener('click', function () {
        if (carrito.length === 0) {
            alert('Tu carrito está vacío');
            return;
        }

        localStorage.setItem('carritoMiTienda', JSON.stringify(carrito));
        localStorage.setItem('tasaCambioMiTienda', JSON.stringify({
            tasaCambio: tasaCambio,
            monedaLocal: SIMBOLO_LOCAL
        }));

        window.location.href = 'checkout.html';
    });

    // Botones +/- en el carrito
    document.querySelectorAll('.decrease').forEach(button => {
        button.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = parseInt(this.getAttribute('data-id'));
            const item = carrito.find(i => i.id === id);
            if (item && item.cantidad > 1) {
                item.cantidad -= 1;
            } else {
                carrito = carrito.filter(i => i.id !== id);
            }
            actualizarCarrito();
        });
    });

    document.querySelectorAll('.increase').forEach(button => {
        button.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = parseInt(this.getAttribute('data-id'));
            const item = carrito.find(i => i.id === id);
            if (item) {
                item.cantidad += 1;
            }
            actualizarCarrito();
        });
    });

    // Guardar carrito en localStorage
    localStorage.setItem('carritoMiTienda', JSON.stringify(carrito));
}

// Mostrar notificación
function mostrarNotificacion(mensaje) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = mensaje;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Animaciones CSS para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===== EVENTOS =====

// Abrir/Cerrar modal del carrito
const cartButton = document.querySelector('.btn-cart');
const modal = document.getElementById('cartModal');
const closeModal = document.querySelector('.close-modal');

cartButton.addEventListener('click', () => {
    modal.classList.add('active');
});

closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
});

// Cerrar modal al hacer clic fuera
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

// Formulario de contacto
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        mostrarNotificacion('¡Mensaje enviado! Te contactaremos pronto 📧');
        contactForm.reset();
    });
}

// Smooth scroll para navegación
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            modal.classList.remove('active');
        }
    });
});

// ===== INICIAR =====
document.addEventListener('DOMContentLoaded', () => {
    // Cargar carrito desde localStorage
    const carritoGuardado = localStorage.getItem('carritoMiTienda');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        console.log('✅ Carrito cargado desde localStorage:', carrito);
    }

    // Cargar tasa desde localStorage
    const tasaGuardada = localStorage.getItem('tasaMiTienda');
    if (tasaGuardada) {
        const config = JSON.parse(tasaGuardada);
        tasaCambio = config.tasaCambio || 36.50;
        SIMBOLO_LOCAL = config.monedaLocal || 'Bs.';
        actualizarBannerTasa();
        console.log('✅ Tasa cargada desde localStorage:', tasaCambio);
    }

    // Cargar tasa del backend (si hay conexión)
    obtenerTasaDeCambio();
    cargarProductosDesdeBackend();
    actualizarCarrito();
});

// ===== BÚSQUEDA Y FILTRO =====
let categoriaFiltro = 'all';
let textoBusqueda = '';
let ordenPrecio = 'default'; // ← Agrega esta línea

// Filtro por categoría
document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        this.classList.add('active');

        categoriaFiltro = this.getAttribute('data-category');
        aplicarFiltros();
    });
});

// Búsqueda
document.getElementById('searchInput').addEventListener('input', function (e) {
    textoBusqueda = e.target.value.toLowerCase();
    aplicarFiltros();
});

// Orden por precio
document.querySelectorAll('.order-btn').forEach(button => {
    button.addEventListener('click', function () {
        // Remover clase active de todos
        document.querySelectorAll('.order-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Agregar clase active al botón clickeado
        this.classList.add('active');

        // Actualizar orden
        ordenPrecio = this.getAttribute('data-order');
        aplicarFiltros();
    });
});

// Función para aplicar filtros
function aplicarFiltros() {
    // Reiniciar a página 1 cuando se aplican filtros
    paginaActual = 1;

    // Filtrar productos disponibles primero
    let productosFiltrados = productosData.filter(p => p.disponible !== false);

    // Aplicar filtros de categoría y búsqueda
    productosFiltrados = productosFiltrados.filter(producto => {
        const coincideCategoria = categoriaFiltro === 'all' ||
            producto.categoria === categoriaFiltro;

        const coincideBusqueda = producto.nombre.toLowerCase().includes(textoBusqueda) ||
            producto.descripcion.toLowerCase().includes(textoBusqueda) ||
            producto.categoria.toLowerCase().includes(textoBusqueda);

        return coincideCategoria && coincideBusqueda;
    });

    // Aplicar orden por precio
    if (ordenPrecio === 'asc') {
        // Menor a mayor
        productosFiltrados.sort((a, b) => a.precio - b.precio);
    } else if (ordenPrecio === 'desc') {
        // Mayor a menor
        productosFiltrados.sort((a, b) => b.precio - a.precio);
    }
    // Si es 'default', no ordenar

    cargarProductos(productosFiltrados);
}

// ===== RECARGAR PÁGINA ACTUAL CON FILTROS =====
function recargarPaginaActual() {
    const productosFiltrados = productosData.filter(producto => {
        const coincideCategoria = categoriaFiltro === 'all' ||
            producto.categoria === categoriaFiltro;

        const coincideBusqueda = producto.nombre.toLowerCase().includes(textoBusqueda) ||
            producto.descripcion.toLowerCase().includes(textoBusqueda) ||
            producto.categoria.toLowerCase().includes(textoBusqueda);

        return coincideCategoria && coincideBusqueda;
    });

    cargarProductos(productosFiltrados);
}

// Modificar función cargarProductos para aceptar filtro
function cargarProductos(productos) {
    const container = document.getElementById('productos-container');

    if (productos.length === 0) {
        container.innerHTML = '<p class="loading">No se encontraron productos</p>';
        const paginacion = container.nextElementSibling;
        if (paginacion && paginacion.classList.contains('pagination-container')) {
            paginacion.remove();
        }
        return;
    }

    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosPaginados = productos.slice(inicio, fin);

    let html = '';

    productosPaginados.forEach(producto => {
        html += `
            <div class="product-card" data-product-id="${producto.id}">
                <img src="${producto.imagen}" alt="${producto.nombre}" class="product-img">
                <div class="product-info">
                    <div class="product-category">${producto.categoria}</div>
                    <h3 class="product-name">${producto.nombre}</h3>
                    <p class="product-desc">${producto.descripcion}</p>
                    <div class="price-wrapper">
                        <span class="price-primary">$${producto.precio.toFixed(2)}</span>
                        <span class="price-secondary">${SIMBOLO_LOCAL} ${(producto.precio * tasaCambio).toFixed(2)}</span>
                    </div>
                    <div class="product-quantity-controls">
                        <button class="quantity-btn decrease">-</button>
                        <span class="quantity-display">1</span>
                        <button class="quantity-btn increase">+</button>
                    </div>
                    <button class="btn-add-to-cart" data-id="${producto.id}">
                        Añadir al Carrito
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    const paginacionAnterior = container.nextElementSibling;
    if (paginacionAnterior && paginacionAnterior.classList.contains('pagination-container')) {
        paginacionAnterior.remove();
    }

    agregarControlesPaginacion(productos.length);

    // Eventos para botones + y -
    document.querySelectorAll('.decrease').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const display = this.nextElementSibling;
            let cantidad = parseInt(display.textContent);
            if (cantidad > 1) {
                display.textContent = cantidad - 1;
            }
        });
    });

    document.querySelectorAll('.increase').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const display = this.previousElementSibling;
            let cantidad = parseInt(display.textContent);
            display.textContent = cantidad + 1;
        });
    });

    // Evento para botón "Añadir al Carrito"
    document.querySelectorAll('.btn-add-to-cart').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(this.getAttribute('data-id'));
            const card = this.closest('.product-card');
            const display = card.querySelector('.quantity-display');
            const cantidad = parseInt(display.textContent);

            agregarAlCarritoConCantidad(productId, cantidad);

            display.textContent = '1';
        });
    });
}

// ===== AGREGAR CONTROLES DE PAGINACIÓN =====
function agregarControlesPaginacion(totalProductos) {
    const container = document.getElementById('productos-container');

    const totalPages = Math.ceil(totalProductos / productosPorPagina);

    if (totalPages <= 1) {
        return;
    }

    let paginacionHTML = `
        <div class="pagination-controls">
            <button class="pagination-btn prev" ${paginaActual === 1 ? 'disabled' : ''} data-action="prev">
                ← Anterior
            </button>
            
            <div class="pagination-numbers">
    `;

    for (let i = 1; i <= totalPages; i++) {
        paginacionHTML += `
            <button class="pagination-btn ${i === paginaActual ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }

    paginacionHTML += `
            </div>
            
            <button class="pagination-btn next" ${paginaActual === totalPages ? 'disabled' : ''} data-action="next">
                Siguiente →
            </button>
        </div>
    `;

    const paginacionContainer = document.createElement('div');
    paginacionContainer.className = 'pagination-container';
    paginacionContainer.innerHTML = paginacionHTML;

    container.parentNode.insertBefore(paginacionContainer, container.nextSibling);

    paginacionContainer.addEventListener('click', function (e) {
        if (e.target.classList.contains('pagination-btn')) {
            if (e.target.hasAttribute('data-page')) {
                paginaActual = parseInt(e.target.getAttribute('data-page'));
                recargarPaginaActual();
            } else if (e.target.getAttribute('data-action') === 'prev') {
                if (paginaActual > 1) {
                    paginaActual--;
                    recargarPaginaActual();
                }
            } else if (e.target.getAttribute('data-action') === 'next') {
                if (paginaActual < totalPages) {
                    paginaActual++;
                    recargarPaginaActual();
                }
            }
        }
    });
}

// Agregar producto al carrito con cantidad específica
function agregarAlCarritoConCantidad(productId, cantidad) {
    const producto = productosData.find(p => p.id === productId);

    if (!producto) return;

    const itemExistente = carrito.find(item => item.id === productId);

    if (itemExistente) {
        itemExistente.cantidad += cantidad;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: cantidad
        });
    }

    actualizarCarrito();
    mostrarNotificacion(`${cantidad} ${producto.nombre} añadido(s) al carrito! 🛒`);

    const display = document.querySelector(`.quantity-display[data-id="${productId}"]`);
    if (display) {
        display.textContent = '1';
    }
}

// Botón para limpiar localStorage (solo para desarrollo)
document.getElementById('clearStorageBtn')?.addEventListener('click', function () {
    if (confirm('¿Limpiar carrito y tasa de localStorage?')) {
        localStorage.removeItem('carritoMiTienda');
        localStorage.removeItem('tasaMiTienda');
        carrito = [];
        actualizarCarrito();
        alert('✅ localStorage limpiado');
    }
});