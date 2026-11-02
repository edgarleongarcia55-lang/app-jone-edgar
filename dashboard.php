<?php
// =========================================================================================
// MÓDULO DE TRANSACCIONES: DASHBOARD ENERGÉTICO Y MONITOREO DE PANELES - ECOSOLAR
// 
// Ciclo Transaccional:
//  - GET -> CONSULTA (Read): Obtención de telemetría de paneles solares y cálculo en tiempo real
//           de métricas agregadas (totales, activos, fallas, eficiencia y producción total).
//  - PUT -> ACTUALIZACIÓN (Update): Modificación de datos operativos (estado, kWh, eficiencia, °C).
// =========================================================================================

// Carga de configuración de base de datos y cabeceras CORS
require_once __DIR__ . '/config.php';
setCorsHeaders();

// =========================================================================================
// 1. TRANSACCIÓN: CONSULTA DE MÉTRICAS Y TELEMETRÍA (MÉTODO GET)
// =========================================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $pdo = getConnection();
        
        // Paso 1.1: Consultar la lista completa de paneles solares instalados
        $stmt = $pdo->query("SELECT * FROM datos_paneles ORDER BY panel_id ASC");
        $paneles = $stmt->fetchAll();
        
        // Paso 1.2: Cálculo agregado en tiempo real mediante SQL para alimentar las tarjetas estadísticas:
        //  - Total de paneles
        //  - Conteo condicional de paneles según estado (activo, mantenimiento, falla)
        //  - Promedio de eficiencia energética redondeado
        //  - Sumatoria total de energía generada en kWh
        //  - Temperatura promedio operativa
        $stats = $pdo->query("
            SELECT 
                COUNT(*) as total_paneles,
                SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as paneles_activos,
                SUM(CASE WHEN estado = 'mantenimiento' THEN 1 ELSE 0 END) as paneles_mantenimiento,
                SUM(CASE WHEN estado = 'falla' THEN 1 ELSE 0 END) as paneles_falla,
                ROUND(AVG(eficiencia_porcentaje), 1) as eficiencia_promedio,
                ROUND(SUM(produccion_kwh), 1) as produccion_total,
                ROUND(AVG(temperatura), 1) as temperatura_promedio
            FROM datos_paneles
        ")->fetch();
        
        // Paso 1.3: Registrar la consulta en la bitácora de auditoría
        $sessionId = getSessionId();
        $stmtHist = $pdo->prepare("
            INSERT INTO historial_actividades (session_id, tipo_actividad, descripcion)
            VALUES (:session, 'consulta_dashboard', 'Consulta del dashboard de paneles solares')
        ");
        $stmtHist->execute([':session' => $sessionId]);
        
        // Paso 1.4: Respuesta JSON con la telemetría individual y los agregados estadísticos
        echo json_encode([
            'success'      => true,
            'paneles'      => $paneles,
            'estadisticas' => $stats
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }

// =========================================================================================
// 2. TRANSACCIÓN: ACTUALIZACIÓN DE ESTADO Y MÉTRICAS DE UN PANEL (MÉTODO PUT)
// =========================================================================================
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Paso 2.1: Decodificar el cuerpo JSON
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Paso 2.2: Validar el identificador del panel (ej. PNL-001)
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "El campo 'id' es obligatorio."]);
        exit;
    }
    
    try {
        $pdo = getConnection();
        
        // Paso 2.3: Verificar que el panel exista en la base de datos
        $stmtCheck = $pdo->prepare("SELECT panel_id FROM datos_paneles WHERE panel_id = :id");
        $stmtCheck->execute([':id' => $data['id']]);
        if (!$stmtCheck->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Panel no encontrado.']);
            exit;
        }
        
        // Paso 2.4: Construir los campos actualizables de forma parametrizada
        $allowedFields = [
            'estado', 'produccion_kwh', 'eficiencia_porcentaje', 'temperatura'
        ];
        $setClauses = [];
        $params = [':id' => $data['id']];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $setClauses[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }
        
        if (empty($setClauses)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No se proporcionaron campos para actualizar.']);
            exit;
        }
        
        // Paso 2.5: Ejecutar la sentencia de actualización
        $sql = "UPDATE datos_paneles SET " . implode(', ', $setClauses) . " WHERE panel_id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Paso 2.6: Registrar la transacción de actualización en la bitácora
        $sessionId = getSessionId();
        $stmtHist = $pdo->prepare("
            INSERT INTO historial_actividades (session_id, tipo_actividad, descripcion, datos_adicionales)
            VALUES (:session, 'actualizacion_panel', :desc, :datos)
        ");
        $stmtHist->execute([
            ':session' => $sessionId,
            ':desc'    => 'Actualización de panel #' . $data['id'],
            ':datos'   => json_encode(['panel_id' => $data['id'], 'campos_actualizados' => array_keys(array_intersect_key($data, array_flip($allowedFields)))])
        ]);
        
        // Paso 2.7: Confirmación de actualización
        echo json_encode([
            'success' => true,
            'message' => 'Datos del panel actualizados correctamente.'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar el panel: ' . $e->getMessage()]);
    }

// =========================================================================================
// 3. RESPUESTA PARA MÉTODOS HTTP NO SOPORTADOS
// =========================================================================================
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>