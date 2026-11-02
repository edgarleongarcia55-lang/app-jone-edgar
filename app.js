/* =========================================================================================
   ECOSOLAR - JAVASCRIPT PRINCIPAL DE ARQUITECTURA SPA (Single Page Application)
   
   Propósito del Script:
   Controla la interactividad del usuario, la navegación reactiva entre vistas, el consumo
   asíncrono de las APIs RESTful mediante fetch(), el ciclo completo de transacciones (CRUD),
   la renderización reactiva del DOM y las animaciones visuales con Chart.js.
   ========================================================================================= */

// =========================================================================================
// MÓDULO 1: NAVEGACIÓN REACTIVA ENTRE VISTAS (SPA)
// Gestiona el cambio dinámico de secciones sin recargar la página del navegador
// =========================================================================================
function initNavigation() {
    // Selección de elementos de navegación y contenedores de vista
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-content');
    const pageTitle = document.getElementById('page-title-text');

    // Registrar escuchador de clic en cada enlace del menú lateral
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); // Prevenir navegación tradicional por hipervínculo
            const target = item.dataset.page; // ID de la sección objetivo (ej. page-dashboard)

            // Paso 1.1: Actualizar estado visual de los botones del menú (clase .active)
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Paso 1.2: Ocultar todas las páginas y desplegar la sección seleccionada
            pages.forEach(p => p.classList.remove('active'));
            const targetPage = document.getElementById(target);
            if (targetPage) {
                targetPage.classList.add('active');
                targetPage.style.animation = 'none';
                targetPage.offsetHeight; // Forzar reflujo del DOM para reiniciar animación CSS
                targetPage.style.animation = 'fadeInUp 0.5s ease-out';
            }

            // Paso 1.3: Actualizar el título dinámico en el encabezado superior
            const titles = {
                'page-dashboard': '📊 Dashboard Energético',
                'page-solicitar': '📋 Solicitar Servicio',
                'page-soporte': '🛠️ Soporte Técnico',
                'page-nosotros': '🏢 Sobre Nosotros',
                'page-servicios': '⚡ Nuestros Servicios',
                'page-historial': '📁 Mi Historial'
            };
            if (pageTitle) pageTitle.textContent = titles[target] || 'EcoSolar';

            // Paso 1.4: Cerrar automáticamente la barra lateral en pantallas móviles
            closeMobileSidebar();

            // Paso 1.5: Disparar transacciones de consulta según la vista destino
            if (target === 'page-dashboard') loadDashboardData(); // Consulta telemetría
            if (target === 'page-historial') loadHistorial();     // Consulta historial de transacciones

            // Paso 1.6: Reiniciar observadores de animación de entrada
            triggerScrollAnimations();
        });
    });
}

// =========================================================================================
// MÓDULO 2: MENÚ LATERAL RESPONSIVE PARA DISPOSITIVOS MÓVILES
// Controla la apertura, cierre y capa oscura superpuesta en smartphones y tablets
// =========================================================================================
function initMobileSidebar() {
    const toggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');

    // Alternar visibilidad de la barra lateral al tocar el botón hamburguesa
    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        });
    }

    // Cerrar barra lateral al tocar sobre el overlay oscuro exterior
    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }
}

// Función auxiliar para forzar el cierre del menú móvil
function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

// =========================================================================================
// MÓDULO 3: EFECTO VISUAL DE PARTÍCULAS DE ENERGÍA FLOTANTES
// Genera elementos decorativos animados en el fondo de la pantalla
// =========================================================================================
function initParticles() {
    const container = document.getElementById('particles-bg');
    if (!container) return;

    const particleCount = 30; // Cantidad de partículas cuánticas en el canvas
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (6 + Math.random() * 6) + 's';

        // Selección aleatoria de color neón temático
        const colors = ['#00d2ff', '#3a7bd5', '#7b2ff7', '#00f5a0', '#ffd32a'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        particle.style.boxShadow = `0 0 6px ${color}`;

        container.appendChild(particle);
    }
}

// =========================================================================================
// MÓDULO 4: RELOJ DIGITAL EN VIVO Y ESTADO DEL SISTEMA
// Actualiza la fecha y hora en tiempo real con formato local venezolano
// =========================================================================================
function initClock() {
    const clockEl = document.getElementById('header-clock');
    if (!clockEl) return;

    function updateClock() {
        const now = new Date();
        const options = {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        // Formatear hora con localización es-VE
        clockEl.textContent = now.toLocaleDateString('es-VE', options);
    }

    updateClock(); // Ejecución inmediata
    setInterval(updateClock, 1000); // Actualización periódica cada segundo
}

// =========================================================================================
// MÓDULO 5: TRANSACCIÓN DE CREACIÓN (CREATE) - FORMULARIO SOLICITAR SERVICIO
// Captura, valida y envía una nueva solicitud de servicio al backend mediante HTTP POST
// =========================================================================================
function initSolicitarForm() {
    const form = document.getElementById('form-solicitar');
    if (!form) return;

    // Escuchar el evento de envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitar la recarga estándar del navegador

        // Paso 5.1: Extracción y sanitización de datos de los campos de entrada
        const data = {
            nombre_cliente: form.querySelector('[name="nombre_cliente"]').value.trim(),
            email_cliente: form.querySelector('[name="email_cliente"]').value.trim(),
            telefono_cliente: form.querySelector('[name="telefono_cliente"]').value.trim(),
            tipo_servicio: form.querySelector('[name="tipo_servicio"]').value,
            descripcion: form.querySelector('[name="descripcion"]').value.trim(),
            direccion_servicio: form.querySelector('[name="direccion_servicio"]').value.trim(),
            urgencia: form.querySelector('[name="urgencia"]').value
        };

        // Paso 5.2: Validación en cliente de campos estrictamente obligatorios
        if (!data.nombre_cliente || !data.email_cliente || !data.tipo_servicio || !data.direccion_servicio) {
            showToast('Por favor completa todos los campos obligatorios.', 'error');
            return;
        }

        // Paso 5.3: Validación sintáctica de la dirección de correo
        if (!isValidEmail(data.email_cliente)) {
            showToast('Por favor ingresa un correo electrónico válido.', 'error');
            return;
        }

        // Paso 5.4: Desplegar indicador visual de carga (Spinner)
        showLoading(true);

        try {
            // Paso 5.5: Ejecución de la transacción asíncrona mediante fetch() POST
            const response = await fetch('php/solicitar_servicio.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            // Paso 5.6: Procesar la respuesta JSON del servidor
            const result = await response.json();

            // Paso 5.7: Evaluación del resultado de la transacción
            if (result.success) {
                showToast(result.message, 'success');
                form.reset(); // Limpiar campos del formulario tras registro exitoso
            } else {
                showToast(result.message || 'Error al enviar la solicitud.', 'error');
            }
        } catch (error) {
            showToast('Error de conexión. Verifica que el servidor esté activo.', 'error');
            console.error('Error:', error);
        } finally {
            // Paso 5.8: Ocultar indicador visual de carga
            showLoading(false);
        }
    });
}

