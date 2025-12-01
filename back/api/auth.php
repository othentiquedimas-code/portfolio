<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);  // cacher notices/warnings
ini_set('log_errors', 1);      // log dans error.log

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Inclure la configuration et le modèle
require_once '../config/database.php';
require_once '../model/user.php';

// Gérer les prérequis CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Démarrer la session UNE SEULE FOIS
session_start();

// Récupérer l'action
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'register':
            handleRegister();
            break;
            
        case 'login':
            handleLogin();
            break;
            
        // ✅ AJOUTS SANS MODIFIER L'EXISTANT
        case 'current_user':
            handleCurrentUser();
            break;
            
        case 'logout':
            handleLogout();
            break;
            
        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Action non spécifiée'
            ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erreur serveur: ' . $e->getMessage()
    ]);
}

function handleRegister() {
    // Récupérer les données JSON
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (empty($input['email']) || empty($input['password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Email et mot de passe requis'
        ]);
        return;
    }

    $user = new User();
    
    try {
        if ($user->register(
            $input['first_name'] ?? '',
            $input['last_name'] ?? '',
            $input['email'],
            $input['password'],
            $input['timezone'] ?? 'Europe/Paris'
        )) {
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Compte créé avec succès',
                'user' => [
                    'id' => $user->id,
                    'uuid' => $user->uuid,
                    'first_name' => $user->first_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'timezone' => $user->timezone
                ]
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la création du compte'
            ]);
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function handleLogin() {
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (empty($input['email']) || empty($input['password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Email et mot de passe requis'
        ]);
        return;
    }

    $user = new User();
    
    if ($user->login($input['email'], $input['password'])) {
        // Démarrer la session
        session_start();
        $_SESSION['user_id'] = $user->id;
        $_SESSION['user_uuid'] = $user->uuid;
        $_SESSION['user_email'] = $user->email;
        $_SESSION['user_first_name'] = $user->first_name;
        $_SESSION['user_last_name'] = $user->last_name;
        $_SESSION['user_timezone'] = $user->timezone;
        
        echo json_encode([
            'success' => true,
            'message' => 'Connexion réussie',
            'user' => [
                'id' => $user->id,
                'uuid' => $user->uuid,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'timezone' => $user->timezone
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Email ou mot de passe incorrect'
        ]);
    }
}

// AJOUTER ces fonctions
function handleCurrentUser() {
    session_start();
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Non connecté']);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'user' => [
            'first_name' => $_SESSION['user_first_name'] ?? 'Utilisateur',
            'last_name' => $_SESSION['user_last_name'] ?? ''
        ]
    ]);
}

function handleLogout() {
    session_start();
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Déconnecté']);
}

?>