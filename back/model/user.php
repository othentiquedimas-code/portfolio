<?php
require_once '../config/database.php';

class User
{
    private $conn;
    private $table_name = "users";

    public $id;
    public $uuid;
    public $first_name;
    public $last_name;
    public $email;
    public $password_hash;
    public $timezone;
    public $created_at;

    public function __construct()
    {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // Méthode d'inscription
    public function register($first_name, $last_name, $email, $password, $timezone)
    {
        try {
            // Vérifier si l'email existe déjà
            if ($this->emailExists($email)) {
                throw new Exception("Cet email est déjà utilisé.");
            }

            // Hasher le mot de passe
            $password_hash = password_hash($password, PASSWORD_DEFAULT);

            // Générer UUID
            $uuid = $this->generateUUID();

            // Requête d'insertion
            $query = "INSERT INTO " . $this->table_name . " 
                     SET uuid = :uuid, first_name = :first_name, last_name = :last_name, 
                         email = :email, password_hash = :password_hash, timezone = :timezone";

            $stmt = $this->conn->prepare($query);

            // Nettoyer et binder les données
            $stmt->bindParam(":uuid", $uuid);
            $stmt->bindParam(":first_name", htmlspecialchars(strip_tags($first_name)));
            $stmt->bindParam(":last_name", htmlspecialchars(strip_tags($last_name)));
            $stmt->bindParam(":email", htmlspecialchars(strip_tags($email)));
            $stmt->bindParam(":password_hash", $password_hash);
            $stmt->bindParam(":timezone", $timezone);

            if ($stmt->execute()) {
                $this->id = $this->conn->lastInsertId();
              
                // Décommenté les lignes suivantes si on souhaite hydrater l'objet user apres création ou les maintenir tous à null après inserction 
               
                // $this->uuid = $uuid;
                // $this->first_name = $first_name;
                // $this->last_name = $last_name;
                // $this->email = $email;
                // $this->timezone = $timezone;
                return true;
            }

            return false;
        } catch (PDOException $e) {
            throw new Exception("Erreur base de données: " . $e->getMessage());
        }
    }

    // Vérifier si l'email existe
    private function emailExists($email)
    {
        $query = "SELECT id FROM " . $this->table_name . " WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    // Méthode de connexion
    public function login($email, $password)
    {
        $query = "SELECT id, uuid, first_name, last_name, email, password_hash, timezone, created_at 
                  FROM " . $this->table_name . " 
                  WHERE email = :email LIMIT 1";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();

        if ($stmt->rowCount() == 1) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            // Vérifier le mot de passe
            if (password_verify($password, $row['password_hash'])) {
                // Hydrater l'objet
                $this->id = $row['id'];
                $this->uuid = $row['uuid'];
                $this->first_name = $row['first_name'];
                $this->last_name = $row['last_name'];
                $this->email = $row['email'];
                $this->timezone = $row['timezone'];
                $this->created_at = $row['created_at'];

                return true;
            }
        }

        return false;
    }

    // Générer UUID
    private function generateUUID()
    {
        if (function_exists('com_create_guid')) {
            return trim(com_create_guid(), '{}');
        }

        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    // Fermer la connexion
    public function __destruct()
    {
        $this->conn = null;
    }
}
