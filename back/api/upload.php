<?php
// Version ultra-simplifiée sans dépendances
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

// Inclure la configuration et le modèle
require_once '../config/database.php';
require_once '../model/projet.php';

session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Non autorisé']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
$uploadDir = __DIR__ . '/uploads/projects/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

try {
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Erreur upload');
    }
    
    $file = $_FILES['image'];
    
    // Vérifications basiques
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($extension, $allowedExtensions)) {
        throw new Exception('Extension non autorisée');
    }
    
    if ($file['size'] > 5000000) { // 5MB
        throw new Exception('Fichier trop volumineux');
    }
    
    // Vérifier le type MIME basique
    $allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif'
    ];
    
    // Utiliser mime_content_type() si disponible (fonction PHP de base)
    if (function_exists('mime_content_type')) {
        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, $allowedMimes)) {
            throw new Exception('Type de fichier non autorisé');
        }
    }
    
    // Générer un nom unique
    $filename = 'project_' . time() . '_' . uniqid() . '.' . $extension;
    $filepath = $uploadDir . $filename;
    
    // Déplacer le fichier
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Erreur de sauvegarde');
    }
    
    // URL
    $baseUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/portfoliodim/back/api/uploads/projects/';
    
    echo json_encode([
        'success' => true,
        'message' => 'Upload réussi',
        'data' => [
            'main_image_url' => $baseUrl . $filename,
            'thumbnail_url' => $baseUrl . $filename, // Même image
            'filename' => $filename
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>