// =========================================================================================
// MÓDULO 6: TRANSACCIÓN DE CREACIÓN (CREATE) - FORMULARIO DE CONTACTO / SOPORTE
// Captura, valida y registra un nuevo ticket de soporte técnico mediante HTTP POST
// =========================================================================================
function initSoporteForm() {
    const form = document.getElementById('form-soporte');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Paso 6.1: Lectura de datos del formulario
        const data = {
            nombre: form.querySelector('[name="nombre"]').value.trim(),
            email: form.querySelector('[name="email"]').value.trim(),
            telefono: form.querySelector('[name="telefono"]').value.trim(),
            asunto: form.querySelector('[name="asunto"]').value.trim(),
            mensaje: form.querySelector('[name="mensaje"]').value.trim(),
            canal_preferido: form.querySelector('[name="canal_preferido"]').value
        };

        // Paso 6.2: Validación de obligatoriedad
        if (!data.nombre || !data.email || !data.asunto || !data.mensaje) {
            showToast('Por favor completa todos los campos obligatorios.', 'error');
            return;
        }

        // Paso 6.3: Validación de formato de correo
        if (!isValidEmail(data.email)) {
            showToast('Por favor ingresa un correo electrónico válido.', 'error');
            return;
        }

        showLoading(true);

        try {
            // Paso 6.4: Enviar petición POST a la API de soporte
            const response = await fetch('php/contacto_soporte.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            // Paso 6.5: Notificar al usuario el resultado de la transacción
            if (result.success) {
                showToast(result.message, 'success');
                form.reset();
            } else {
                showToast(result.message || 'Error al enviar el mensaje.', 'error');
            }
        } catch (error) {
            showToast('Error de conexión. Verifica que el servidor esté activo.', 'error');
            console.error('Error:', error);
        } finally {
            showLoading(false);
        }
    });
}

// =========================================================================================
// MÓDULO 7: TRANSACCIÓN DE CONSULTA (READ) - CARGA DE DATOS DEL DASHBOARD
// Consume la API 'php/dashboard.php' mediante GET, actualiza contadores y gráficas Chart.js
// =========================================================================================
let chartsInitialized = false;
let productionChart, efficiencyChart, consumptionChart;

/**
 * Función: loadDashboardData
 * Propósito: Ejecuta la transacción de lectura hacia la base de datos para obtener
 * el estado operativo de los paneles solares y los agregados estadísticos.
 */
function loadDashboardData() {
    // Paso 7.1: Petición asíncrona GET a la API RESTful de dashboard
    fetch('php/dashboard.php')
        .then(res => res.json())
        .then(data => {
            // Paso 7.2: Si la base de datos responde exitosamente, renderizar datos reales
            if (data.success) {
                renderDashboard(data);
            } else {
                // Si la tabla estuviese vacía, desplegar datos semilla de demostración
                renderDashboardDemo();
            }
        })
        .catch(() => {
            // Manejo de contingencia offline: garantizar que la interfaz se muestre aún sin conexión
            renderDashboardDemo();
        });
}

// Conjunto de datos de respaldo en caso de desconexión temporal del servidor
function renderDashboardDemo() {
    const demoData = {
        paneles: [
            { panel_id: 'PNL-001', nombre_panel: 'Panel Alpha-1', ubicacion: 'Techo Bloque A', estado: 'activo', produccion_kwh: 45.5, eficiencia_porcentaje: 92.3, temperatura: 35.2 },
            { panel_id: 'PNL-002', nombre_panel: 'Panel Alpha-2', ubicacion: 'Techo Bloque A', estado: 'activo', produccion_kwh: 42.1, eficiencia_porcentaje: 89.7, temperatura: 36.1 },
            { panel_id: 'PNL-003', nombre_panel: 'Panel Beta-1', ubicacion: 'Techo Bloque B', estado: 'activo', produccion_kwh: 48.3, eficiencia_porcentaje: 95.1, temperatura: 34.8 },
            { panel_id: 'PNL-004', nombre_panel: 'Panel Beta-2', ubicacion: 'Techo Bloque B', estado: 'mantenimiento', produccion_kwh: 12.0, eficiencia_porcentaje: 45.0, temperatura: 40.5 },
            { panel_id: 'PNL-005', nombre_panel: 'Panel Gamma-1', ubicacion: 'Área Exterior', estado: 'activo', produccion_kwh: 50.2, eficiencia_porcentaje: 97.8, temperatura: 33.9 },
            { panel_id: 'PNL-006', nombre_panel: 'Panel Gamma-2', ubicacion: 'Área Exterior', estado: 'activo', produccion_kwh: 47.8, eficiencia_porcentaje: 93.5, temperatura: 35.0 },
            { panel_id: 'PNL-007', nombre_panel: 'Panel Delta-1', ubicacion: 'Estacionamiento', estado: 'falla', produccion_kwh: 0.0, eficiencia_porcentaje: 0.0, temperatura: 45.0 },
            { panel_id: 'PNL-008', nombre_panel: 'Panel Delta-2', ubicacion: 'Estacionamiento', estado: 'activo', produccion_kwh: 44.6, eficiencia_porcentaje: 91.2, temperatura: 34.5 }
        ],
        estadisticas: {
            total_paneles: 8,
            paneles_activos: 6,
            paneles_mantenimiento: 1,
            paneles_falla: 1,
            eficiencia_promedio: 75.6,
            produccion_total: 290.5,
            temperatura_promedio: 36.9
        }
    };
    renderDashboard(demoData);
}

