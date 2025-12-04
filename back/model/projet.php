<?php
require_once '../config/database.php';

class Project
{
    private $conn;
    private $table_name = "projects";

    public $id;
    public $title;
    public $slug;
    public $short_description;
    public $full_description;
    public $category;
    public $technologies;
    public $features;
    public $thumbnail_url;
    public $main_image_url;
    public $github_url;
    public $demo_url;
    public $client_name;
    public $project_date;
    public $display_order;
    public $featured;
    public $status;
    public $created_at;
    public $updated_at;

    public function __construct()
    {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // Créer un projet
    public function create($data)
    {
        try {
            // Générer un slug à partir du titre
            $slug = $this->generateSlug($data['title']);

            // Convertir les tableaux en JSON
            $technologies_json = json_encode($data['technologies'] ?? []);
            $features_json = json_encode($data['features'] ?? []);

            // OPTION 1 (recommandée) : VALUES syntax
            $query = "INSERT INTO " . $this->table_name . " 
                 (title, slug, short_description, full_description, category, 
                  technologies, features, thumbnail_url, main_image_url, 
                  github_url, demo_url, client_name, project_date, 
                  display_order, featured, status) 
                 VALUES 
                 (:title, :slug, :short_description, :full_description, :category,
                  :technologies, :features, :thumbnail_url, :main_image_url,
                  :github_url, :demo_url, :client_name, :project_date,
                  :display_order, :featured, :status)";

            $stmt = $this->conn->prepare($query);

            // Nettoyer et binder les données
            $stmt->bindValue(":title", htmlspecialchars(strip_tags($data['title'])));
            $stmt->bindValue(":slug", $slug);
            $stmt->bindValue(":short_description", htmlspecialchars(strip_tags($data['short_description'])));
            $stmt->bindValue(":full_description", htmlspecialchars(strip_tags($data['full_description'])));
            $stmt->bindValue(":category", htmlspecialchars(strip_tags($data['category'] ?? 'fullstack')));
            $stmt->bindValue(":technologies", $technologies_json);  // ← SANS htmlspecialchars
            $stmt->bindValue(":features", $features_json);           // ← SANS htmlspecialchars
            $stmt->bindValue(":thumbnail_url", htmlspecialchars(strip_tags($data['thumbnail_url'] ?? '')));
            $stmt->bindValue(":main_image_url", htmlspecialchars(strip_tags($data['main_image_url'] ?? '')));
            $stmt->bindValue(":github_url", htmlspecialchars(strip_tags($data['github_url'] ?? '')));
            $stmt->bindValue(":demo_url", htmlspecialchars(strip_tags($data['demo_url'] ?? '')));
            $stmt->bindValue(":client_name", htmlspecialchars(strip_tags($data['client_name'] ?? '')));
            $stmt->bindValue(":project_date", htmlspecialchars(strip_tags($data['project_date'] ?? date('Y-m-d'))));
            $stmt->bindValue(":display_order", $data['display_order'] ?? 0, PDO::PARAM_INT);
            $stmt->bindValue(":featured", $data['featured'] ?? 0, PDO::PARAM_INT);
            $stmt->bindValue(":status", htmlspecialchars(strip_tags($data['status'] ?? 'published')));

            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
                return $this->id;
            }

            return false;
        } catch (PDOException $e) {
            // Pour déboguer, affichez l'erreur exacte
            error_log("Erreur création projet: " . $e->getMessage());
            error_log("Query: " . $query);
            throw new Exception("Erreur base de données: " . $e->getMessage());
        }
    }

    // Récupérer tous les projets publiés
    public function getAllPublished($limit = 20)
    {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE status = 'published' 
                  ORDER BY display_order ASC, created_at DESC 
                  LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->execute();

        $projects = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Décoder les JSON
            $row['technologies'] = json_decode($row['technologies'], true) ?? [];
            $row['features'] = json_decode($row['features'], true) ?? [];
            $projects[] = $row;
        }

        return $projects;
    }

    // Récupérer un projet par slug
    public function getBySlug($slug)
    {
        $query = "SELECT * FROM " . $this->table_name . " 
                  WHERE slug = :slug AND status = 'published' 
                  LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":slug", $slug);
        $stmt->execute();

        if ($stmt->rowCount() == 1) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            // Décoder les JSON
            $row['technologies'] = json_decode($row['technologies'], true) ?? [];
            $row['features'] = json_decode($row['features'], true) ?? [];
            return $row;
        }

        return null;
    }

    // Mettre à jour un projet
    public function update($id, $data)
    {
        try {
            $updates = [];
            $params = [':id' => $id];

            // Liste des champs autorisés
            $fields = [
                'title',
                'short_description',
                'full_description',
                'category',
                'technologies',
                'features',
                'thumbnail_url',
                'main_image_url',
                'github_url',
                'demo_url',
                'client_name',
                'project_date',
                'display_order',
                'featured',
                'status'
            ];

            foreach ($fields as $field) {
                if (isset($data[$field])) {
                    if ($field === 'technologies' || $field === 'features') {
                        $updates[] = "$field = :$field";
                        $params[":$field"] = json_encode($data[$field]);
                    } else if ($field === 'title') {
                        // Si le titre change, regénérer le slug
                        $updates[] = "title = :title";
                        $params[":title"] = htmlspecialchars(strip_tags($data[$field]));
                        $slug = $this->generateSlug($data['title']);
                        $updates[] = "slug = :slug";
                        $params[":slug"] = $slug;
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
                $stmt->bindValue($key, $value);
            }

            return $stmt->execute();
        } catch (PDOException $e) {
            throw new Exception("Erreur lors de la mise à jour: " . $e->getMessage());
        }
    }

    // Supprimer un projet (soft delete)
    public function delete($id)
    {
        try {
            $query = "UPDATE " . $this->table_name . " 
                      SET status = 'deleted', 
                          updated_at = CURRENT_TIMESTAMP 
                      WHERE id = :id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id);

            return $stmt->execute();
        } catch (PDOException $e) {
            throw new Exception("Erreur lors de la suppression: " . $e->getMessage());
        }
    }

    // Récupérer tous les projets (pour l'admin)
    public function getAll($limit = 100)
    {
        $query = "SELECT * FROM " . $this->table_name . " 
              ORDER BY display_order ASC, created_at DESC 
              LIMIT :limit";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->execute();

        $projects = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            // Décoder les JSON
            $row['technologies'] = json_decode($row['technologies'], true) ?? [];
            $row['features'] = json_decode($row['features'], true) ?? [];
            $projects[] = $row;
        }

        return $projects;
    }

    // Générer un slug à partir du titre
    private function generateSlug($title)
    {
        // Convertir en minuscules
        $slug = strtolower($title);
        // Remplacer les espaces par des tirets
        $slug = str_replace(' ', '-', $slug);
        // Supprimer les caractères spéciaux
        $slug = preg_replace('/[^a-z0-9\-]/', '', $slug);
        // Supprimer les tirets multiples
        $slug = preg_replace('/-+/', '-', $slug);
        // Ajouter un timestamp pour l'unicité
        $slug .= '-' . time();

        return $slug;
    }

    // Fermer la connexion
    public function __destruct()
    {
        $this->conn = null;
    }
}
