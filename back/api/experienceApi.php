<?php
session_start();
require_once '../config/database.php';
require_once '../model/experience.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// Gérer les prérequis CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Fonction pour vérifier l'authentification admin
function checkAdminAuth()
{
    if (!isset($_SESSION['user_id'])  ) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Non autorisé. Veuillez vous connecter.'
        ]);
        exit;
    }
}

// Fonction pour gérer les erreurs
function handleError($message, $code = 500)
{
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $message
    ]);
    exit;
}

// Récupérer l'action
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'list':
            handleExperienceList();
            break;

        case 'portfolio':
            handlePortfolioExperiences();
            break;

        case 'get':
            handleExperienceGet();
            break;

        case 'create':
            handleExperienceCreate();
            break;

        case 'update':
            handleExperienceUpdate();
            break;

        case 'delete':
            handleExperienceDelete();
            break;

        case 'toggle_featured':
            handleToggleFeatured();
            break;

        case 'toggle_visibility':
            handleToggleVisibility();
            break;

        case 'duplicate':
            handleExperienceDuplicate();
            break;

        default:
            handleError('Action non valide', 400);
    }
} catch (Exception $e) {
    handleError('Erreur serveur: ' . $e->getMessage());
}

// Liste des expériences pour l'admin (avec pagination, filtres, tri)
function handleExperienceList()
{
    // checkAdminAuth();

    // Récupérer les paramètres
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 10);
    $offset = ($page - 1) * $limit;
    
    $sort = $_GET['sort'] ?? 'start_date';
    $order = $_GET['order'] ?? 'desc';
    $search = $_GET['search'] ?? '';
    $filter = $_GET['filter'] ?? 'all';
    
    // Validation du tri
    $allowedSorts = ['job_title', 'company', 'start_date', 'end_date', 'display_order', 'created_at'];
    if (!in_array($sort, $allowedSorts)) {
        $sort = 'start_date';
    }
    
    // Validation de l'ordre
    $order = strtolower($order) === 'asc' ? 'ASC' : 'DESC';
    
    // Préparer les filtres
    $filters = [
        'limit' => $limit,
        'offset' => $offset,
        'sort' => $sort,
        'order' => $order
    ];
    
    if (!empty($search)) {
        $filters['search'] = $search;
    }
    
    // Appliquer le filtre spécifique
    switch ($filter) {
        case 'current':
            $filters['current_job'] = 1;
            break;
        case 'past':
            $filters['current_job'] = 0;
            break;
        case 'featured':
            $filters['featured'] = 1;
            break;
        case 'visible':
            $filters['display_in_portfolio'] = 1;
            break;
        case 'hidden':
            $filters['display_in_portfolio'] = 0;
            break;
    }

    $experience = new Experience();

    try {
        // Récupérer les expériences
        $experiences = $experience->getAll($filters);
        
        // Récupérer le total
        $total = $experience->count($filters);
        $totalPages = ceil($total / $limit);

        echo json_encode([
            'success' => true,
            'experiences' => $experiences,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => $totalPages
            ]
        ]);
    } catch (Exception $e) {
        handleError('Erreur lors du chargement: ' . $e->getMessage());
    }
}

// Expériences pour le portfolio (public)
function handlePortfolioExperiences()
{
    $experience = new Experience();

    try {
        $experiences = $experience->getAllPublished();

        echo json_encode([
            'success' => true,
            'experiences' => $experiences
        ]);
    } catch (Exception $e) {
        handleError('Erreur lors du chargement: ' . $e->getMessage());
    }
}

// Récupérer une expérience spécifique
function handleExperienceGet()
{
    checkAdminAuth();

    $id = $_GET['id'] ?? null;

    if (!$id || !is_numeric($id)) {
        handleError('ID de l\'expérience manquant ou invalide', 400);
    }

    $experience = new Experience();

    try {
        $experienceData = $experience->getById($id);

        if ($experienceData) {
            echo json_encode([
                'success' => true,
                'experience' => $experienceData
            ]);
        } else {
            handleError('Expérience non trouvée', 404);
        }
    } catch (Exception $e) {
        handleError('Erreur serveur: ' . $e->getMessage());
    }
}

