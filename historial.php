<?php
// =========================================================================================
// MÓDULO DE TRANSACCIONES: CONSULTA CENTRALIZADA DE HISTORIAL Y ACTIVIDADES - ECOSOLAR
// 
// Ciclo Transaccional:
//  - GET -> CONSULTA (Read): Agrupa y retorna en una única transacción de lectura todas las
//           solicitudes de servicio, tickets de soporte técnico y bitácora de eventos
//           vinculados a la sesión de navegación del usuario.
// =========================================================================================

// Carga de configuración general y cabeceras CORS
require_once __DIR__ . '/config.php';
setCorsHeaders();

// =========================================================================================
// 1. TRANSACCIÓN: CONSULTA MULTI-ENTIDAD DE HISTORIAL (MÉTODO GET)
// =========================================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Paso 1.1: Conectar a la base de datos y obtener identificador de sesión
        $pdo = getConnection();
        $sessionId = getSessionId();
        
        // Paso 1.2: Obtener la bitácora cronológica de actividades recientes de esta sesión (máximo 50)
        $stmt = $pdo->prepare("
            SELECT * FROM historial_actividades 
            WHERE session_id = :session 
            ORDER BY fecha_actividad DESC
            LIMIT 50
        ");
        $stmt->execute([':session' => $sessionId]);
        $historial = $stmt->fetchAll();
        
        // Paso 1.3: Obtener las solicitudes de servicio activas creadas por esta sesión
        // Utiliza la función JSON_EXTRACT para cruzar el ID del servicio registrado en la auditoría
        $stmtServ = $pdo->prepare("
            SELECT s.* FROM servicios_solicitados s
            INNER JOIN historial_actividades h ON JSON_EXTRACT(h.datos_adicionales, '$.servicio_id') = s.id
            WHERE h.session_id = :session AND h.tipo_actividad = 'solicitud_servicio'
            ORDER BY s.fecha_solicitud DESC
        ");
        $stmtServ->execute([':session' => $sessionId]);
        $servicios = $stmtServ->fetchAll();
        
        // Paso 1.4: Obtener los mensajes y tickets de soporte generados por esta sesión
        $stmtCont = $pdo->prepare("
            SELECT c.* FROM contactos_soporte c
            INNER JOIN historial_actividades h ON JSON_EXTRACT(h.datos_adicionales, '$.contacto_id') = c.id
            WHERE h.session_id = :session AND h.tipo_actividad = 'contacto_soporte'
            ORDER BY c.fecha_contacto DESC
        ");
        $stmtCont->execute([':session' => $sessionId]);
        $contactos = $stmtCont->fetchAll();
        
        // Paso 1.5: Enviar el paquete de datos unificado en formato JSON estructurado
        echo json_encode([
            'success'    => true,
            'historial'  => $historial,
            'servicios'  => $servicios,
            'contactos'  => $contactos
        ]);
        
    } catch (PDOException $e) {
        // En caso de excepción, notificar con código 500
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
    
// =========================================================================================
// 2. RESPUESTA PARA MÉTODOS NO PERMITIDOS
// =========================================================================================
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>