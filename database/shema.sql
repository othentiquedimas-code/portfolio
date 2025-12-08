-- ------------------------------------------------------------
-- TABLE USERS
-- ------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- TABLE PROJECTS
-- ------------------------------------------------------------
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Informations
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,

    short_description VARCHAR(500) NOT NULL,
    full_description TEXT NOT NULL,

    category VARCHAR(50) DEFAULT 'fullstack',

    -- MySQL supporte JSON nativement
    technologies JSON DEFAULT (JSON_ARRAY()),
    features JSON DEFAULT (JSON_ARRAY()),

    -- Images
    thumbnail_url VARCHAR(500),
    main_image_url VARCHAR(500),

    -- Liens
    github_url VARCHAR(500),
    demo_url VARCHAR(500),

    -- Métadonnées
    client_name VARCHAR(100),
    project_date DATE,

    display_order INT DEFAULT 0,
    featured TINYINT(1) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
                 ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- UTILISATEUR ADMIN PAR DÉFAUT
-- ------------------------------------------------------------
INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin',
    'admin@portfolio.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
    'admin'
);

-- ------------------------------------------------------------
-- INDEX POUR LES PERFORMANCES
-- ------------------------------------------------------------
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_featured ON projects(featured);
CREATE INDEX idx_projects_display_order ON projects(display_order);
CREATE INDEX idx_projects_slug ON projects(slug);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ------------------------------------------------------------
-- TRIGGER POUR METTRE À JOUR updated_at
-- ------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER update_projects_timestamp 
BEFORE UPDATE ON projects
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END $$

DELIMITER ;
