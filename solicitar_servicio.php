<?php
// =========================================================================================
// MÓDULO DE TRANSACCIONES: GESTIÓN DE SOLICITUDES DE SERVICIO - ECOSOLAR (API RESTful)
// 
// Ciclo Transaccional Completo del Proceso:
//  - POST   -> CREACIÓN (Create): Registro inicial de solicitud de servicio por el cliente.
//  - GET    -> CONSULTA (Read): Lectura y filtrado de solicitudes vinculadas a la sesión actual.
//  - PUT    -> ACTUALIZACIÓN (Update): Modificación de datos y transición de estados operativos.
//  - DELETE -> ELIMINACIÓN (Delete): Cancelación y borrado seguro con reglas de integridad.
// =========================================================================================

// Carga de la configuración de base de datos, sesiones y utilidades
require_once __DIR__ . '/config.php';

// Establecer cabeceras HTTP de tipo JSON y soporte CORS (Cross-Origin Resource Sharing)
setCorsHeaders();

// =========================================================================================
// 1. TRANSACCIÓN: CREACIÓN / REGISTRO DE SOLICITUD (MÉTODO POST)
// =========================================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Paso 1.1: Decodificar el cuerpo JSON enviado desde la aplicación cliente
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Paso 1.2: Validación de presencia de campos estrictamente obligatorios
    $required = ['nombre_cliente', 'email_cliente', 'tipo_servicio', 'direccion_servicio'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400); // 400 Bad Request
            echo json_encode(['success' => false, 'message' => "El campo '$field' es obligatorio."]);
            exit;
        }
    }
    
    // Paso 1.3: Validación del formato sintáctico del correo electrónico
    if (!filter_var($data['email_cliente'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email inválido.']);
        exit;
    }
    
    try {
        // Paso 1.4: Apertura de la conexión segura con PDO
        $pdo = getConnection();
        
        // Paso 1.5: Preparación de la consulta SQL parametrizada (Prevención de inyección SQL)
        $stmt = $pdo->prepare("
            INSERT INTO servicios_solicitados 
            (nombre_cliente, email_cliente, telefono_cliente, tipo_servicio, descripcion, direccion_servicio, urgencia)
            VALUES (:nombre, :email, :telefono, :tipo, :descripcion, :direccion, :urgencia)
        ");
        
        // Paso 1.6: Ejecución de la inserción vinculando los parámetros de entrada
        $stmt->execute([
            ':nombre'      => $data['nombre_cliente'],
            ':email'       => $data['email_cliente'],
            ':telefono'    => $data['telefono_cliente'] ?? '',
            ':tipo'        => $data['tipo_servicio'],
            ':descripcion' => $data['descripcion'] ?? '',
            ':direccion'   => $data['direccion_servicio'],
            ':urgencia'    => $data['urgencia'] ?? 'media'
        ]);
        
        // Paso 1.7: Obtener el ID autoincremental recién generado por la transacción
        $servicioId = $pdo->lastInsertId();
        
        // Paso 1.8: Registro de auditoría en la tabla 'historial_actividades'
        $sessionId = getSessionId();
        $stmtHist = $pdo->prepare("
            INSERT INTO historial_actividades (session_id, tipo_actividad, descripcion, datos_adicionales)
            VALUES (:session, 'solicitud_servicio', :desc, :datos)
        ");
        $stmtHist->execute([
            ':session' => $sessionId,
            ':desc'    => 'Solicitud de servicio: ' . $data['tipo_servicio'],
            ':datos'   => json_encode(['servicio_id' => $servicioId, 'tipo' => $data['tipo_servicio']])
        ]);
        
        // Paso 1.9: Retorno exitoso en formato JSON con código 200 OK y el nuevo ID
        echo json_encode([
            'success' => true,
            'message' => '¡Solicitud enviada exitosamente! Nuestro equipo te contactará pronto.',
            'id'      => $servicioId
        ]);
        
    } catch (PDOException $e) {
        // Manejo controlado de excepciones SQL
        http_response_code(500); // 500 Internal Server Error
        echo json_encode(['success' => false, 'message' => 'Error al procesar la solicitud: ' . $e->getMessage()]);
    }

// =========================================================================================
// 2. TRANSACCIÓN: CONSULTA DE SOLICITUDES (MÉTODO GET)
// =========================================================================================
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Paso 2.1: Conectar a la base de datos y obtener la sesión actual del cliente
        $pdo = getConnection();
        $sessionId = getSessionId();
        
        // Paso 2.2: Consulta con JOIN a historial para recuperar solo solicitudes de esta sesión
        $stmt = $pdo->prepare("
            SELECT s.* FROM servicios_solicitados s
            INNER JOIN historial_actividades h ON JSON_EXTRACT(h.datos_adicionales, '$.servicio_id') = s.id
            WHERE h.session_id = :session AND h.tipo_actividad = 'solicitud_servicio'
            ORDER BY s.fecha_solicitud DESC
        ");
        $stmt->execute([':session' => $sessionId]);
        $servicios = $stmt->fetchAll();
        
        // Paso 2.3: Devolver el arreglo de solicitudes encontradas
        echo json_encode(['success' => true, 'data' => $servicios]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }

// =========================================================================================
// 3. TRANSACCIÓN: ACTUALIZACIÓN DE DATOS O ESTADOS (MÉTODO PUT)
// =========================================================================================
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Paso 3.1: Leer y decodificar el payload JSON enviado en la solicitud PUT
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Paso 3.2: Verificar obligatoriedad del ID del registro a modificar
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "El campo 'id' es obligatorio."]);
        exit;
    }
    
    try {
        $pdo = getConnection();
        
        // Paso 3.3: Verificar la existencia previa del registro antes de modificar
        $stmtCheck = $pdo->prepare("SELECT id FROM servicios_solicitados WHERE id = :id");
        $stmtCheck->execute([':id' => $data['id']]);
        if (!$stmtCheck->fetch()) {
            http_response_code(404); // 404 Not Found
            echo json_encode(['success' => false, 'message' => 'Solicitud de servicio no encontrada.']);
            exit;
        }
        
        // Paso 3.4: Construir dinámicamente la cláusula SET con lista blanca de campos permitidos
        $allowedFields = [
            'nombre_cliente', 'email_cliente', 'telefono_cliente',
            'tipo_servicio', 'descripcion', 'direccion_servicio',
            'urgencia', 'estado'
        ];
        $setClauses = [];
        $params = [':id' => $data['id']];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $setClauses[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }
        
        // Paso 3.5: Validar que al menos un campo válido haya sido suministrado
        if (empty($setClauses)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'No se proporcionaron campos para actualizar.']);
            exit;
        }
        
        // Paso 3.6: Validar sintaxis del email en caso de haber sido modificado
        if (isset($data['email_cliente']) && !filter_var($data['email_cliente'], FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email inválido.']);
            exit;
        }
        
        // Paso 3.7: Estampar la fecha y hora de la última modificación
        $setClauses[] = "fecha_actualizacion = NOW()";
        
        // Paso 3.8: Ejecutar la sentencia UPDATE con parámetros seguros
        $sql = "UPDATE servicios_solicitados SET " . implode(', ', $setClauses) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Paso 3.9: Registrar la transacción de actualización en la auditoría
        $sessionId = getSessionId();
        $stmtHist = $pdo->prepare("
            INSERT INTO historial_actividades (session_id, tipo_actividad, descripcion, datos_adicionales)
            VALUES (:session, 'solicitud_servicio', :desc, :datos)
        ");
        $stmtHist->execute([
            ':session' => $sessionId,
            ':desc'    => 'Actualización de solicitud de servicio #' . $data['id'],
            ':datos'   => json_encode(['servicio_id' => $data['id'], 'campos_actualizados' => array_keys(array_intersect_key($data, array_flip($allowedFields)))])
        ]);
        
        // Paso 3.10: Responder con confirmación de actualización exitosa
        echo json_encode([
            'success' => true,
            'message' => 'Solicitud de servicio actualizada correctamente.'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar la solicitud: ' . $e->getMessage()]);
    }

// =========================================================================================
// 4. TRANSACCIÓN: ELIMINACIÓN DE REGISTRO / CANCELACIÓN (MÉTODO DELETE)
// =========================================================================================
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Paso 4.1: Extraer y validar el parámetro 'id' recibido por URL query
    if (empty($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "El parámetro 'id' es obligatorio."]);
        exit;
    }
    
    $id = $_GET['id'];
    
    try {
        $pdo = getConnection();
        
        // Paso 4.2: Comprobar existencia y consultar el estado actual del registro
        $stmtCheck = $pdo->prepare("SELECT id, estado FROM servicios_solicitados WHERE id = :id");
        $stmtCheck->execute([':id' => $id]);
        $servicio = $stmtCheck->fetch();
        
        if (!$servicio) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Solicitud de servicio no encontrada.']);
            exit;
        }
        
        // Paso 4.3: Regla de Negocio e Integridad:
        // Solo se permite la eliminación directa si el estado es 'pendiente' o 'cancelado'.
        // Si el servicio ya está aprobado o en proceso técnico, no puede ser borrado arbitrariamente.
        if (!in_array($servicio['estado'], ['pendiente', 'cancelado'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Solo se pueden eliminar solicitudes con estado "pendiente" o "cancelado". Estado actual: ' . $servicio['estado']
            ]);
            exit;
        }
        
        // Paso 4.4: Ejecución física del DELETE en la base de datos
        $stmtDel = $pdo->prepare("DELETE FROM servicios_solicitados WHERE id = :id");
        $stmtDel->execute([':id' => $id]);
        
        // Paso 4.5: Registrar la baja de la solicitud en el historial de actividades
        $sessionId = getSessionId();
        $stmtHist = $pdo->prepare("
            INSERT INTO historial_actividades (session_id, tipo_actividad, descripcion, datos_adicionales)
            VALUES (:session, 'solicitud_servicio', :desc, :datos)
        ");
        $stmtHist->execute([
            ':session' => $sessionId,
            ':desc'    => 'Eliminación de solicitud de servicio #' . $id,
            ':datos'   => json_encode(['servicio_id' => $id, 'accion' => 'eliminado'])
        ]);
        
        // Paso 4.6: Responder con confirmación de eliminación exitosa
        echo json_encode([
            'success' => true,
            'message' => 'Solicitud de servicio eliminada correctamente.'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al eliminar la solicitud: ' . $e->getMessage()]);
    }

// =========================================================================================
// 5. RESPUESTA PARA MÉTODOS HTTP NO SOPORTADOS
// =========================================================================================
} else {
    http_response_code(405); // 405 Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>