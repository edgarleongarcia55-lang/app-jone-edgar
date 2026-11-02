<?php
// =========================================================================================
// MÓDULO: CONFIGURACIÓN GENERAL Y CONECTIVIDAD DE BASE DE DATOS - ECOSOLAR
// Propósito: Define las credenciales de conexión MySQL/MariaDB mediante PDO,
// control de sesiones de usuario persistentes y cabeceras HTTP CORS para la API REST.
// =========================================================================================

// --- 1. DEFINICIÓN DE CONSTANTES DE CONEXIÓN A LA BASE DE DATOS ---
define('DB_HOST', 'localhost');          // Servidor de base de datos (XAMPP local)
define('DB_NAME', 'ecosolar_db');        // Nombre de la base de datos de EcoSolar
define('DB_USER', 'root');               // Usuario predeterminado de MySQL en entorno local
define('DB_PASS', '');                   // Contraseña por defecto (vacía en XAMPP)
define('DB_CHARSET', 'utf8mb4');         // Codificación segura completa UTF-8 (soporta emojis y tildes)

/**
 * Función: getConnection
 * Propósito: Establece y retorna una conexión PDO segura hacia la base de datos MySQL.
 * Manejo de Transacciones y Seguridad:
 *  - ATTR_ERRMODE => ERRMODE_EXCEPTION: Fuerza a PDO a lanzar excepciones ante errores SQL.
 *  - ATTR_DEFAULT_FETCH_MODE => FETCH_ASSOC: Retorna los resultados como arreglos asociativos.
 *  - ATTR_EMULATE_PREPARES => false: Desactiva emulación para usar consultas preparadas nativas (anti-SQL Injection).
 * 
 * @return PDO Instancia activa de conexión a base de datos.
 */
function getConnection() {
    try {
        // Construcción del Data Source Name (DSN) con codificación utf8mb4
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        // Instanciación del objeto PDO
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // En caso de fallo crítico de conexión, responder con código HTTP 500 y JSON explicativo
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error de conexión a la base de datos: ' . $e->getMessage()
        ]);
        exit;
    }
}

/**
 * Función: getSessionId
 * Propósito: Identifica la sesión de navegación del usuario para vincular sus transacciones
 * (creación de servicios, soporte técnico y consultas) de manera segura y sin requerir login obligatorio.
 * 
 * @return string Identificador hexadecimal único de la sesión del cliente (32 caracteres).
 */
function getSessionId() {
    // Si la cookie de sesión de EcoSolar no existe, generamos un identificador criptográfico único
    if (!isset($_COOKIE['ecosolar_session'])) {
        $sessionId = bin2hex(random_bytes(16)); // 16 bytes aleatorios criptográficos -> 32 hex
        // Persistir la cookie por 30 días para recordar el historial del usuario
        setcookie('ecosolar_session', $sessionId, time() + (86400 * 30), "/");
        return $sessionId;
    }
    // Si ya existe la cookie, retornamos su identificador actual
    return $_COOKIE['ecosolar_session'];
}

/**
 * Función: setCorsHeaders
 * Propósito: Configura las cabeceras HTTP necesarias para el intercambio de datos en formato JSON (API REST)
 * y habilita peticiones asíncronas seguras (CORS) para los métodos GET, POST, PUT, DELETE y OPTIONS.
 */
function setCorsHeaders() {
    // Tipo de contenido siempre devuelto en formato JSON con codificación UTF-8
    header('Content-Type: application/json; charset=utf-8');
    // Permitir orígenes cruzados en entorno web
    header('Access-Control-Allow-Origin: *');
    // Habilitar todos los verbos HTTP necesarios para el ciclo completo CRUD de transacciones
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    // Cabeceras permitidas en las solicitudes HTTP
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    // Responder inmediatamente con 200 OK ante peticiones preliminares del navegador (preflight OPTIONS)
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
?>