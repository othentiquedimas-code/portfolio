<?php
require_once '../config/database.php';

class Experience
{
    private $conn;
    private $table_name = "experiences";

    public $id;
    public $job_title;
    public $company;
    public $start_date;
    public $end_date;
    public $current_job;
    public $location;
    public $description;
    public $achievements;
    public $responsibilities;
    public $technologies;
    public $display_order;
    public $featured;
    public $display_in_portfolio;
    public $created_at;
    public $updated_at;

    public function __construct()
    {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // Créer une expérience
    public function create($data)
    {
        try {
            // Convertir les tableaux en JSON
            $responsibilities_json = json_encode($data['responsibilities'] ?? []);
            $technologies_json = json_encode($data['technologies'] ?? []);

            $query = "INSERT INTO " . $this->table_name . " 
                 (job_title, company, start_date, end_date, current_job,
                  location, description, achievements, responsibilities,
                  technologies, display_order, featured, display_in_portfolio) 
                 VALUES 
                 (:job_title, :company, :start_date, :end_date, :current_job,
                  :location, :description, :achievements, :responsibilities,
                  :technologies, :display_order, :featured, :display_in_portfolio)";

            $stmt = $this->conn->prepare($query);

            // Nettoyer et binder les données
            $stmt->bindValue(":job_title", htmlspecialchars(strip_tags($data['job_title'])));
            $stmt->bindValue(":company", htmlspecialchars(strip_tags($data['company'])));
            $stmt->bindValue(":start_date", htmlspecialchars(strip_tags($data['start_date'])));
            
            // Gérer la date de fin (peut être null)
            if (!empty($data['end_date'])) {
                $stmt->bindValue(":end_date", htmlspecialchars(strip_tags($data['end_date'])));
            } else {
                $stmt->bindValue(":end_date", null, PDO::PARAM_NULL);
            }
            
            $stmt->bindValue(":current_job", $data['current_job'] ?? 0, PDO::PARAM_INT);
            
            if (!empty($data['location'])) {
                $stmt->bindValue(":location", htmlspecialchars(strip_tags($data['location'])));
            } else {
                $stmt->bindValue(":location", null, PDO::PARAM_NULL);
            }
            
            $stmt->bindValue(":description", htmlspecialchars(strip_tags($data['description'])));
            
            if (!empty($data['achievements'])) {
                $stmt->bindValue(":achievements", htmlspecialchars(strip_tags($data['achievements'])));
            } else {
                $stmt->bindValue(":achievements", null, PDO::PARAM_NULL);
            }
            
            $stmt->bindValue(":responsibilities", $responsibilities_json);
            $stmt->bindValue(":technologies", $technologies_json);
            $stmt->bindValue(":display_order", $data['display_order'] ?? 0, PDO::PARAM_INT);
            $stmt->bindValue(":featured", $data['featured'] ?? 0, PDO::PARAM_INT);
            $stmt->bindValue(":display_in_portfolio", $data['display_in_portfolio'] ?? 1, PDO::PARAM_INT);

            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                return $this->id;
            }

            return false;
        } catch (PDOException $e) {
            error_log("Erreur création expérience: " . $e->getMessage());
            throw new Exception("Erreur base de données: " . $e->getMessage());
        }
    }

    // Récupérer toutes les expériences pour le portfolio
    public function getAllPublished($limit = 50)
    {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE display_in_portfolio = 1 
                  ORDER BY 
                    CASE WHEN current_job = 1 THEN 0 ELSE 1 END,
                    start_date DESC,
                    display_order ASC 
                  LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->execute();

        $experiences = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Décoder les JSON
            $row['responsibilities'] = json_decode($row['responsibilities'], true) ?? [];
            $row['technologies'] = json_decode($row['technologies'], true) ?? [];
            $experiences[] = $row;
        }