/**
 * Función: renderDashboard
 * Propósito: Actualiza las tarjetas numéricas con animación suave, dibuja la cuadrícula
 * interactiva de paneles solares y renderiza las gráficas estadísticas.
 */
function renderDashboard(data) {
    const stats = data.estadisticas;
    const paneles = data.paneles;

    // Paso 7.3: Animar visualmente el conteo numérico de métricas clave
    animateCounter('stat-total', stats.total_paneles);
    animateCounter('stat-activos', stats.paneles_activos);
    animateCounter('stat-produccion', stats.produccion_total, 1);
    animateCounter('stat-eficiencia', stats.eficiencia_promedio, 1);

    // Paso 7.4: Renderizar la cuadrícula interactiva de paneles individuales
    renderPanelGrid(paneles);

    // Paso 7.5: Dibujar o refrescar las gráficas de Chart.js
    initCharts(paneles, stats);
}

/**
 * Función: renderPanelGrid
 * Propósito: Genera dinámicamente las tarjetas de cada panel solar fotovoltaico,
 * asigna su color temático según estado y coloca el botón de modificación '⚙️'.
 */
function renderPanelGrid(paneles) {
    const container = document.getElementById('panel-grid');
    if (!container) return;

    // Almacén seguro en memoria para evitar problemas de comillas en atributos HTML
    window._dashboardPaneles = {};
    container.innerHTML = '';

    paneles.forEach((panel, index) => {
        // Indexar panel por su código único (ej. PNL-001)
        window._dashboardPaneles[panel.panel_id] = panel;

        // Determinación de clases e iconos según el estado operativo
        const statusClass = panel.estado === 'activo' ? 'active' :
                           panel.estado === 'mantenimiento' ? 'maintenance' : 'fault';
        const statusIcon = panel.estado === 'activo' ? '☀️' :
                          panel.estado === 'mantenimiento' ? '🔧' : '⚠️';
        const statusColor = panel.estado === 'activo' ? 'var(--neon-green)' :
                           panel.estado === 'mantenimiento' ? 'var(--neon-orange)' : 'var(--neon-red)';

        const div = document.createElement('div');
        div.className = `panel-visual-item ${statusClass}`;
        div.style.animationDelay = `${index * 0.1}s`;
        
        // Estructura DOM con botón de edición ⚙️ para abrir la transacción de actualización
        div.innerHTML = `
            <button class="pv-edit" title="Modificar estado y métricas" onclick="editPanelById('${panel.panel_id}')">⚙️</button>
            <div class="pv-icon">${statusIcon}</div>
            <div class="pv-name">${panel.nombre_panel}</div>
            <div class="pv-status" style="color: ${statusColor}">${panel.estado.toUpperCase()}</div>
            <div class="pv-kwh" style="color: ${statusColor}">${panel.produccion_kwh} kWh</div>
            <div class="panel-status-bar">
                <div class="panel-status-fill ${panel.eficiencia_porcentaje > 80 ? 'high' : panel.eficiencia_porcentaje > 40 ? 'medium' : 'low'}" 
                     style="width: 0%;" data-width="${panel.eficiencia_porcentaje}%"></div>
            </div>
        `;
        container.appendChild(div);
    });

    // Animar las barras de progreso de eficiencia con un retardo fluido
    setTimeout(() => {
        document.querySelectorAll('.panel-status-fill').forEach(fill => {
            fill.style.width = fill.dataset.width;
        });
    }, 300);
}

