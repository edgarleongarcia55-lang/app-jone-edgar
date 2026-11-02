-- =========================================================================================
-- ESQUEMA DE BASE DE DATOS RELACIONAL: ECOSOLAR (ecosolar_db)
-- Motor: MySQL / MariaDB (InnoDB)
-- Codificación: UTF-8 Completo (utf8mb4_unicode_ci)
-- 
-- Propósito: Estructura de almacenamiento relacional para el soporte del ciclo completo
-- de transacciones de la plataforma de energía solar inteligente:
--  1. Gestión de usuarios y sesiones.
--  2. Transacciones de Solicitudes de Servicio (CRUD).
--  3. Transacciones de Soporte Técnico y Atención al Cliente (CRUD).
--  4. Bitácora de Auditoría de Actividades Transaccionales.
--  5. Telemetría y Métricas en Tiempo Real de Paneles Solares (Dashboard).
-- =========================================================================================

-- Creación de la base de datos si aún no existe en el servidor
CREATE DATABASE IF NOT EXISTS ecosolar_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Selección de la base de datos activa para las siguientes sentencias DDL
USE ecosolar_db;

-- =========================================================================================
-- TABLA 1: usuarios
-- Almacena la información de cuentas de usuario del sistema EcoSolar
-- =========================================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,                     -- Identificador único autoincremental
    nombre_completo VARCHAR(150) NOT NULL,                 -- Nombre y apellidos del usuario
    email VARCHAR(100) NOT NULL UNIQUE,                    -- Correo electrónico único para autenticación
    telefono VARCHAR(20),                                  -- Número de teléfono de contacto
    direccion TEXT,                                        -- Dirección física o residencial
    password_hash VARCHAR(255) NOT NULL,                   -- Hash criptográfico de la contraseña
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,      -- Marca de tiempo de registro automático
    activo TINYINT(1) DEFAULT 1                            -- Estado de la cuenta (1: Activo, 0: Inactivo)
) ENGINE=InnoDB;

-- =========================================================================================
-- TABLA 2: servicios_solicitados
-- Soporta el ciclo completo de transacciones para contrataciones y cotizaciones:
-- Creación (POST), Consulta (GET), Actualización de Estados (PUT), Eliminación (DELETE)
-- =========================================================================================
CREATE TABLE IF NOT EXISTS servicios_solicitados (
    id INT AUTO_INCREMENT PRIMARY KEY,                     -- ID único de la solicitud de servicio
    usuario_id INT NULL,                                   -- Clave foránea opcional (vinculable a 'usuarios')
    nombre_cliente VARCHAR(150) NOT NULL,                  -- Nombre completo del solicitante
    email_cliente VARCHAR(100) NOT NULL,                   -- Correo electrónico de contacto
    telefono_cliente VARCHAR(20),                          -- Teléfono para coordinación técnica
    tipo_servicio ENUM(                                    -- Catálogo de servicios ofertados
        'instalacion_paneles',                             -- Instalación de nuevo sistema fotovoltaico
        'mantenimiento',                                   -- Mantenimiento preventivo/correctivo
        'consultoria',                                     -- Asesoría energética especializada
        'reparacion',                                      -- Diagnóstico y reemplazo de piezas
        'ampliacion_sistema',                              -- Aumento de capacidad en paneles/baterías
        'monitoreo'                                        -- Monitoreo inteligente 24/7
    ) NOT NULL,
    descripcion TEXT,                                      -- Requerimientos o notas del cliente
    direccion_servicio TEXT NOT NULL,                      -- Ubicación geográfica donde se ejecutará el servicio
    urgencia ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media', -- Nivel de prioridad
    estado ENUM(                                           -- Máquina de estados transaccional
        'pendiente',                                       -- Solicitud recién creada
        'en_revision',                                     -- En evaluación por el equipo de ingeniería
        'aprobado',                                        -- Cotización o trabajo aprobado
        'en_proceso',                                      -- Técnicos desplegados en el sitio
        'completado',                                      -- Servicio finalizado exitosamente
        'cancelado'                                        -- Solicitud anulada
    ) DEFAULT 'pendiente',
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,     -- Fecha/hora de creación
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Tracking de cambios
    notas_internas TEXT,                                   -- Observaciones del equipo administrativo
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL -- Integridad referencial
) ENGINE=InnoDB;

