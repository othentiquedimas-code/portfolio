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
-- TABLE EXPERIENCES
-- ------------------------------------------------------------
CREATE TABLE experiences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_title VARCHAR(200) NOT NULL,
    company VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    current_job TINYINT(1) DEFAULT 0,
    location VARCHAR(200),
    description TEXT NOT NULL,
    achievements TEXT,
    responsibilities JSON DEFAULT (JSON_ARRAY()),
    technologies JSON DEFAULT (JSON_ARRAY()),
    display_order INT DEFAULT 0,
    featured TINYINT(1) DEFAULT 0,
    display_in_portfolio TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
                 ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- TABLE MESSAGES (Version simplifiée pour commencer)
-- ------------------------------------------------------------
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Informations de contact (correspondent à ton formulaire)
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    sujet VARCHAR(200),
    message TEXT NOT NULL,
    
    -- Gestion du statut
    lu TINYINT(1) DEFAULT 0,      -- 0 = non lu, 1 = lu
    archive TINYINT(1) DEFAULT 0, -- 0 = non archivé, 1 = archivé
    
    -- Suivi de réponse
    reponse TEXT,                 -- Texte de la réponse admin
    date_reponse TIMESTAMP NULL,  -- Date de la réponse
    repondu_par INT NULL,         -- ID de l'admin qui a répondu
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
                 ON UPDATE CURRENT_TIMESTAMP,
    
    -- Clé étrangère
    CONSTRAINT fk_messages_repondu_par 
        FOREIGN KEY (repondu_par) 
        REFERENCES users(id) 
        ON DELETE SET NULL
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
-- INDEX POUR EXPERIENCES
-- ------------------------------------------------------------
CREATE INDEX idx_experiences_company ON experiences(company);
CREATE INDEX idx_experiences_dates ON experiences(start_date, end_date);
CREATE INDEX idx_experiences_featured ON experiences(featured);
CREATE INDEX idx_experiences_display_order ON experiences(display_order);
CREATE INDEX idx_experiences_current_job ON experiences(current_job);
CREATE INDEX idx_experiences_display_in_portfolio ON experiences(display_in_portfolio);



-- ------------------------------------------------------------
-- INDEX POUR LES PERFORMANCES
-- ------------------------------------------------------------
CREATE INDEX idx_messages_email ON messages(email);
CREATE INDEX idx_messages_lu ON messages(lu);
CREATE INDEX idx_messages_archive ON messages(archive);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_repondu_par ON messages(repondu_par);

-- Index composite utile pour l'admin
CREATE INDEX idx_messages_admin_view 
    ON messages(lu, archive, created_at DESC);



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

-- ------------------------------------------------------------
-- TRIGGER POUR EXPERIENCES
-- ------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER update_experiences_timestamp 
BEFORE UPDATE ON experiences
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END $$

DELIMITER ;


-- ------------------------------------------------------------
-- TRIGGER POUR METTRE À JOUR updated_at
-- ------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER update_messages_timestamp 
BEFORE UPDATE ON messages
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END $$

DELIMITER ;
