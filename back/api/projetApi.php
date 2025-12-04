<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

// Inclure la configuration et le modèle
require_once '../config/database.php';
require_once '../model/projet.php';

// Gérer les prérequis CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Démarrer la session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Récupérer l'action
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'create':
            handleProjectCreate();
            break;
            
        case 'list':
            handleProjectList();
            break;
            
        case 'get':
            handleProjectGet();
            break;
            
        case 'update':
            handleProjectUpdate();
            break;
            
        case 'delete':
            handleProjectDelete();
            break;

        case 'public_list':
            handlePublicProjectList();
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

// Fonctions pour l'administration (nécessitent une connexion)
function handleProjectCreate()
{
    // Vérifier l'authentification
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Non autorisé. Veuillez vous connecter.'
        ]);
        return;
    }

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
    $requiredFields = ['title', 'short_description', 'full_description'];
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Le champ "' . $field . '" est requis'
            ]);
            return;
        }
    }

    $project = new Project();

    try {
        $projectId = $project->create($input);
        
        if ($projectId) {
            echo json_encode([
                'success' => true,
                'message' => 'Projet créé avec succès',
                'project_id' => $projectId
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la création du projet'
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

function handleProjectList()
{
    // Vérifier l'authentification
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Non autorisé. Veuillez vous connecter.'
        ]);
        return;
    }

    $project = new Project();
    
    try {
        // Utiliser la méthode getAll() de la classe Project
        // Note: Vous devez ajouter une méthode getAll() à votre classe Project
        $projects = $project->getAll();
        
        echo json_encode([
            'success' => true,
            'projects' => $projects
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erreur lors du chargement des projets: ' . $e->getMessage()
        ]);
    }
}

// Fonction publique (pas besoin d'authentification)
function handlePublicProjectList()
{
    $project = new Project();
    
    try {
        $projects = $project->getAllPublished();
        
        echo json_encode([
            'success' => true,
            'projects' => $projects
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erreur lors du chargement des projets: ' . $e->getMessage()
        ]);
    }
}

function handleProjectGet()
{
    // Pour les projets publics, pas besoin d'authentification
    $slug = $_GET['slug'] ?? '';
    
    if (empty($slug)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Slug du projet manquant'
        ]);
        return;
    }

    $project = new Project();
    
    try {
        $projectData = $project->getBySlug($slug);
        
        if ($projectData) {
            echo json_encode([
                'success' => true,
                'project' => $projectData
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Projet non trouvé'
            ]);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erreur serveur: ' . $e->getMessage()
        ]);
    }
}

function handleProjectUpdate()
{
    // Vérifier l'authentification
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Non autorisé. Veuillez vous connecter.'
        ]);
        return;
    }

    $input = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $input['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'ID du projet manquant'
        ]);
        return;
    }

    $project = new Project();
    
    try {
        $success = $project->update($id, $input);
        
        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Projet mis à jour avec succès'
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la mise à jour du projet'
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

function handleProjectDelete()
{
    // Vérifier l'authentification
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Non autorisé. Veuillez vous connecter.'
        ]);
        return;
    }

    $input = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $input['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'ID du projet manquant'
        ]);
        return;
    }

    $project = new Project();
    
    try {
        $success = $project->delete($id);
        
        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Projet supprimé avec succès'
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la suppression du projet'
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
?>