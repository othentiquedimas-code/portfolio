<?php
require_once '../config/database.php';

class User
{
    private $conn;
    private $table_name = "users";

    // Propriétés EXACTEMENT comme votre table
    public $id;
    public $username;
    public $email;
    public $password_hash;
    public $role;
    public $created_at;

    public function __construct()
    {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    /**
     * Méthode pour créer un nouvel utilisateur
     */
    // public function create($username, $email, $password)
    // {
    //     try {
    //         // Vérifier si l'email existe déjà
    //         if ($this->emailExists($email)) {
    //             throw new Exception("Cet email est déjà utilisé.");
    //         }

    //         // Vérifier si le username existe déjà
    //         if ($this->usernameExists($username)) {
    //             throw new Exception("Ce nom d'utilisateur est déjà pris.");
    //         }

    //         // Hasher le mot de passe
    //         $password_hash = password_hash($password, PASSWORD_DEFAULT);

    //         // Requête d'insertion
    //         $query = "INSERT INTO " . $this->table_name . " 
    //                  SET username = :username, 
    //                      email = :email, 
    //                      password_hash = :password_hash,
    //                      role = 'admin'";

    //         $stmt = $this->conn->prepare($query);

    //         // Nettoyer et binder les données
    //         $cleanUsername = htmlspecialchars(strip_tags($username));
    //         $cleanEmail = htmlspecialchars(strip_tags($email));

    //         $stmt->bindParam(":username", $cleanUsername);
    //         $stmt->bindParam(":email", $cleanEmail);
    //         $stmt->bindParam(":password_hash", $password_hash);

    //         if ($stmt->execute()) {
    //             $this->id = $this->conn->lastInsertId();
    //             $this->username = $username;
    //             $this->email = $email;
    //             $this->role = 'admin';
                
    //             return $this->id;
    //         }

    //         return false;
    //     } catch (PDOException $e) {
    //         throw new Exception("Erreur base de données: " . $e->getMessage());
    //     }
    // }

    /**
     * Méthode de connexion
     */
    public function login($email, $password)
    {
        $query = "SELECT id, username, email, password_hash, role, created_at 
                  FROM " . $this->table_name . " 
                  WHERE email = :email LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $cleanEmail = htmlspecialchars(strip_tags($email));
        $stmt->bindParam(":email", $cleanEmail);
        $stmt->execute();

        if ($stmt->rowCount() == 1) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            // Vérifier le mot de passe
            if (password_verify($password, $row['password_hash'])) {
                // Hydrater l'objet avec les données de la table
                $this->id = $row['id'];
                $this->username = $row['username'];
                $this->email = $row['email'];
                $this->role = $row['role'];
                $this->created_at = $row['created_at'];
                
                return true;
            }
        }

        return false;
    }

    /**
     * Vérifier si l'email existe déjà
     */
    public function emailExists($email)
    {
        $query = "SELECT id FROM " . $this->table_name . " WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $cleanEmail = htmlspecialchars(strip_tags($email));
        $stmt->bindParam(":email", $cleanEmail);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * Vérifier si le username existe déjà
     */
    public function usernameExists($username)
    {
        $query = "SELECT id FROM " . $this->table_name . " WHERE username = :username LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $cleanUsername = htmlspecialchars(strip_tags($username));
        $stmt->bindParam(":username", $cleanUsername);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    /**
     * Récupérer un utilisateur par ID
     */
    public function getById($id)
    {
        $query = "SELECT id, username, email, role, created_at 
                  FROM " . $this->table_name . " 
                  WHERE id = :id LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();

        if ($stmt->rowCount() == 1) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }

        return null;
    }

    /**
     * Récupérer un utilisateur par email
     */
    public function getByEmail($email)
    {
        $query = "SELECT id, username, email, role, created_at 
                  FROM " . $this->table_name . " 
                  WHERE email = :email LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $cleanEmail = htmlspecialchars(strip_tags($email));
        $stmt->bindParam(":email", $cleanEmail);
        $stmt->execute();

        if ($stmt->rowCount() == 1) {
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }

        return null;
    }

    /**
     * Mettre à jour le mot de passe
     */
    public function updatePassword($id, $new_password)
    {
        try {
            $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
            
            $query = "UPDATE " . $this->table_name . " 
                      SET password_hash = :password_hash 
                      WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":password_hash", $password_hash);
            $stmt->bindParam(":id", $id);
            
            return $stmt->execute();
        } catch (PDOException $e) {
            throw new Exception("Erreur lors de la mise à jour du mot de passe: " . $e->getMessage());
        }
    }

    /**
     * Mettre à jour les informations de l'utilisateur
     */
    public function update($id, $username = null, $email = null)
    {
        try {
            $updates = [];
            $params = [':id' => $id];
            
            if ($username !== null) {
                $updates[] = "username = :username";
                $params[':username'] = htmlspecialchars(strip_tags($username));
            }
            
            if ($email !== null) {
                $updates[] = "email = :email";
                $params[':email'] = htmlspecialchars(strip_tags($email));
            }
            
            if (empty($updates)) {
                return false;
            }
            
            $query = "UPDATE " . $this->table_name . " 
                      SET " . implode(", ", $updates) . " 
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

    // Fermer la connexion
    public function __destruct()
    {
        $this->conn = null;
    }
}