        return $experiences;
    }

    // Récupérer une expérience par ID
    public function getById($id)
    {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE id = :id 
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() == 1) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            // Décoder les JSON
            $row['responsibilities'] = json_decode($row['responsibilities'], true) ?? [];
            $row['technologies'] = json_decode($row['technologies'], true) ?? [];
            return $row;
        }

        return null;
    }

    // Mettre à jour une expérience
    public function update($id, $data)
    {
        try {
            $updates = [];
            $params = [':id' => $id];

            // Liste des champs autorisés
            $fields = [
                'job_title',
                'company',
                'start_date',
                'end_date',
                'current_job',
                'location',
                'description',
                'achievements',
                'responsibilities',
                'technologies',
                'display_order',
                'featured',
                'display_in_portfolio'
            ];

            foreach ($fields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'responsibilities' || $field === 'technologies') {
                        $updates[] = "$field = :$field";
                        $params[":$field"] = json_encode($data[$field]);
                    } else if ($field === 'end_date' && empty($data[$field])) {
                        $updates[] = "$field = NULL";
                    } else if ($field === 'current_job' || $field === 'featured' || $field === 'display_in_portfolio' || $field === 'display_order') {
                        $updates[] = "$field = :$field";
                        $params[":$field"] = intval($data[$field]);
                    } else {
                        $updates[] = "$field = :$field";
                        $params[":$field"] = htmlspecialchars(strip_tags($data[$field]));
                    }
                }
            }

            if (empty($updates)) {
                return false;
            }

            $query = "UPDATE " . $this->table_name . " 
                      SET " . implode(", ", $updates) . ", 
                          updated_at = CURRENT_TIMESTAMP
                      WHERE id = :id";

            $stmt = $this->conn->prepare($query);

            foreach ($params as $key => $value) {
                if (is_int($value)) {
                    $stmt->bindValue($key, $value, PDO::PARAM_INT);
                } else {
                    $stmt->bindValue($key, $value);
                }
            }

            return $stmt->execute();
        } catch (PDOException $e) {
            throw new Exception("Erreur lors de la mise à jour: " . $e->getMessage());
        }
    }

    // Supprimer une expérience
    public function delete($id)
    {
        try {
            $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (PDOException $e) {
            throw new Exception("Erreur lors de la suppression: " . $e->getMessage());
        }
    }

    // Récupérer toutes les expériences (pour l'admin)
    public function getAll($filters = [])
    {
        $whereConditions = [];
        $params = [];
        
        // Gestion des filtres
        if (!empty($filters['search'])) {
            $whereConditions[] = "(job_title LIKE ? OR company LIKE ? OR description LIKE ?)";
            $searchTerm = "%" . $filters['search'] . "%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        if (isset($filters['current_job'])) {
            $whereConditions[] = "current_job = ?";
            $params[] = $filters['current_job'];
        }
        
        if (isset($filters['featured'])) {
            $whereConditions[] = "featured = ?";
            $params[] = $filters['featured'];
        }
        
        if (isset($filters['display_in_portfolio'])) {
            $whereConditions[] = "display_in_portfolio = ?";
            $params[] = $filters['display_in_portfolio'];
        }
        
        // Construction de la requête
        $query = "SELECT * FROM " . $this->table_name;
        
        if (!empty($whereConditions)) {
            $query .= " WHERE " . implode(" AND ", $whereConditions);
        }
        
        // Tri
        $sortField = $filters['sort'] ?? 'start_date';
        $sortOrder = $filters['order'] ?? 'desc';
        $query .= " ORDER BY $sortField $sortOrder, display_order ASC";
        
        // Pagination
        if (isset($filters['limit']) && isset($filters['offset'])) {
            $query .= " LIMIT ? OFFSET ?";
            $params[] = intval($filters['limit']);
            $params[] = intval($filters['offset']);
        }

        $stmt = $this->conn->prepare($query);
        
        // Exécuter avec les paramètres appropriés
        for ($i = 0; $i < count($params); $i++) {
            if (is_int($params[$i])) {
                $stmt->bindValue($i + 1, $params[$i], PDO::PARAM_INT);
            } else {
                $stmt->bindValue($i + 1, $params[$i]);
            }
        }
        
        $stmt->execute();

        $experiences = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Décoder les JSON
            $row['responsibilities'] = json_decode($row['responsibilities'], true) ?? [];
            $row['technologies'] = json_decode($row['technologies'], true) ?? [];
            $experiences[] = $row;
        }

        return $experiences;
    }

    // Compter le nombre total d'expériences
    public function count($filters = [])
    {
        $whereConditions = [];
        $params = [];
        
        // Mêmes filtres que getAll()
        if (!empty($filters['search'])) {
            $whereConditions[] = "(job_title LIKE ? OR company LIKE ? OR description LIKE ?)";
            $searchTerm = "%" . $filters['search'] . "%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        if (isset($filters['current_job'])) {
            $whereConditions[] = "current_job = ?";
            $params[] = $filters['current_job'];
        }
        
        if (isset($filters['featured'])) {
            $whereConditions[] = "featured = ?";
            $params[] = $filters['featured'];
        }
        
        if (isset($filters['display_in_portfolio'])) {
            $whereConditions[] = "display_in_portfolio = ?";
            $params[] = $filters['display_in_portfolio'];
        }
        
        $query = "SELECT COUNT(*) as total FROM " . $this->table_name;
        
        if (!empty($whereConditions)) {
            $query .= " WHERE " . implode(" AND ", $whereConditions);
        }

        $stmt = $this->conn->prepare($query);
        
        // Exécuter avec les paramètres appropriés
        for ($i = 0; $i < count($params); $i++) {
            $stmt->bindValue($i + 1, $params[$i]);
        }
        
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['total'] ?? 0;
    }

    // Toggle mise en avant
    public function toggleFeatured($id)
    {
        try {
            $query = "UPDATE " . $this->table_name . " 
                      SET featured = NOT featured,
                          updated_at = CURRENT_TIMESTAMP
                      WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (PDOException $e) {
            throw new Exception("Erreur toggle featured: " . $e->getMessage());
        }
    }

    // Toggle visibilité
    public function toggleVisibility($id)
    {
        try {
            $query = "UPDATE " . $this->table_name . " 
                      SET display_in_portfolio = NOT display_in_portfolio,
                          updated_at = CURRENT_TIMESTAMP
                      WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id, PDO::PARAM_INT);
            return $stmt->execute();
        } catch (PDOException $e) {
            throw new Exception("Erreur toggle visibility: " . $e->getMessage());
        }
    }

    // Dupliquer une expérience
    public function duplicate($id)
    {
        try {
            // Récupérer l'expérience originale
            $original = $this->getById($id);
            if (!$original) {
                throw new Exception("Expérience non trouvée");
            }

            // Créer une copie avec un titre modifié
            $copyData = $original;
            unset($copyData['id']);
            unset($copyData['created_at']);
            unset($copyData['updated_at']);
            
            $copyData['job_title'] .= ' (Copie)';
            $copyData['display_order'] = 0;

            return $this->create($copyData);
        } catch (PDOException $e) {
            throw new Exception("Erreur duplication: " . $e->getMessage());
        }
    }

    // Fermer la connexion
    public function __destruct()
    {
        $this->conn = null;
    }
}