-- =========================================================================================
-- TABLA 3: contactos_soporte
-- Soporta las transacciones del módulo de Mesa de Ayuda y Soporte Técnico
-- =========================================================================================
CREATE TABLE IF NOT EXISTS contactos_soporte (
    id INT AUTO_INCREMENT PRIMARY KEY,                     -- ID único del ticket de contacto
    nombre VARCHAR(150) NOT NULL,                          -- Nombre de la persona que reporta
    email VARCHAR(100) NOT NULL,                           -- Correo para envío de respuesta
    telefono VARCHAR(20),                                  -- Teléfono para soporte de emergencia
    asunto VARCHAR(200) NOT NULL,                          -- Motivo o título del requerimiento
    mensaje TEXT NOT NULL,                                 -- Detalle del problema o consulta
    canal_preferido ENUM('email', 'telefono', 'whatsapp') DEFAULT 'email', -- Canal de preferencia
    estado ENUM(                                           -- Ciclo de vida del ticket
        'nuevo',                                           -- Recibido en sistema (eliminable)
        'leido',                                           -- Asignado a un especialista
        'respondido',                                      -- Respuesta enviada al usuario
        'cerrado'                                          -- Caso resuelto y archivado
    ) DEFAULT 'nuevo',
    fecha_contacto DATETIME DEFAULT CURRENT_TIMESTAMP,     -- Fecha de apertura
    fecha_respuesta DATETIME NULL                          -- Fecha/hora en que fue atendido
) ENGINE=InnoDB;

-- =========================================================================================
-- TABLA 4: historial_actividades
-- Bitácora de Auditoría para trazabilidad de todas las transacciones realizadas en la plataforma
-- =========================================================================================
CREATE TABLE IF NOT EXISTS historial_actividades (
    id INT AUTO_INCREMENT PRIMARY KEY,                     -- Identificador de auditoría
    usuario_id INT NULL,                                   -- Usuario identificado (si aplica)
    session_id VARCHAR(100),                               -- Identificador de sesión persistente (cookie)
    tipo_actividad ENUM(                                   -- Categorización del evento transaccional
        'solicitud_servicio',                              -- Altas, modificaciones o bajas de servicios
        'contacto_soporte',                                -- Registro o actualización de tickets de soporte
        'consulta_dashboard',                              -- Visualización de estadísticas del sistema
        'actualizacion_panel',                             -- Modificación de métricas o estado de paneles
        'registro',                                        -- Creación de cuenta de usuario
        'login',                                           -- Inicio de sesión
        'visualizacion_servicio'                           -- Consulta de detalles de un servicio
    ) NOT NULL,
    descripcion TEXT,                                      -- Resumen textual de la acción ejecutada
    datos_adicionales JSON,                                -- Metadata estructurada en formato JSON (IDs, cambios)
    fecha_actividad DATETIME DEFAULT CURRENT_TIMESTAMP,     -- Marca de tiempo inmutable de la acción
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================================================
-- TABLA 5: datos_paneles
-- Telemetría de paneles solares fotovoltaicos para el Dashboard en tiempo real
-- =========================================================================================
CREATE TABLE IF NOT EXISTS datos_paneles (
    id INT AUTO_INCREMENT PRIMARY KEY,                     -- ID autoincremental de registro
    panel_id VARCHAR(50) NOT NULL,                         -- Código de identificación física del panel (ej. PNL-001)
    nombre_panel VARCHAR(100) NOT NULL,                    -- Nombre amigable del panel
    ubicacion VARCHAR(150),                                -- Zona de instalación física
    estado ENUM(                                           -- Condición física y operativa del panel
        'activo',                                          -- Operación normal generando energía
        'inactivo',                                        -- Desconectado temporalmente
        'mantenimiento',                                   -- En revisión técnica o limpieza
        'falla'                                            -- Alerta por desperfecto técnico
    ) DEFAULT 'activo',
    produccion_kwh DECIMAL(10,2) DEFAULT 0,                -- Generación instantánea en kilovatios-hora
    eficiencia_porcentaje DECIMAL(5,2) DEFAULT 0,          -- Porcentaje de rendimiento del panel (0 a 100%)
    temperatura DECIMAL(5,2) DEFAULT 0,                    -- Temperatura de celda en grados Celsius (°C)
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP      -- Marca de tiempo del último sensor
) ENGINE=InnoDB;

-- =========================================================================================
-- DATOS SEMILLA (SEED DATA)
-- Inicialización de registros de paneles solares fotovoltaicos para pruebas y demostración
-- =========================================================================================
INSERT INTO datos_paneles (panel_id, nombre_panel, ubicacion, estado, produccion_kwh, eficiencia_porcentaje, temperatura) VALUES
('PNL-001', 'Panel Alpha-1', 'Techo Bloque A', 'activo', 45.5, 92.3, 35.2),
('PNL-002', 'Panel Alpha-2', 'Techo Bloque A', 'activo', 42.1, 89.7, 36.1),
('PNL-003', 'Panel Beta-1', 'Techo Bloque B', 'activo', 48.3, 95.1, 34.8),
('PNL-004', 'Panel Beta-2', 'Techo Bloque B', 'mantenimiento', 12.0, 45.0, 40.5),
('PNL-005', 'Panel Gamma-1', 'Área Exterior', 'activo', 50.2, 97.8, 33.9),
('PNL-006', 'Panel Gamma-2', 'Área Exterior', 'activo', 47.8, 93.5, 35.0),
('PNL-007', 'Panel Delta-1', 'Estacionamiento', 'falla', 0.0, 0.0, 45.0),
('PNL-008', 'Panel Delta-2', 'Estacionamiento', 'activo', 44.6, 91.2, 34.5);
