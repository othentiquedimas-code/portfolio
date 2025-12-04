<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

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
        case 'login':
            handleLogin();
            break;
            
        // case 'register':
        //     handleRegister();
        //     break;
            
        case 'current_user':
            handleCurrentUser();
            break;
            
        case 'logout':
            handleLogout();
            break;
            
        case 'check':
            handleCheckAuth();
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

function handleLogin() {
    // Récupérer les données JSON
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Données JSON invalides'
        ]);
        return;
    }
    
    // Validation des champs obligatoires
    if (empty($input['email']) || empty($input['password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Email et mot de passe requis'
        ]);
        return;
    }

    // Validation de l'email
    if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Format d\'email invalide'
        ]);
        return;
    }

    $user = new User();
    
    try {
        if ($user->login($input['email'], $input['password'])) {
            // Stocker uniquement ce qui existe dans la table
            $_SESSION['user_id'] = $user->id;
            $_SESSION['user_username'] = $user->username;
            $_SESSION['user_email'] = $user->email;
            $_SESSION['user_role'] = $user->role;
            $_SESSION['last_activity'] = time();
            
            echo json_encode([
                'success' => true,
                'message' => 'Connexion réussie',
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'Email ou mot de passe incorrect'
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

// function handleRegister() {
//     // Récupérer les données JSON
//     $input = json_decode(file_get_contents("php://input"), true);
    
//     if (!$input) {
//         http_response_code(400);
//         echo json_encode([
//             'success' => false,
//             'error' => 'Données JSON invalides'
//         ]);
//         return;
//     }
    
//     // Validation adaptée
//     $requiredFields = ['username', 'email', 'password'];
//     foreach ($requiredFields as $field) {
//         if (empty($input[$field])) {
//             http_response_code(400);
//             echo json_encode([
//                 'success' => false,
//                 'error' => 'Le champ "' . $field . '" est requis'
//             ]);
//             return;
//         }
//     }
    
//     // Validation de l'email
//     if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
//         http_response_code(400);
//         echo json_encode([
//             'success' => false,
//             'error' => 'Format d\'email invalide'
//         ]);
//         return;
//     }
    
//     // Validation du mot de passe
//     if (strlen($input['password']) < 8) {
//         http_response_code(400);
//         echo json_encode([
//             'success' => false,
//             'error' => 'Le mot de passe doit contenir au moins 8 caractères'
//         ]);
//         return;
//     }

//     $user = new User();
    
//     try {
//         // Appeler la nouvelle méthode avec les bons paramètres
//         $userId = $user->create(
//             $input['username'],
//             $input['email'],
//             $input['password']
//         );
        
//         if ($userId) {
//             // Connexion automatique
//             if ($user->login($input['email'], $input['password'])) {
//                 $_SESSION['user_id'] = $user->id;
//                 $_SESSION['user_username'] = $user->username;
//                 $_SESSION['user_email'] = $user->email;
//                 $_SESSION['user_role'] = $user->role;
//                 $_SESSION['last_activity'] = time();
                
//                 echo json_encode([
//                     'success' => true,
//                     'message' => 'Compte créé avec succès',
//                     'user' => [
//                         'id' => $user->id,
//                         'username' => $user->username,
//                         'email' => $user->email,
//                         'role' => $user->role
//                     ]
//                 ]);
//             } else {
//                 // Si la connexion automatique échoue
//                 echo json_encode([
//                     'success' => true,
//                     'message' => 'Compte créé avec succès. Vous pouvez maintenant vous connecter.'
//                 ]);
//             }
//         } else {
//             http_response_code(500);
//             echo json_encode([
//                 'success' => false,
//                 'error' => 'Erreur lors de la création du compte'
//             ]);
//         }
//     } catch (Exception $e) {
//         http_response_code(400);
//         echo json_encode([
//             'success' => false,
//             'error' => $e->getMessage()
//         ]);
//     }
// }

function handleCurrentUser() {
    // ✅ DÉMARRER LA SESSION POUR ACCÉDER AUX VARIABLES
    session_start();
    
    // VÉRIFIER SI L'UTILISATEUR EST CONNECTÉ
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Utilisateur non connecté'
        ]);
        return;
    }
    
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $_SESSION['user_id'] ?? null,
            'username' => $_SESSION['user_username'] ?? '',
            'email' => $_SESSION['user_email'] ?? '',
            'role' => $_SESSION['user_role'] ?? 'admin'
        ]
    ]);
}

function handleLogout() {
    // Nettoyer toutes les données de session
    $_SESSION = array();
    
    // Détruire le cookie de session
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // Détruire la session
    session_destroy();
    
    echo json_encode([
        'success' => true,
        'message' => 'Déconnexion réussie'
    ]);
}

function handleCheckAuth() {
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => true,
            'authenticated' => true,
            'user' => [
                'username' => $_SESSION['user_username'] ?? 'Utilisateur',
                'email' => $_SESSION['user_email'] ?? ''
            ]
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'authenticated' => false
        ]);
    }
}
?>