function initCharts(paneles, stats) {
    if (typeof Chart === 'undefined') return;

    // Destruir gráficas existentes
    if (productionChart) productionChart.destroy();
    if (efficiencyChart) efficiencyChart.destroy();
    if (consumptionChart) consumptionChart.destroy();

    Chart.defaults.color = '#8899aa';
    Chart.defaults.font.family = "'Exo 2', sans-serif";

    // Gráfica 1: Producción por panel (Barras)
    const prodCtx = document.getElementById('chart-production');
    if (prodCtx) {
        productionChart = new Chart(prodCtx, {
            type: 'bar',
            data: {
                labels: paneles.map(p => p.panel_id),
                datasets: [{
                    label: 'Producción (kWh)',
                    data: paneles.map(p => parseFloat(p.produccion_kwh)),
                    backgroundColor: paneles.map(p => {
                        if (p.estado === 'activo') return 'rgba(0, 245, 160, 0.6)';
                        if (p.estado === 'mantenimiento') return 'rgba(245, 166, 35, 0.6)';
                        return 'rgba(255, 71, 87, 0.6)';
                    }),
                    borderColor: paneles.map(p => {
                        if (p.estado === 'activo') return '#00f5a0';
                        if (p.estado === 'mantenimiento') return '#f5a623';
                        return '#ff4757';
                    }),
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 26, 0.95)',
                        titleColor: '#00d2ff',
                        bodyColor: '#e6f1ff',
                        borderColor: 'rgba(0, 210, 255, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        beginAtZero: true,
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    // Gráfica 2: Eficiencia (Doughnut)
    const effCtx = document.getElementById('chart-efficiency');
    if (effCtx) {
        const activos = parseInt(stats.paneles_activos) || 0;
        const mant = parseInt(stats.paneles_mantenimiento) || 0;
        const falla = parseInt(stats.paneles_falla) || 0;

        efficiencyChart = new Chart(effCtx, {
            type: 'doughnut',
            data: {
                labels: ['Activos', 'Mantenimiento', 'Falla'],
                datasets: [{
                    data: [activos, mant, falla],
                    backgroundColor: [
                        'rgba(0, 245, 160, 0.7)',
                        'rgba(245, 166, 35, 0.7)',
                        'rgba(255, 71, 87, 0.7)'
                    ],
                    borderColor: ['#00f5a0', '#f5a623', '#ff4757'],
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    animateRotate: true,
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 26, 0.95)',
                        titleColor: '#00d2ff',
                        bodyColor: '#e6f1ff',
                        borderColor: 'rgba(0, 210, 255, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12
                    }
                }
            }
        });
    }

    // Gráfica 3: Consumo simulado últimos 7 días (Line)
    const consCtx = document.getElementById('chart-consumption');
    if (consCtx) {
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const produccion = [245, 312, 278, 340, 298, 380, 290];
        const consumo = [180, 220, 195, 250, 210, 200, 175];

        consumptionChart = new Chart(consCtx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'Producción Solar (kWh)',
                        data: produccion,
                        borderColor: '#00f5a0',
                        backgroundColor: 'rgba(0, 245, 160, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#00f5a0',
                        pointBorderColor: '#0a0e1a',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Consumo (kWh)',
                        data: consumo,
                        borderColor: '#f5a623',
                        backgroundColor: 'rgba(245, 166, 35, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        pointBackgroundColor: '#f5a623',
                        pointBorderColor: '#0a0e1a',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 26, 0.95)',
                        titleColor: '#00d2ff',
                        bodyColor: '#e6f1ff',
                        borderColor: 'rgba(0, 210, 255, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.03)' }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    chartsInitialized = true;
}

// =========================================================================================
// MÓDULO 8: TRANSACCIÓN DE CONSULTA (READ) Y ADMINISTRACIÓN DE HISTORIAL
// Consume 'php/historial.php', renderiza tarjetas interactivas y asocia botones de acción CRUD
// =========================================================================================

/**
 * Función: loadHistorial
 * Propósito: Solicita al backend todas las actividades, solicitudes de servicio y contactos
 * asociados a la cookie de sesión actual.
 */
function loadHistorial() {
    const container = document.getElementById('historial-list');
    if (!container) return;

    // Petición asíncrona GET
    fetch('php/historial.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderHistorial(data); // Renderizar listados con botones de edición y borrado
            } else {
                renderHistorialEmpty(container);
            }
        })
        .catch(() => {
            renderHistorialEmpty(container);
        });
}

/**
 * Función: renderHistorial
 * Propósito: Genera el marcado HTML para las solicitudes y tickets de soporte,
 * e inyecta de forma controlada los botones de Actualización (✏️) y Eliminación (🗑️)
 * según las reglas de negocio del sistema.
 */
function renderHistorial(data) {
    const container = document.getElementById('historial-list');
    if (!container) return;

    // Almacenes globales en memoria para referenciar objetos por su ID de manera segura
    window._historialServicios = {};
    window._historialContactos = {};

    let html = '';

    // --- SECCIÓN 8.1: RENDERIZACIÓN DE SERVICIOS SOLICITADOS (CRUD) ---
    if (data.servicios && data.servicios.length > 0) {
        html += '<h3 style="font-family: Orbitron, sans-serif; font-size: 1rem; color: var(--neon-cyan); margin-bottom: 16px; margin-top: 16px;">📋 Servicios Solicitados</h3>';
        data.servicios.forEach(s => {
            // Guardar en diccionario por ID
            window._historialServicios[s.id] = s;

            // Mapeo semántico de etiquetas y estilos de estado
            const statusMap = {
                'pendiente': { label: 'Pendiente', class: 'pending' },
                'en_revision': { label: 'En Revisión', class: 'pending' },
                'aprobado': { label: 'Aprobado', class: 'active' },
                'en_proceso': { label: 'En Proceso', class: 'maintenance' },
                'completado': { label: 'Completado', class: 'completed' },
                'cancelado': { label: 'Cancelado', class: 'error' }
            };
            const status = statusMap[s.estado] || statusMap['pendiente'];

            // Regla de Negocio: Solo permitir eliminar si la solicitud está en 'pendiente' o 'cancelado'
            const canDelete = s.estado === 'pendiente' || s.estado === 'cancelado';

            html += `
                <div class="history-card">
                    <div class="history-icon" style="background: rgba(0, 210, 255, 0.15);">📋</div>
                    <div class="history-details">
                        <h4>${s.tipo_servicio.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                        <p>${s.descripcion || 'Sin descripción'}</p>
                        <span class="status-badge ${status.class}">${status.label}</span>
                    </div>
                    <!-- Acciones Transaccionales: Botón Editar (✏️) y Botón Eliminar (🗑️) -->
                    <div class="history-actions">
                        <button class="btn-edit-inline" title="Editar solicitud o cambiar estado" onclick="editServicioById(${s.id})">✏️</button>
                        ${canDelete ? `<button class="btn-delete-inline" title="Eliminar solicitud" onclick="deleteServicio(${s.id})">🗑️</button>` : ''}
                    </div>
                    <div class="history-date">${formatDate(s.fecha_solicitud)}</div>
                </div>
            `;
        });
    }

    // --- SECCIÓN 8.2: RENDERIZACIÓN DE TICKETS DE SOPORTE TÉCNICO (CRUD) ---
    if (data.contactos && data.contactos.length > 0) {
        html += '<h3 style="font-family: Orbitron, sans-serif; font-size: 1rem; color: var(--neon-orange); margin-bottom: 16px; margin-top: 24px;">🛠️ Contactos de Soporte</h3>';
        data.contactos.forEach(c => {
            window._historialContactos[c.id] = c;

            const statusMap = {
                'nuevo': { label: 'Nuevo', class: 'pending' },
                'leido': { label: 'Leído', class: 'maintenance' },
                'respondido': { label: 'Respondido', class: 'active' },
                'cerrado': { label: 'Cerrado', class: 'completed' }
            };
            const status = statusMap[c.estado] || statusMap['nuevo'];

            // Regla de Negocio: Solo permitir eliminar si el ticket no ha sido procesado ('nuevo')
            const canDelete = c.estado === 'nuevo';

            html += `
                <div class="history-card">
                    <div class="history-icon" style="background: rgba(245, 166, 35, 0.15);">🛠️</div>
                    <div class="history-details">
                        <h4>${c.asunto}</h4>
                        <p>${c.mensaje.substring(0, 100)}${c.mensaje.length > 100 ? '...' : ''}</p>
                        <span class="status-badge ${status.class}">${status.label}</span>
                    </div>
                    <!-- Acciones Transaccionales para Soporte -->
                    <div class="history-actions">
                        <button class="btn-edit-inline" title="Editar mensaje o estado" onclick="editSoporteById(${c.id})">✏️</button>
                        ${canDelete ? `<button class="btn-delete-inline" title="Eliminar mensaje" onclick="deleteSoporte(${c.id})">🗑️</button>` : ''}
                    </div>
                    <div class="history-date">${formatDate(c.fecha_contacto)}</div>
                </div>
            `;
        });
    }

    // --- SECCIÓN 8.3: BITÁCORA DE AUDITORÍA CRONOLÓGICA ---
    if (data.historial && data.historial.length > 0) {
        html += '<h3 style="font-family: Orbitron, sans-serif; font-size: 1rem; color: var(--neon-green); margin-bottom: 16px; margin-top: 24px;">📊 Actividad Reciente</h3>';
        data.historial.forEach(h => {
            const icons = {
                'solicitud_servicio': '📋',
                'contacto_soporte': '🛠️',
                'consulta_dashboard': '📊',
                'actualizacion_panel': '☀️',
                'registro': '👤',
                'login': '🔐',
                'visualizacion_servicio': '👁️'
            };
            const icon = icons[h.tipo_actividad] || '📌';

            html += `
                <div class="history-card">
                    <div class="history-icon" style="background: rgba(0, 245, 160, 0.15);">${icon}</div>
                    <div class="history-details">
                        <h4>${h.tipo_actividad.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                        <p>${h.descripcion || ''}</p>
                    </div>
                    <div class="history-date">${formatDate(h.fecha_actividad)}</div>
                </div>
            `;
        });
    }

    // Si no existen actividades registradas aún, mostrar estado vacío instructivo
    if (!html) {
        renderHistorialEmpty(container);
    } else {
        container.innerHTML = html;
    }
}

function renderHistorialEmpty(container) {
    container.innerHTML = `
        <div class="history-empty">
            <div class="empty-icon">📂</div>
            <h3>No hay actividad registrada aún</h3>
            <p>Tus solicitudes de servicio, contactos de soporte y consultas aparecerán aquí.</p>
        </div>
    `;
}

// ====== UTILIDADES ======
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function animateCounter(elementId, target, decimals = 0) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const start = 0;
    const duration = 1500;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart

        const current = start + (target - start) * eased;
        el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ====== TOAST NOTIFICATIONS ======
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s ease-out forwards';
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// ====== LOADING SPINNER ======
function showLoading(show) {
    const overlay = document.getElementById('spinner-overlay');
    if (overlay) {
        if (show) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }
}

// ====== SCROLL ANIMATIONS ======
function triggerScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(el => {
        el.classList.add('visible');
    });
}

function initScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ====== SUN RAYS ANIMATION ======
function initSunAnimation() {
    const container = document.querySelector('.sun-animation');
    if (!container) return;

    for (let i = 0; i < 12; i++) {
        const ray = document.createElement('div');
        ray.className = 'ray';
        ray.style.transform = `rotate(${i * 30}deg) translateY(-40px)`;
        ray.style.animationDelay = `${i * 0.15}s`;
        container.appendChild(ray);
    }
}

// ====== ENERGY FLOW ANIMATION ======
function initEnergyFlow() {
    const container = document.querySelector('.energy-flow');
    if (!container) return;

    for (let i = 0; i < 5; i++) {
        const line = document.createElement('div');
        line.className = 'energy-line';
        line.style.top = `${20 + i * 35}px`;
        line.style.width = `${60 + Math.random() * 30}%`;
        line.style.left = `${Math.random() * 10}%`;
        line.style.animationDelay = `${i * 0.5}s`;
        container.appendChild(line);
    }
}

// =========================================================================================
// MÓDULO 9: CONTROLADOR DE VENTANAS MODALES Y TRANSACCIONES CRUD (UPDATE & DELETE)
// Maneja la inyección dinámica, enlace de datos, envío con PUT / DELETE y desmontaje del DOM
// =========================================================================================

/**
 * Función: closeModal
 * Propósito: Cierra cualquier modal interactivo abierto, anima el desvanecimiento (fade-out)
 * y remueve el elemento del árbol DOM de forma limpia para liberar memoria.
 */
function closeModal() {
    const existingModal = document.getElementById('crud-modal-overlay');
    if (existingModal) {
        existingModal.classList.remove('show');
        setTimeout(() => existingModal.remove(), 250); // Tiempo concordante con la transición CSS
    }
}

/**
 * Función: showConfirmModal
 * Propósito: Diálogo modal de confirmación previa a operaciones destructivas (Eliminación / DELETE).
 * 
 * @param {string} title Título de la alerta (ej. "¿Eliminar Solicitud?").
 * @param {string} message Explicación del impacto de la acción destructiva.
 * @param {string} confirmText Texto del botón de acción en color rojo de peligro.
 * @param {Function} onConfirm Callback asíncrono ejecutado únicamente si el usuario confirma.
 */
function showConfirmModal(title, message, confirmText, onConfirm) {
    closeModal(); // Asegurar que no existan modales solapados

    // Paso 9.1: Crear el contenedor de fondo oscurecido con efecto de desenfoque
    const overlay = document.createElement('div');
    overlay.id = 'crud-modal-overlay';
    overlay.className = 'modal-overlay';

    // Paso 9.2: Inyectar estructura visual del modal pequeño de confirmación
    overlay.innerHTML = `
        <div class="modal-container modal-sm">
            <div class="modal-header">
                <div class="modal-title">
                    <span class="modal-icon warning">⚠️</span>
                    <span>${title}</span>
                </div>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <p style="color: var(--text-secondary); line-height: 1.6; font-size: 0.95rem;">${message}</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="button" class="btn btn-danger" id="modal-confirm-btn">${confirmText || 'Confirmar'}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Animación de entrada suave
    requestAnimationFrame(() => overlay.classList.add('show'));

    // Evento para cerrar haciendo clic en el área oscura exterior
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Evento del botón de confirmación: ejecuta la función destructiva
    const confirmBtn = overlay.querySelector('#modal-confirm-btn');
    confirmBtn.addEventListener('click', async () => {
        closeModal();
        if (typeof onConfirm === 'function') {
            await onConfirm();
        }
    });

    // Evento de teclado: cerrar con tecla Escape
    const onKey = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', onKey);
        }
    };
    document.addEventListener('keydown', onKey);
}

/**
 * Función: showEditModal
 * Propósito: Genera el formulario dinámico para la transacción de ACTUALIZACIÓN (UPDATE).
 * Adapta los campos, valores pre-cargados y selectores según la entidad:
 *  - 'servicio': Nombre, email, teléfono, tipo, urgencia, dirección, descripción y estado del servicio.
 *  - 'soporte': Nombre, email, teléfono, asunto, canal, mensaje y estado del ticket.
 *  - 'panel': Estado operativo, producción kWh, eficiencia % y temperatura °C.
 * 
 * @param {string} type Tipo de entidad a editar ('servicio' | 'soporte' | 'panel').
 * @param {Object} data Objeto con los datos actuales del registro a modificar.
 */
function showEditModal(type, data) {
    closeModal();

    const overlay = document.createElement('div');
    overlay.id = 'crud-modal-overlay';
    overlay.className = 'modal-overlay';

    let titleHtml = '';
    let bodyHtml = '';

    // --- FORMULARIO DE EDICIÓN PARA SOLICITUD DE SERVICIO ---
    if (type === 'servicio') {
        titleHtml = `<span>✏️</span> Editar Solicitud de Servicio #${data.id}`;
        bodyHtml = `
            <form id="form-edit-crud">
                <input type="hidden" name="id" value="${data.id}">
                <div class="grid-2" style="gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Nombre del Cliente *</label>
                        <input type="text" name="nombre_cliente" class="form-input" value="${data.nombre_cliente || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Correo Electrónico *</label>
                        <input type="email" name="email_cliente" class="form-input" value="${data.email_cliente || ''}" required>
                    </div>
                </div>
                <div class="grid-2" style="gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Teléfono</label>
                        <input type="tel" name="telefono_cliente" class="form-input" value="${data.telefono_cliente || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tipo de Servicio *</label>
                        <select name="tipo_servicio" class="form-select" required>
                            <option value="instalacion_paneles" ${data.tipo_servicio === 'instalacion_paneles' ? 'selected' : ''}>Instalación de Paneles</option>
                            <option value="mantenimiento" ${data.tipo_servicio === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                            <option value="consultoria" ${data.tipo_servicio === 'consultoria' ? 'selected' : ''}>Consultoría Energética</option>
                            <option value="reparacion" ${data.tipo_servicio === 'reparacion' ? 'selected' : ''}>Reparación</option>
                            <option value="ampliacion_sistema" ${data.tipo_servicio === 'ampliacion_sistema' ? 'selected' : ''}>Ampliación de Sistema</option>
                            <option value="monitoreo" ${data.tipo_servicio === 'monitoreo' ? 'selected' : ''}>Monitoreo Remoto</option>
                        </select>
                    </div>
                </div>
                <div class="grid-2" style="gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Urgencia</label>
                        <select name="urgencia" class="form-select">
                            <option value="baja" ${data.urgencia === 'baja' ? 'selected' : ''}>Baja</option>
                            <option value="media" ${data.urgencia === 'media' ? 'selected' : ''}>Media</option>
                            <option value="alta" ${data.urgencia === 'alta' ? 'selected' : ''}>Alta</option>
                            <option value="critica" ${data.urgencia === 'critica' ? 'selected' : ''}>Crítica</option>
                        </select>
                    </div>
                    <!-- Transición de Estado de la Solicitud -->
                    <div class="form-group">
                        <label class="form-label">Estado de Solicitud *</label>
                        <select name="estado" class="form-select" required>
                            <option value="pendiente" ${data.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="en_revision" ${data.estado === 'en_revision' ? 'selected' : ''}>En Revisión</option>
                            <option value="aprobado" ${data.estado === 'aprobado' ? 'selected' : ''}>Aprobado</option>
                            <option value="en_proceso" ${data.estado === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                            <option value="completado" ${data.estado === 'completado' ? 'selected' : ''}>Completado</option>
                            <option value="cancelado" ${data.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Dirección del Servicio *</label>
                    <input type="text" name="direccion_servicio" class="form-input" value="${data.direccion_servicio || ''}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Descripción</label>
                    <textarea name="descripcion" class="form-textarea" style="min-height: 80px;">${data.descripcion || ''}</textarea>
                </div>
                <div class="modal-footer" style="padding: 16px 0 0 0;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><span>💾</span> Guardar Cambios</button>
                </div>
            </form>
        `;

    // --- FORMULARIO DE EDICIÓN PARA CONTACTO DE SOPORTE ---
    } else if (type === 'soporte') {
        titleHtml = `<span>✏️</span> Editar Ticket de Soporte #${data.id}`;
        bodyHtml = `
            <form id="form-edit-crud">
                <input type="hidden" name="id" value="${data.id}">
                <div class="grid-2" style="gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Nombre *</label>
                        <input type="text" name="nombre" class="form-input" value="${data.nombre || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Correo *</label>
                        <input type="email" name="email" class="form-input" value="${data.email || ''}" required>
                    </div>
                </div>
                <div class="grid-2" style="gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Teléfono</label>
                        <input type="tel" name="telefono" class="form-input" value="${data.telefono || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Canal Preferido</label>
                        <select name="canal_preferido" class="form-select">
                            <option value="email" ${data.canal_preferido === 'email' ? 'selected' : ''}>Correo Electrónico</option>
                            <option value="telefono" ${data.canal_preferido === 'telefono' ? 'selected' : ''}>Teléfono</option>
                            <option value="whatsapp" ${data.canal_preferido === 'whatsapp' ? 'selected' : ''}>WhatsApp</option>
                        </select>
                    </div>
                </div>
                <div class="grid-2" style="gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Asunto *</label>
                        <input type="text" name="asunto" class="form-input" value="${data.asunto || ''}" required>
                    </div>
                    <!-- Transición de Estado del Ticket de Soporte -->
                    <div class="form-group">
                        <label class="form-label">Estado del Ticket *</label>
                        <select name="estado" class="form-select" required>
                            <option value="nuevo" ${data.estado === 'nuevo' ? 'selected' : ''}>Nuevo</option>
                            <option value="leido" ${data.estado === 'leido' ? 'selected' : ''}>Leído</option>
                            <option value="respondido" ${data.estado === 'respondido' ? 'selected' : ''}>Respondido</option>
                            <option value="cerrado" ${data.estado === 'cerrado' ? 'selected' : ''}>Cerrado</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Mensaje *</label>
                    <textarea name="mensaje" class="form-textarea" style="min-height: 90px;" required>${data.mensaje || ''}</textarea>
                </div>
                <div class="modal-footer" style="padding: 16px 0 0 0;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-warning"><span>💾</span> Guardar Cambios</button>
                </div>
            </form>
        `;

    // --- FORMULARIO DE EDICIÓN PARA PANEL SOLAR FOTOVOLTAICO ---
    } else if (type === 'panel') {
        titleHtml = `<span>☀️</span> Modificar Estado: ${data.nombre_panel} (${data.panel_id})`;
        bodyHtml = `
            <form id="form-edit-crud">
                <input type="hidden" name="id" value="${data.panel_id}">
                <div class="grid-2" style="gap: 16px;">
                    <!-- Transición de Condición Operativa -->
                    <div class="form-group">
                        <label class="form-label">Estado Operativo *</label>
                        <select name="estado" class="form-select" required>
                            <option value="activo" ${data.estado === 'activo' ? 'selected' : ''}>Activo (Operativo)</option>
                            <option value="inactivo" ${data.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                            <option value="mantenimiento" ${data.estado === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                            <option value="falla" ${data.estado === 'falla' ? 'selected' : ''}>Falla Crítica</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Producción (kWh) *</label>
                        <input type="number" step="0.1" min="0" name="produccion_kwh" class="form-input" value="${data.produccion_kwh || 0}" required>
                    </div>
                </div>
                <div class="grid-2" style="gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Eficiencia (%) *</label>
                        <input type="number" step="0.1" min="0" max="100" name="eficiencia_porcentaje" class="form-input" value="${data.eficiencia_porcentaje || 0}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Temperatura (°C) *</label>
                        <input type="number" step="0.1" name="temperatura" class="form-input" value="${data.temperatura || 0}" required>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px 0 0 0;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><span>⚡</span> Actualizar Panel</button>
                </div>
            </form>
        `;
    }

    // Inyección de la plantilla en el contenedor modal
    overlay.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <div class="modal-title">${titleHtml}</div>
                <button class="modal-close" onclick="closeModal()">✕</button>
            </div>
            <div class="modal-body">
                ${bodyHtml}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add('show'));

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    const onKey = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', onKey);
        }
    };
    document.addEventListener('keydown', onKey);

    // Paso 9.3: Escuchar el envío del formulario de actualización (Transacción PUT)
    const editForm = overlay.querySelector('#form-edit-crud');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Extraer valores modificados mediante FormData
            const formData = new FormData(editForm);
            const payload = {};
            formData.forEach((value, key) => {
                payload[key] = value;
            });

            // Conversión estricta de valores numéricos de telemetría de paneles
            if (type === 'panel') {
                payload.produccion_kwh = parseFloat(payload.produccion_kwh) || 0;
                payload.eficiencia_porcentaje = parseFloat(payload.eficiencia_porcentaje) || 0;
                payload.temperatura = parseFloat(payload.temperatura) || 0;
            }

            // Enrutamiento del endpoint según la entidad
            let apiUrl = '';
            if (type === 'servicio') apiUrl = 'php/solicitar_servicio.php';
            if (type === 'soporte') apiUrl = 'php/contacto_soporte.php';
            if (type === 'panel') apiUrl = 'php/dashboard.php';

            showLoading(true);

            try {
                // Paso 9.4: Envío asíncrono con método HTTP PUT
                const response = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const resData = await response.json();

                // Paso 9.5: Evaluación de respuesta y refresco en caliente de la vista
                if (resData.success) {
                    showToast(resData.message || 'Registro actualizado con éxito.', 'success');
                    closeModal(); // Cerrar ventana emergente
                    
                    // Refrescar automáticamente la vista correspondiente sin recargar la página
                    if (type === 'panel') {
                        loadDashboardData();
                    } else {
                        loadHistorial();
                    }
                } else {
                    showToast(resData.message || 'Error al actualizar el registro.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Error de conexión al actualizar.', 'error');
            } finally {
                showLoading(false);
            }
        });
    }
}