// Créer une nouvelle expérience
function handleExperienceCreate()
{
    checkAdminAuth();

    $input = json_decode(file_get_contents("php://input"), true);

    if (!$input) {
        handleError('Données JSON invalides', 400);
    }

    // Validation des champs obligatoires
    $requiredFields = ['job_title', 'company', 'start_date', 'description'];
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            handleError('Le champ "' . $field . '" est requis', 400);
        }
    }

    // Validation des dates
    if (!empty($input['end_date'])) {
        $startDate = strtotime($input['start_date']);
        $endDate = strtotime($input['end_date']);
        
        if ($endDate < $startDate) {
            handleError('La date de fin doit être postérieure à la date de début', 400);
        }
    }

    $experience = new Experience();

    try {
        $experienceId = $experience->create($input);

        if ($experienceId) {
            echo json_encode([
                'success' => true,
                'message' => 'Expérience créée avec succès',
                'id' => $experienceId
            ]);
        } else {
            handleError('Erreur lors de la création', 500);
        }
    } catch (Exception $e) {
        handleError($e->getMessage(), 400);
    }
}

// Mettre à jour une expérience
function handleExperienceUpdate()
{
    checkAdminAuth();

    $input = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $input['id'] ?? null;

    if (!$id) {
        handleError('ID de l\'expérience manquant', 400);
    }

    $experience = new Experience();

    try {
        $success = $experience->update($id, $input);

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Expérience mise à jour avec succès'
            ]);
        } else {
            handleError('Erreur lors de la mise à jour', 400);
        }
    } catch (Exception $e) {
        handleError($e->getMessage(), 400);
    }
}

// Supprimer une expérience
function handleExperienceDelete()
{
    checkAdminAuth();

    $id = $_GET['id'] ?? null;

    if (!$id) {
        handleError('ID de l\'expérience manquant', 400);
    }

    $experience = new Experience();

    try {
        $success = $experience->delete($id);

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Expérience supprimée avec succès'
            ]);
        } else {
            handleError('Erreur lors de la suppression', 400);
        }
    } catch (Exception $e) {
        handleError($e->getMessage(), 400);
    }
}

// Toggle mise en avant
function handleToggleFeatured()
{
    checkAdminAuth();

    $input = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $input['id'] ?? null;

    if (!$id) {
        handleError('ID de l\'expérience manquant', 400);
    }

    $experience = new Experience();

    try {
        $success = $experience->toggleFeatured($id);

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Statut de mise en avant modifié'
            ]);
        } else {
            handleError('Erreur lors de la modification', 400);
        }
    } catch (Exception $e) {
        handleError($e->getMessage(), 400);
    }
}

// Toggle visibilité
function handleToggleVisibility()
{
    checkAdminAuth();

    $input = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? $input['id'] ?? null;

    if (!$id) {
        handleError('ID de l\'expérience manquant', 400);
    }

    $experience = new Experience();

    try {
        $success = $experience->toggleVisibility($id);

        if ($success) {
            echo json_encode([
                'success' => true,
                'message' => 'Visibilité modifiée'
            ]);
        } else {
            handleError('Erreur lors de la modification', 400);
        }
    } catch (Exception $e) {
        handleError($e->getMessage(), 400);
    }
}

// Dupliquer une expérience
function handleExperienceDuplicate()
{
    checkAdminAuth();

    $id = $_GET['id'] ?? null;

    if (!$id) {
        handleError('ID de l\'expérience manquant', 400);
    }

    $experience = new Experience();

    try {
        $newId = $experience->duplicate($id);

        if ($newId) {
            echo json_encode([
                'success' => true,
                'message' => 'Expérience dupliquée avec succès',
                'id' => $newId
            ]);
        } else {
            handleError('Erreur lors de la duplication', 400);
        }
    } catch (Exception $e) {
        handleError($e->getMessage(), 400);
    }
}