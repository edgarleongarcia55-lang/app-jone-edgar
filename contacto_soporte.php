<?php
// =========================================================================================
// MÓDULO DE TRANSACCIONES: GESTIÓN DE CONTACTOS Y SOPORTE TÉCNICO - ECOSOLAR (API RESTful)
// 
// Ciclo Transaccional Completo del Proceso:
//  - POST   -> CREACIÓN (Create): Registro inicial de ticket o mensaje de soporte técnico.
//  - GET    -> CONSULTA (Read): Obtención de tickets generados por el usuario en su sesión actual.
//  - PUT    -> ACTUALIZACIÓN (Update): Edición de datos del contacto y transición de estado (ej. Respondido/Cerrado).
//  - DELETE -> ELIMINACIÓN (Delete): Cancelación y borrado de mensajes con estado inicial 'nuevo'.
// =========================================================================================

// Carga de dependencias y utilidades de base de datos
require_once __DIR__ . '/config.php';

// Envío de cabeceras estándar JSON y directivas de control de acceso CORS
setCorsHeaders();

// =========================================================================================
// 1. TRANSACCIÓN: CREACIÓN / REGISTRO DE MENSAJE DE SOPORTE (MÉTODO POST)
// =========================================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Paso 1.1: Lectura del stream de entrada JSON
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Paso 1.2: Validación de integridad de los campos mandatorios
    $required = ['nombre', 'email', 'asunto', 'mensaje'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400); // Bad Request
            echo json_encode(['success' => false, 'message' => "El campo '$field' es obligatorio."]);
            exit;
        }
    }
    
    // Paso 1.3: Validación del formato del email de contacto
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email inválido.']);
        exit;
    }
    
    try {
        // Paso 1.4: Conectar mediante PDO
        $pdo = getConnection();
        
        // Paso 1.5: Preparar sentencia SQL de inserción con marcadores con nombre
        $stmt = $pdo->prepare("
            INSERT INTO contactos_soporte (nombre, email, telefono, asunto, mensaje, canal_preferido)
            VALUES (:nombre, :email, :telefono, :asunto, :mensaje, :canal)
        ");
        
        // Paso 1.6: Ejecución de la consulta vinculando los datos sanitizados
        $stmt->execute([
            ':nombre'   => $data['nombre'],
            ':email'    => $data['email'],
            ':telefono' => $data['telefono'] ?? '',
            ':asunto'   => $data['asunto'],
            ':mensaje'  => $data['mensaje'],
            ':canal'    => $data['canal_preferido'] ?? 'email'
        ]);
        
        // Paso 1.7: Obtener el ID asignado al nuevo registro
        $contactoId = $pdo->lastInsertId();
        
        // Paso 1.8: Registrar la actividad en el log de auditoría
        $sessionId = getSessionId();
        $stmtHist = $pdo->prepare("
            INSERT INTO historial_actividades (session_id, tipo_actividad, descripcion, datos_adicionales)
            VALUES (:session, 'contacto_soporte', :desc, :datos)
        ");
        $stmtHist->execute([
            ':session' => $sessionId,
            ':desc'    => 'Contacto de soporte: ' . $data['asunto'],
            ':datos'   => json_encode(['contacto_id' => $contactoId, 'asunto' => $data['asunto']])
        ]);
        
        // Paso 1.9: Respuesta exitosa al cliente
        echo json_encode([
            'success' => true,
            'message' => '¡Mensaje enviado! Nuestro equipo de soporte te responderá a la brevedad.',
            'id'      => $contactoId
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }

// =========================================================================================
// 2. TRANSACCIÓN: CONSULTA DE CONTACTOS DE SOPORTE (MÉTODO GET)
// =========================================================================================
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $pdo = getConnection();
        $sessionId = getSessionId();
        
        // Paso 2.1: Consultar mensajes vinculados a la sesión activa mediante la tabla de historial
        $stmt = $pdo->prepare("
            SELECT c.* FROM contactos_soporte c
            INNER JOIN historial_actividades h ON JSON_EXTRACT(h.datos_adicionales, '$.contacto_id') = c.id
            WHERE h.session_id = :session AND h.tipo_actividad = 'contacto_soporte'
            ORDER BY c.fecha_contacto DESC
        ");
        $stmt->execute([':session' => $sessionId]);
        $contactos = $stmt->fetchAll();
        
        // Paso 2.2: Devolver los registros encontrados
        echo json_encode(['success' => true, 'data' => $contactos]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }

// =========================================================================================
// 3. TRANSACCIÓN: ACTUALIZACIÓN DE DATOS O ESTADOS (MÉTODO PUT)
// =========================================================================================
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Paso 3.1: Captura de datos en formato JSON
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Paso 3.2: Comprobación del identificador obligatorio
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "El campo 'id' es obligatorio."]);
        exit;
    }
    
    try {
        $pdo = getConnection();
        
        // Paso 3.3: Verificar que el contacto existe en la base de datos
        $stmtCheck = $pdo->prepare("SELECT id FROM contactos_soporte WHERE id = :id");
        $stmtCheck->execute([':id' => $data['id']]);
        if (!$stmtCheck->fetch()) {
            http_response_code(404); // Not Found
            echo json_encode(['success' => false, 'message' => 'Contacto de soporte no encontrado.']);
            exit;
        }
        
        // Paso 3.4: Construcción dinámica y parametrizada de campos actualizables
        $allowedFields = [
            'nombre', 'email', 'telefono', 'asunto',
            'mensaje', 'canal_preferido', 'estado'
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
        
        // Paso 3.5: Validación de email si se intenta cambiar
        if (isset($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Email inválido.']);
            exit;
        }
        
        // Paso 3.6: Lógica de negocio para actualización de estados:
        // Si el estado pasa a 'respondido', se registra automáticamente la fecha_respuesta actual
        if (isset($data['estado']) && $data['estado'] === 'respondido') {
            $setClauses[] = "fecha_respuesta = NOW()";
        }
        
        // Paso 3.7: Ejecución de la sentencia UPDATE
        $sql = "UPDATE contactos_soporte SET " . implode(', ', $setClauses) . " WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Paso 3.8: Registro en auditoría
        $sessionId = getSessionId();
        $stmtHist = $pdo->prepare("
            INSERT INTO historial_actividades (session_id, tipo_actividad, descripcion, datos_adicionales)
            VALUES (:session, 'contacto_soporte', :desc, :datos)
        ");
        $stmtHist->execute([
            ':session' => $sessionId,
            ':desc'    => 'Actualización de contacto de soporte #' . $data['id'],
            ':datos'   => json_encode(['contacto_id' => $data['id'], 'campos_actualizados' => array_keys(array_intersect_key($data, array_flip($allowedFields)))])
        ]);
        
        // Paso 3.9: Notificación de éxito
        echo json_encode([
            'success' => true,
            'message' => 'Contacto de soporte actualizado correctamente.'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al actualizar el contacto: ' . $e->getMessage()]);
    }

// =========================================================================================
// 4. TRANSACCIÓN: ELIMINACIÓN DE CONTACTO DE SOPORTE (MÉTODO DELETE)
// =========================================================================================
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Paso 4.1: Extraer el ID desde la query string
    if (empty($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "El parámetro 'id' es obligatorio."]);
        exit;
    }
    
    $id = $_GET['id'];
    
    try {
        $pdo = getConnection();
        
        // Paso 4.2: Comprobar existencia y consultar estado
        $stmtCheck = $pdo->prepare("SELECT id, estado FROM contactos_soporte WHERE id = :id");
        $stmtCheck->execute([':id' => $id]);
        $contacto = $stmtCheck->fetch();
        
        if (!$contacto) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Contacto de soporte no encontrado.']);
            exit;
        }
        
        // Paso 4.3: Regla de Negocio:
        // Solo los contactos con estado 'nuevo' pueden ser eliminados por el usuario.
        // Si el ticket ya fue 'leido' o 'respondido' por el equipo técnico, no debe eliminarse sin auditoría interna.
        if ($contacto['estado'] !== 'nuevo') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Solo se pueden eliminar contactos con estado "nuevo". Estado actual: ' . $contacto['estado']
            ]);
            exit;
        }
        
        // Paso 4.4: Ejecución de la sentencia DELETE
        $stmtDel = $pdo->prepare("DELETE FROM contactos_soporte WHERE id = :id");
        $stmtDel->execute([':id' => $id]);
        
        // Paso 4.5: Registrar la eliminación en el historial de actividades
        $sessionId = getSessionId();
        $stmtHist = $pdo->prepare("
            INSERT INTO historial_actividades (session_id, tipo_actividad, descripcion, datos_adicionales)
            VALUES (:session, 'contacto_soporte', :desc, :datos)
        ");
        $stmtHist->execute([
            ':session' => $sessionId,
            ':desc'    => 'Eliminación de contacto de soporte #' . $id,
            ':datos'   => json_encode(['contacto_id' => $id, 'accion' => 'eliminado'])
        ]);
        
        // Paso 4.6: Responder confirmando la eliminación
        echo json_encode([
            'success' => true,
            'message' => 'Contacto de soporte eliminado correctamente.'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error al eliminar el contacto: ' . $e->getMessage()]);
    }

// =========================================================================================
// 5. RESPUESTA PARA MÉTODOS HTTP NO SOPORTADOS
// =========================================================================================
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>