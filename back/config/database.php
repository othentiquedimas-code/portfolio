<?php
class Database {
    private $host = "localhost";
    private $db_name = "app-portfolio";
    private $username = "root";       
    private $password = "";           
    private $port = "3306";           
    public $conn;

    // Méthode de connexion
    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . 
                ";port=" . $this->port . 
                ";dbname=" . $this->db_name . 
                ";charset=utf8mb4",
                $this->username, 
                $this->password
            );
            
            // Configurer PDO pour afficher les erreurs
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

            // Désactiver emulate prepares (meilleure précision sur datetime)
            $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

            // 🟩 AJOUT IMPORTANT : réglage du fuseau horaire MySQL
            $this->conn->exec("SET time_zone = '+01:00'");

        } catch(PDOException $exception) {
            error_log("Database connection failed: " . $exception->getMessage());
        }

        return $this->conn;
    }

    public function closeConnection() {
        $this->conn = null;
    }
}
?>
