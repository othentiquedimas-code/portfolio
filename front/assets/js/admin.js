class UploadManager {
    static API_BASE_URL = window.location.origin + '/portfoliodim/back/api/';

    constructor() {
        this.mainImageInput = document.getElementById('mainImageInput');
        this.thumbnailImageInput = document.getElementById('thumbnailImageInput');
        this.mainImagePreview = document.getElementById('mainImagePreview');
        this.thumbnailPreview = document.getElementById('thumbnailPreview');
        this.mainImageUrlInput = document.getElementById('main_image_url');
        this.thumbnailUrlInput = document.getElementById('thumbnail_url');
        
        if (this.mainImageInput || this.thumbnailImageInput) {
            this.bindEvents();
        }
    }

    bindEvents() {
        if (this.mainImageInput) {
            this.mainImageInput.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files[0], 'main');
            });
        }
        
        if (this.thumbnailImageInput) {
            this.thumbnailImageInput.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files[0], 'thumbnail');
            });
        }
    }

    async handleImageUpload(file, type) {
        if (!file) return;

        this.showPreview(file, type);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(this.constructor.API_BASE_URL + 'upload.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                if (type === 'main' && this.mainImageUrlInput) {
                    this.mainImageUrlInput.value = data.data.main_image_url;
                } else if (type === 'thumbnail' && this.thumbnailUrlInput) {
                    this.thumbnailUrlInput.value = data.data.thumbnail_url || data.data.main_image_url;
                }
                
                this.showMessage('Image uploadée avec succès!', 'success');
                
            } else {
                this.showMessage('Erreur: ' + (data.error || 'Erreur lors de l\'upload'), 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showMessage('Erreur de connexion au serveur', 'error');
        }
    }

    showPreview(file, type) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (type === 'main' && this.mainImagePreview) {
                this.mainImagePreview.src = e.target.result;
                this.mainImagePreview.style.display = 'block';
            } else if (type === 'thumbnail' && this.thumbnailPreview) {
                this.thumbnailPreview.src = e.target.result;
                this.thumbnailPreview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    showMessage(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
        `;
        notification.innerHTML = `
            <strong>${type === 'success' ? '✅' : '❌'} ${type === 'success' ? 'Succès' : 'Erreur'}</strong>
            <div>${message}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

class AdminManager {
    constructor() {
        console.log("🎯 Démarrage de l'administration...");
        
        this.API_BASE_URL = "http://localhost/portfoliodim/back/api/";
        console.log("🌐 URL de l'API :", this.API_BASE_URL);
        
        this.projectsTableBody = document.getElementById("projectsTableBody");
        this.projectForm = document.getElementById("projectForm");
        this.logoutBtn = document.getElementById("logoutBtn");
        
        this.uploadManager = new UploadManager();
        
        this.init();
    }

    async init() {
        console.log("🔐 Vérification de la connexion...");
        
        const estConnecte = await this.verifierConnexion();
        
        if (!estConnecte) {
            this.showAlert("❌ Vous devez être connecté !", "error");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);
            return;
        }
        
        console.log("✅ Utilisateur connecté !");
        
        this.configurerBoutons();
        await this.chargerProjets();
        this.configurerChampsDynamiques();
    }

    async verifierConnexion() {
        try {
            const url = this.API_BASE_URL + "auth.php?action=check";
            console.log("📡 Appel à :", url);
            
            const reponse = await fetch(url, {
                method: "GET",
                credentials: "include"
            });
            
            console.log("📥 Réponse reçue, statut :", reponse.status);
            
            const texte = await reponse.text();
            console.log("📄 Contenu brut :", texte.substring(0, 200));
            
            if (texte.includes("<!DOCTYPE")) {
                console.error("❌ Le serveur envoie du HTML, pas du JSON !");
                return false;
            }
            
            const donnees = JSON.parse(texte);
            console.log("✅ Données JSON :", donnees);
            
            return donnees.authenticated === true;
            
        } catch (erreur) {
            console.error("💥 ERREUR lors de la vérification :", erreur);
            return false;
        }
    }

    async chargerProjets() {
        if (!this.projectsTableBody) {
            console.error("❌ Tableau des projets non trouvé !");
            return;
        }
        
        try {
            const url = this.API_BASE_URL + "projetApi.php?action=list";
            console.log("📡 Chargement des projets depuis :", url);
            
            const reponse = await fetch(url, {
                credentials: "include"
            });
            
            const texte = await reponse.text();
            console.log("📄 Réponse brute :", texte.substring(0, 300));
            
            if (texte.includes("<!DOCTYPE")) {
                this.projectsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-danger">
                            ❌ ERREUR : Le serveur retourne du HTML au lieu de JSON<br>
                            <small>Vérifiez que projetApi.php existe</small>
                        </td>
                    </tr>
                `;
                return;
            }
            
            const donnees = JSON.parse(texte);
            
            if (donnees.success) {
                this.afficherProjets(donnees.projects);
            } else {
                this.projectsTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-danger">
                            ❌ ${donnees.error || "Erreur inconnue"}
                        </td>
                    </tr>
                `;
            }
            
        } catch (erreur) {
            console.error("💥 ERREUR lors du chargement :", erreur);
            this.projectsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        ❌ Impossible de charger les projets<br>
                        <small>${erreur.message}</small>
                    </td>
                </tr>
            `;
        }
    }

    afficherProjets(projets) {
        let html = "";
        
        if (!projets || projets.length === 0) {
            html = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        📭 Aucun projet pour le moment
                    </td>
                </tr>
            `;
        } else {
            projets.forEach(projet => {
                const date = new Date(projet.created_at).toLocaleDateString("fr-FR");
                
                html += `
                    <tr>
                        <td>${projet.title}</td>
                        <td><span class="badge bg-primary">${projet.category}</span></td>
                        <td>
                            <span class="badge ${projet.status === "published" ? "bg-success" : "bg-warning"}">
                                ${projet.status}
                            </span>
                        </td>
                        <td>${date}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger ms-2">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
        
        this.projectsTableBody.innerHTML = html;
    }

    configurerBoutons() {
        if (this.projectForm) {
            this.projectForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.creerProjet();
            });
        }
        
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener("click", () => {
                this.deconnexion();
            });
        }
    }

    configurerChampsDynamiques() {
        // Écoute au niveau du document pour les touches Entrée
        document.addEventListener("keypress", (e) => {
            if (e.target.classList.contains("technology-input") && e.key === "Enter") {
                e.preventDefault();
                this.ajouterTechnologie();
            }
            
            if (e.target.classList.contains("feature-input") && e.key === "Enter") {
                e.preventDefault();
                this.ajouterFonctionnalite();
            }
        });
    }

    async creerProjet() {
        try {
            console.log("🚀 Démarrage de la création du projet...");
            
            const donneesProjet = {
                title: document.getElementById("title")?.value.trim() || "",
                short_description: document.getElementById("short_description")?.value.trim() || "",
                full_description: document.getElementById("full_description")?.value.trim() || "",
                category: document.getElementById("category")?.value || "fullstack",
                technologies: this.getTechnologies(),
                features: this.getFeatures(),
                thumbnail_url: document.getElementById("thumbnail_url")?.value.trim() || null,
                main_image_url: document.getElementById("main_image_url")?.value.trim() || null,
                github_url: document.getElementById("github_url")?.value.trim() || null,
                demo_url: document.getElementById("demo_url")?.value.trim() || null,
                client_name: document.getElementById("client_name")?.value.trim() || null,
                project_date: document.getElementById("project_date")?.value || new Date().toISOString().split('T')[0],
                display_order: parseInt(document.getElementById("display_order")?.value || "0"),
                featured: document.getElementById("featured")?.checked ? 1 : 0,
                status: document.getElementById("status")?.value || "published"
            };
            
            console.log("📦 Données récupérées du formulaire :", donneesProjet);
            
            const erreurs = [];
            
            if (!donneesProjet.title) {
                erreurs.push("Le titre est obligatoire");
            }
            
            if (!donneesProjet.short_description) {
                erreurs.push("La description courte est obligatoire");
            }
            
            if (!donneesProjet.full_description) {
                erreurs.push("La description complète est obligatoire");
            }
            
            if (donneesProjet.short_description.length > 500) {
                erreurs.push("La description courte ne doit pas dépasser 500 caractères");
            }
            
            if (erreurs.length > 0) {
                this.showAlert(erreurs.join("\n"), "error");
                return;
            }
            
            const btnSubmit = document.querySelector("#projectForm button[type='submit']");
            let texteOriginal = "";
            if (btnSubmit) {
                texteOriginal = btnSubmit.innerHTML;
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Création en cours...';
                btnSubmit.disabled = true;
            }
            
            const url = this.API_BASE_URL + "projetApi.php?action=create";
            console.log("📡 Envoi POST à :", url);
            
            const reponse = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(donneesProjet)
            });
            
            console.log("📥 Réponse reçue, statut :", reponse.status);
            
            const texteReponse = await reponse.text();
            console.log("📄 Réponse brute :", texteReponse);
            
            let resultat;
            try {
                resultat = JSON.parse(texteReponse);
            } catch (e) {
                console.error("❌ La réponse n'est pas du JSON valide :", e);
                throw new Error("Le serveur a retourné une réponse invalide");
            }
            
            console.log("✅ Réponse JSON parsée :", resultat);
            
            if (reponse.ok && resultat.success) {
                console.log("🎉 Projet créé avec succès ! ID :", resultat.project_id);
                
                this.showAlert("✅ Projet créé avec succès ! ID : " + resultat.project_id, "success");
                
                this.reinitialiserFormulaire();
                
                await this.chargerProjets();
                
                const listProjectsTab = document.getElementById("listProjects");
                if (listProjectsTab) {
                    listProjectsTab.scrollIntoView({ behavior: "smooth" });
                }
                
            } else {
                const messageErreur = resultat.error || "Erreur inconnue lors de la création";
                console.error("❌ Erreur du serveur :", messageErreur);
                
                this.showAlert("❌ " + messageErreur, "error");
            }
            
        } catch (erreur) {
            console.error("💥 Erreur lors de la création du projet :", erreur);
            
            this.showAlert("❌ Erreur : " + erreur.message, "error");
            
        } finally {
            const btnSubmit = document.querySelector("#projectForm button[type='submit']");
            if (btnSubmit) {
                btnSubmit.innerHTML = '<i class="fas fa-save me-2"></i>Créer le projet';
                btnSubmit.disabled = false;
            }
        }
    }

    getTechnologies() {
        const inputs = document.querySelectorAll("#technologiesContainer input[type='text']");
        const technologies = [];
        
        inputs.forEach(input => {
            const valeur = input.value.trim();
            if (valeur) {
                technologies.push(valeur);
            }
        });
        
        return technologies;
    }

    getFeatures() {
        const inputs = document.querySelectorAll("#featuresContainer input[type='text']");
        const features = [];
        
        inputs.forEach(input => {
            const valeur = input.value.trim();
            if (valeur) {
                features.push(valeur);
            }
        });
        
        return features;
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${type === 'success' ? '<i class="fas fa-check-circle me-2"></i>' : type === 'error' ? '<i class="fas fa-exclamation-triangle me-2"></i>' : '<i class="fas fa-info-circle me-2"></i>'}
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector(".admin-container") || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    async deconnexion() {
        try {
            const reponse = await fetch(this.API_BASE_URL + "auth.php?action=logout", {
                method: "POST",
                credentials: "include"
            });
            
            const donnees = await reponse.json();
            
            if (donnees.success) {
                window.location.href = "login.html";
            }
        } catch (erreur) {
            console.error("Erreur de déconnexion :", erreur);
        }
    }

    ajouterTechnologie() {
        console.log("➕ Appel de ajouterTechnologie");
        const container = document.getElementById("technologiesContainer");
        if (!container) {
            console.error("❌ Container technologies non trouvé");
            return;
        }
        
        // Créer un nouveau champ
        const div = document.createElement("div");
        div.className = "input-group mb-2";
        div.innerHTML = `
            <input type="text" class="form-control technology-input" placeholder="Nouvelle technologie...">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(div);
        
        // Focus sur le nouveau champ
        const nouveauInput = div.querySelector("input");
        nouveauInput.focus();
        
        console.log("✅ Nouveau champ technologie ajouté");
    }

    ajouterFonctionnalite() {
        console.log("➕ Appel de ajouterFonctionnalite");
        const container = document.getElementById("featuresContainer");
        if (!container) {
            console.error("❌ Container features non trouvé");
            return;
        }
        
        // Créer un nouveau champ
        const div = document.createElement("div");
        div.className = "input-group mb-2";
        div.innerHTML = `
            <input type="text" class="form-control feature-input" placeholder="Nouvelle fonctionnalité...">
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(div);
        
        // Focus sur le nouveau champ
        const nouveauInput = div.querySelector("input");
        nouveauInput.focus();
        
        console.log("✅ Nouveau champ fonctionnalité ajouté");
    }

    reinitialiserFormulaire() {
        if (this.projectForm) {
            this.projectForm.reset();
        }
        
        const techContainer = document.getElementById("technologiesContainer");
        if (techContainer) {
            techContainer.innerHTML = `
                <div class="input-group mb-2">
                    <input type="text" class="form-control technology-input" placeholder="Ex: React, Node.js...">
                    <button class="btn btn-outline-secondary" type="button" onclick="addTechnology()">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
        }
        
        const featuresContainer = document.getElementById("featuresContainer");
        if (featuresContainer) {
            featuresContainer.innerHTML = `
                <div class="input-group mb-2">
                    <input type="text" class="form-control feature-input" placeholder="Ex: Authentification, Dashboard...">
                    <button class="btn btn-outline-secondary" type="button" onclick="addFeature()">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
        }
    }
}

// ==============================================
// FONCTIONS GLOBALES POUR LES BOUTONS
// ==============================================

window.addTechnology = function() {
    console.log("🟡 Bouton addTechnology cliqué");
    console.log("adminManager existe ?", typeof window.adminManager !== 'undefined');
    
    // Attendre un peu si adminManager n'est pas encore prêt
    if (!window.adminManager) {
        console.log("⏳ adminManager pas encore initialisé, attente de 100ms...");
        setTimeout(() => {
            if (window.adminManager && window.adminManager.ajouterTechnologie) {
                window.adminManager.ajouterTechnologie();
            } else {
                console.error("❌ adminManager toujours pas disponible après attente");
                fallbackAddTechnology();
            }
        }, 100);
        return;
    }
    
    // Si adminManager est prêt
    if (window.adminManager.ajouterTechnologie) {
        window.adminManager.ajouterTechnologie();
    } else {
        console.error("❌ Méthode ajouterTechnologie non trouvée");
        fallbackAddTechnology();
    }
};

window.addFeature = function() {
    console.log("🟡 Bouton addFeature cliqué");
    console.log("adminManager existe ?", typeof window.adminManager !== 'undefined');
    
    // Attendre un peu si adminManager n'est pas encore prêt
    if (!window.adminManager) {
        console.log("⏳ adminManager pas encore initialisé, attente de 100ms...");
        setTimeout(() => {
            if (window.adminManager && window.adminManager.ajouterFonctionnalite) {
                window.adminManager.ajouterFonctionnalite();
            } else {
                console.error("❌ adminManager toujours pas disponible après attente");
                fallbackAddFeature();
            }
        }, 100);
        return;
    }
    
    // Si adminManager est prêt
    if (window.adminManager.ajouterFonctionnalite) {
        window.adminManager.ajouterFonctionnalite();
    } else {
        console.error("❌ Méthode ajouterFonctionnalite non trouvée");
        fallbackAddFeature();
    }
};

window.resetForm = function() {
    console.log("🟡 Bouton resetForm cliqué");
    
    if (!window.adminManager) {
        console.log("⏳ adminManager pas encore initialisé, attente de 100ms...");
        setTimeout(() => {
            if (window.adminManager && window.adminManager.reinitialiserFormulaire) {
                window.adminManager.reinitialiserFormulaire();
            } else {
                console.error("❌ adminManager toujours pas disponible après attente");
                fallbackResetForm();
            }
        }, 100);
        return;
    }
    
    if (window.adminManager.reinitialiserFormulaire) {
        window.adminManager.reinitialiserFormulaire();
    } else {
        console.error("❌ Méthode reinitialiserFormulaire non trouvée");
        fallbackResetForm();
    }
};

// Fonctions de fallback
function fallbackAddTechnology() {
    console.log("🔄 Utilisation de fallbackAddTechnology");
    const container = document.getElementById("technologiesContainer");
    if (!container) {
        console.error("❌ Container technologies non trouvé");
        return;
    }
    
    const div = document.createElement("div");
    div.className = "input-group mb-2";
    div.innerHTML = `
        <input type="text" class="form-control technology-input" placeholder="Nouvelle technologie...">
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
    
    const nouveauInput = div.querySelector("input");
    nouveauInput.focus();
}

function fallbackAddFeature() {
    console.log("🔄 Utilisation de fallbackAddFeature");
    const container = document.getElementById("featuresContainer");
    if (!container) {
        console.error("❌ Container features non trouvé");
        return;
    }
    
    const div = document.createElement("div");
    div.className = "input-group mb-2";
    div.innerHTML = `
        <input type="text" class="form-control feature-input" placeholder="Nouvelle fonctionnalité...">
        <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
    
    const nouveauInput = div.querySelector("input");
    nouveauInput.focus();
}

function fallbackResetForm() {
    console.log("🔄 Utilisation de fallbackResetForm");
    const form = document.getElementById("projectForm");
    if (form) form.reset();
    
    const techContainer = document.getElementById("technologiesContainer");
    if (techContainer) {
        techContainer.innerHTML = `
            <div class="input-group mb-2">
                <input type="text" class="form-control technology-input" placeholder="Ex: React, Node.js...">
                <button class="btn btn-outline-secondary" type="button" onclick="addTechnology()">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    }
    
    const featuresContainer = document.getElementById("featuresContainer");
    if (featuresContainer) {
        featuresContainer.innerHTML = `
            <div class="input-group mb-2">
                <input type="text" class="form-control feature-input" placeholder="Ex: Authentification, Dashboard...">
                <button class="btn btn-outline-secondary" type="button" onclick="addFeature()">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    }
}

// ==============================================
// INITIALISATION
// ==============================================

document.addEventListener("DOMContentLoaded", function() {
    console.log("📄 Page admin chargée !");
    
    try {
        window.adminManager = new AdminManager();
        console.log("✅ AdminManager initialisé");
        
    } catch (erreur) {
        console.error("💥 Erreur initialisation AdminManager :", erreur);
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger';
        alertDiv.innerHTML = `
            <strong>❌ Erreur de chargement</strong>
            <div>Veuillez recharger la page ou contacter l'administrateur.</div>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-danger" onclick="location.reload()">
                    <i class="fas fa-redo me-1"></i> Recharger
                </button>
            </div>
        `;
        
        document.body.insertBefore(alertDiv, document.body.firstChild);
    }
});