/**
 * Función: deleteServicio
 * Propósito: Ejecuta la transacción de ELIMINACIÓN (DELETE) para una solicitud de servicio.
 * Muestra el diálogo de confirmación y despacha la petición HTTP DELETE.
 * 
 * @param {number} id Identificador numérico de la solicitud a borrar.
 */
function deleteServicio(id) {
    showConfirmModal(
        'Eliminar Solicitud',
        '¿Estás seguro de que deseas eliminar esta solicitud de servicio? Esta acción no se puede deshacer.',
        'Eliminar Solicitud',
        async () => {
            showLoading(true);
            try {
                // Paso 9.6: Ejecución asíncrona de DELETE pasando el parámetro por Query String
                const response = await fetch(`php/solicitar_servicio.php?id=${id}`, {
                    method: 'DELETE'
                });
                const resData = await response.json();

                if (resData.success) {
                    showToast(resData.message || 'Solicitud eliminada.', 'success');
                    loadHistorial(); // Refrescar en tiempo real el listado en pantalla
                } else {
                    showToast(resData.message || 'No se pudo eliminar la solicitud.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Error de conexión al eliminar la solicitud.', 'error');
            } finally {
                showLoading(false);
            }
        }
    );
}

/**
 * Función: deleteSoporte
 * Propósito: Ejecuta la transacción de ELIMINACIÓN (DELETE) para un ticket de soporte técnico.
 * 
 * @param {number} id Identificador del mensaje de soporte a remover.
 */
function deleteSoporte(id) {
    showConfirmModal(
        'Eliminar Mensaje',
        '¿Estás seguro de que deseas eliminar este mensaje de soporte? Esta acción no se puede deshacer.',
        'Eliminar Mensaje',
        async () => {
            showLoading(true);
            try {
                const response = await fetch(`php/contacto_soporte.php?id=${id}`, {
                    method: 'DELETE'
                });
                const resData = await response.json();

                if (resData.success) {
                    showToast(resData.message || 'Contacto eliminado.', 'success');
                    loadHistorial(); // Refrescar historial
                } else {
                    showToast(resData.message || 'No se pudo eliminar el contacto.', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Error de conexión al eliminar el contacto.', 'error');
            } finally {
                showLoading(false);
            }
        }
    );
}

// =========================================================================================
// MÓDULO 10: RESOLUTORES DE ACCIÓN RÁPIDA POR IDENTIFICADOR (HELPERS)
// Recuperan el objeto desde el diccionario global en memoria y abren el modal de edición
// =========================================================================================

function editServicioById(id) {
    const s = window._historialServicios && window._historialServicios[id];
    if (s) {
        showEditModal('servicio', s);
    } else {
        showToast('No se encontró la solicitud de servicio.', 'error');
    }
}

function editSoporteById(id) {
    const c = window._historialContactos && window._historialContactos[id];
    if (c) {
        showEditModal('soporte', c);
    } else {
        showToast('No se encontró el mensaje de soporte.', 'error');
    }
}

function editPanelById(id) {
    const p = window._dashboardPaneles && window._dashboardPaneles[id];
    if (p) {
        showEditModal('panel', p);
    } else {
        showToast('No se encontró el panel solar.', 'error');
    }
}

// =========================================================================================
// MÓDULO 11: INICIALIZACIÓN GLOBAL DEL APLICATIVO
// Arranca los escuchadores de eventos y la carga inicial cuando el DOM está listo
// =========================================================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();       // Inicializar router de vistas
    initMobileSidebar();    // Inicializar controles táctiles móviles
    initParticles();        // Inicializar partículas cuánticas de fondo
    initClock();            // Arrancar reloj digital en vivo
    initSolicitarForm();    // Vincular formulario de creación de servicios
    initSoporteForm();       // Vincular formulario de creación de soporte
    initSunAnimation();     // Iniciar animación solar de la sección Nosotros
    initEnergyFlow();       // Iniciar flujo de energía interactivo
    initScrollObserver();   // Configurar animaciones de scroll

    // Cargar telemetría del dashboard como vista inicial por defecto
    loadDashboardData();

    // Activar transiciones visuales iniciales con un pequeño retardo
    setTimeout(triggerScrollAnimations, 300);
});
