class UploadManager {
    static API_BASE_URL = window.location.origin + '/portfoliodim/back/api/';

    constructor() {
        // Récupération des éléments DOM pour l'upload d'images
        this.mainImageInput = document.getElementById('mainImageInput');
        this.thumbnailImageInput = document.getElementById('thumbnailImageInput');
        this.mainImagePreview = document.getElementById('mainImagePreview');
        this.thumbnailPreview = document.getElementById('thumbnailPreview');
        this.mainImageUrlInput = document.getElementById('main_image_url');
        this.thumbnailUrlInput = document.getElementById('thumbnail_url');
        
        // Initialisation des événements si les inputs existent
        if (this.mainImageInput || this.thumbnailImageInput) {
            this.bindEvents();
        }
    }

    // Configuration des écouteurs d'événements pour les uploads
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

    // Gestion de l'upload d'une image
    async handleImageUpload(file, type) {
        if (!file) return;

        // Afficher un aperçu immédiat
        this.showPreview(file, type);

        try {
            const formData = new FormData();
            formData.append('image', file);

            // Envoi de l'image au serveur
            const response = await fetch(this.constructor.API_BASE_URL + 'upload.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                // Remplir automatiquement le champ URL correspondant
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
            console.error('Erreur upload:', error);
            this.showMessage('Erreur de connexion au serveur', 'error');
        }
    }

    // Afficher un aperçu de l'image avant upload
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

    // Afficher un message de notification
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
        
        // Auto-suppression après 5 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

class AdminManager {
    constructor() {
        // Configuration de l'URL de base de l'API
        this.API_BASE_URL = "http://localhost/portfoliodim/back/api/";
        
        // Récupération des éléments DOM principaux
        this.logoutBtn = document.getElementById("logoutBtn");
        
        // Initialisation du gestionnaire d'upload
        this.uploadManager = new UploadManager();
        
        // Configurer les boutons du modal IMMÉDIATEMENT
        this.setupModalButtons();

        // Initialisation de l'admin
        this.init();
    }

    // Initialisation principale
    async init() {
        // Vérification de l'authentification
        const estConnecte = await this.verifierConnexion();
        
        if (!estConnecte) {
            this.showAlert("❌ Vous devez être connecté !", "error");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);
            return;
        }
        
        // Configuration des fonctionnalités
        this.configurerBoutons();
        await this.chargerProjets();
        this.configurerChampsDynamiques();
    }

    // Vérifier si l'utilisateur est connecté
    async verifierConnexion() {
        try {
            const url = this.API_BASE_URL + "auth.php?action=check";
            
            const reponse = await fetch(url, {
                method: "GET",
                credentials: "include"
            });
            
            const texte = await reponse.text();
            
            if (texte.includes("<!DOCTYPE")) {
                return false; // Le serveur retourne du HTML au lieu de JSON
            }
            
            const donnees = JSON.parse(texte);
            
            return donnees.authenticated === true;
            
        } catch (erreur) {
            console.error("Erreur vérification connexion:", erreur);
            return false;
        }
    }

    // Charger la liste des projets depuis l'API
    async chargerProjets() {
        try {
            // Charger les projets pour AdminManager si nécessaire
            const url = this.API_BASE_URL + "projetApi.php?action=admin_list";
            const reponse = await fetch(url, { credentials: "include" });
            const texte = await reponse.text();
            
            if (texte.includes("<!DOCTYPE")) {
                console.error("ERREUR : Le serveur retourne du HTML au lieu de JSON");
                return;
            }
            
            const donnees = JSON.parse(texte);
            
            if (donnees.success) {
                // Stocker les projets dans AdminManager pour usage interne
                this.projects = donnees.projects;
                
                // Ne plus appeler afficherProjets car on utilise GlacialTableManager
                console.log('Projets chargés:', donnees.projects.length);
            } else {
                console.error('Erreur API:', donnees.error);
            }
            
        } catch (erreur) {
            console.error("Erreur chargement projets:", erreur);
        }
    }

    // Configurer les écouteurs d'événements des boutons
    configurerBoutons() {
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener("click", () => {
                this.deconnexion();
            });
        }
    }

    // Configurer les champs dynamiques (technologies et fonctionnalités)
    configurerChampsDynamiques() {
        // Écouter la touche Entrée pour ajouter des éléments
        document.addEventListener("keypress", (e) => {
            if (e.target.classList.contains("edit-technology-input") && e.key === "Enter") {
                e.preventDefault();
                window.addEditTechnology();
            }
            
            if (e.target.classList.contains("edit-feature-input") && e.key === "Enter") {
                e.preventDefault();
                window.addEditFeature();
            }
        });

        // Prévisualisation des images en édition
        document.getElementById('edit_main_image_url')?.addEventListener('input', (e) => {
            this.updateImagePreview('edit_main_image_url', 'edit_main_image_preview');
        });
        
        document.getElementById('edit_thumbnail_url')?.addEventListener('input', (e) => {
            this.updateImagePreview('edit_thumbnail_url', 'edit_thumbnail_preview');
        });
    }

    // Créer un nouveau projet (pour le formulaire caché si existant)
    async creerProjet() {
        try {
            // Récupération des données du formulaire
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
            
            // Validation des données
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
            
            // État "chargement" pour le bouton
            const btnSubmit = document.querySelector("#projectForm button[type='submit']");
            let texteOriginal = "";
            if (btnSubmit) {
                texteOriginal = btnSubmit.innerHTML;
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Création en cours...';
                btnSubmit.disabled = true;
            }
            
            // Envoi de la requête à l'API
            const url = this.API_BASE_URL + "projetApi.php?action=create";
            
            const reponse = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(donneesProjet)
            });
            
            const texteReponse = await reponse.text();
            
            let resultat;
            try {
                resultat = JSON.parse(texteReponse);
            } catch (e) {
                console.error("Réponse JSON invalide:", e);
                throw new Error("Le serveur a retourné une réponse invalide");
            }
            
            if (reponse.ok && resultat.success) {
                this.showAlert("✅ Projet créé avec succès ! ID : " + resultat.project_id, "success");
                
                // Recharger les projets
                await this.chargerProjets();
                
            } else {
                const messageErreur = resultat.error || "Erreur inconnue lors de la création";
                this.showAlert("❌ " + messageErreur, "error");
            }
            
        } catch (erreur) {
            console.error("Erreur création projet:", erreur);
            this.showAlert("❌ Erreur : " + erreur.message, "error");
            
        } finally {
            // Restauration du bouton
            const btnSubmit = document.querySelector("#projectForm button[type='submit']");
            if (btnSubmit) {
                btnSubmit.innerHTML = '<i class="fas fa-save me-2"></i>Créer le projet';
                btnSubmit.disabled = false;
            }
        }
    }

    // Récupérer les technologies saisies (pour formulaire caché)
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

    // Récupérer les fonctionnalités saisies (pour formulaire caché)
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

    // Afficher une alerte
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
        
        // Auto-suppression après 5 secondes
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Déconnexion
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
            console.error("Erreur de déconnexion:", erreur);
        }
    }

    // ==============================================
    // GESTION DU MODAL D'AJOUT
    // ==============================================

    // Configurer les boutons du modal
    setupModalButtons() {
        // Configurer le bouton "Nouveau projet"
        const addProjectBtn = document.querySelector('[onclick*="openAddProjectModal"]');
        if (addProjectBtn) {
            // Remplacer l'attribut onclick par un écouteur d'événements
            addProjectBtn.removeAttribute('onclick');
            addProjectBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.openAddProjectModal) {
                    this.openAddProjectModal();
                } else {
                    console.error('openAddProjectModal non disponible');
                    // Fallback
                    const modal = new bootstrap.Modal(document.getElementById('addProjectModal'));
                    modal.show();
                }
            });
            console.log('Bouton "Nouveau projet" configuré');
        }
    }

    // Ouvrir le modal d'ajout de projet
    openAddProjectModal() {
        console.log('Méthode openAddProjectModal appelée');
        
        // Récupérer le formulaire modal
        const modalForm = document.getElementById('addProjectForm');
        if (!modalForm) {
            console.error('Formulaire modal non trouvé');
            return;
        }
        
        // Réinitialiser le formulaire
        this.resetModalForm();
        
        // Configurer la soumission du formulaire
        modalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitModalForm();
        });
        
        // Configurer l'upload d'images
        this.setupModalUploads();
        
        // Ouvrir le modal
        const modal = new bootstrap.Modal(document.getElementById('addProjectModal'));
        modal.show();
    }

    // Réinitialiser le formulaire modal
    resetModalForm() {
        const modalForm = document.getElementById('addProjectForm');
        if (!modalForm) return;
        
        modalForm.reset();
        
        // Réinitialiser les technologies
        const techContainer = document.getElementById('modal_technologiesContainer');
        if (techContainer) {
            techContainer.innerHTML = `
                <div class="glacial-input-group mb-2">
                    <input type="text" class="form-control glacial-input" 
                           placeholder="Ex: React, Node.js..." 
                           id="modal_technology_input">
                    <button type="button" class="btn btn-outline-secondary" onclick="addModalTechnology()">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
        }
        
        // Réinitialiser les fonctionnalités
        const featuresContainer = document.getElementById('modal_featuresContainer');
        if (featuresContainer) {
            featuresContainer.innerHTML = `
                <div class="glacial-input-group mb-2">
                    <input type="text" class="form-control glacial-input" 
                           placeholder="Ex: Authentification, Dashboard..." 
                           id="modal_feature_input">
                    <button type="button" class="btn btn-outline-secondary" onclick="addModalFeature()">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
        }
        
        // Date par défaut = aujourd'hui
        const dateInput = document.getElementById('modal_project_date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    // Configurer les uploads pour le modal
    setupModalUploads() {
        // Image principale
        const mainImageInput = document.getElementById('modal_mainImageInput');
        const mainImagePreview = document.getElementById('modal_main_image_preview');
        const mainImageUrl = document.getElementById('modal_main_image_url');
        
        if (mainImageInput && this.uploadManager) {
            mainImageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // Afficher l'aperçu
                if (mainImagePreview) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        mainImagePreview.innerHTML = `
                            <img src="${e.target.result}" alt="Aperçu" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
                        `;
                    };
                    reader.readAsDataURL(file);
                }
                
                // Upload vers le serveur
                try {
                    const formData = new FormData();
                    formData.append('image', file);
                    
                    const response = await fetch(this.uploadManager.constructor.API_BASE_URL + 'upload.php', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success && mainImageUrl) {
                        mainImageUrl.value = data.data.main_image_url;
                        this.uploadManager.showMessage('Image principale uploadée avec succès!', 'success');
                    } else {
                        this.uploadManager.showMessage('Erreur: ' + (data.error || 'Erreur lors de l\'upload'), 'error');
                    }
                } catch (error) {
                    console.error('Erreur upload modal:', error);
                    this.uploadManager.showMessage('Erreur de connexion au serveur', 'error');
                }
            });
        }
        
        // Miniature
        const thumbnailInput = document.getElementById('modal_thumbnailImageInput');
        const thumbnailPreview = document.getElementById('modal_thumbnail_preview');
        const thumbnailUrl = document.getElementById('modal_thumbnail_url');
        
        if (thumbnailInput && this.uploadManager) {
            thumbnailInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // Afficher l'aperçu
                if (thumbnailPreview) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        thumbnailPreview.innerHTML = `
                            <img src="${e.target.result}" alt="Aperçu" style="max-width: 100%; max-height: 200px; border-radius: 8px;">
                        `;
                    };
                    reader.readAsDataURL(file);
                }
                
                // Upload vers le serveur
                try {
                    const formData = new FormData();
                    formData.append('image', file);
                    
                    const response = await fetch(this.uploadManager.constructor.API_BASE_URL + 'upload.php', {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success && thumbnailUrl) {
                        thumbnailUrl.value = data.data.thumbnail_url || data.data.main_image_url;
                        this.uploadManager.showMessage('Miniature uploadée avec succès!', 'success');
                    } else {
                        this.uploadManager.showMessage('Erreur: ' + (data.error || 'Erreur lors de l\'upload'), 'error');
                    }
                } catch (error) {
                    console.error('Erreur upload modal:', error);
                    this.uploadManager.showMessage('Erreur de connexion au serveur', 'error');
                }
            });
        }
    }

    // Soumettre le formulaire modal
    async submitModalForm() {
        try {
            const modalForm = document.getElementById('addProjectForm');
            if (!modalForm) return;
            
            // Récupérer les technologies depuis le modal
            const technologies = this.getModalTechnologiesFromDOM();
            // Récupérer les fonctionnalités depuis le modal
            const features = this.getModalFeaturesFromDOM();
            
            // Récupérer les données du formulaire modal
            const donneesProjet = {
                title: modalForm.querySelector('#modal_title')?.value.trim() || "",
                short_description: modalForm.querySelector('#modal_short_description')?.value.trim() || "",
                full_description: modalForm.querySelector('#modal_full_description')?.value.trim() || "",
                category: modalForm.querySelector('#modal_category')?.value || "fullstack",
                technologies: technologies,
                features: features,
                thumbnail_url: modalForm.querySelector('#modal_thumbnail_url')?.value.trim() || null,
                main_image_url: modalForm.querySelector('#modal_main_image_url')?.value.trim() || null,
                github_url: modalForm.querySelector('#modal_github_url')?.value.trim() || null,
                demo_url: modalForm.querySelector('#modal_demo_url')?.value.trim() || null,
                client_name: modalForm.querySelector('#modal_client_name')?.value.trim() || null,
                project_date: modalForm.querySelector('#modal_project_date')?.value || new Date().toISOString().split('T')[0],
                display_order: parseInt(modalForm.querySelector('#modal_display_order')?.value || "0"),
                featured: modalForm.querySelector('#modal_featured')?.checked ? 1 : 0,
                status: modalForm.querySelector('#modal_status')?.value || "published"
            };
            
            // Validation
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
            
            // État "chargement" pour le bouton
            const submitBtn = modalForm.querySelector('button[type="submit"]');
            const texteOriginal = submitBtn?.innerHTML || '';
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Création en cours...';
                submitBtn.disabled = true;
            }
            
            // Envoi de la requête à l'API
            const url = this.API_BASE_URL + "projetApi.php?action=create";
            
            const reponse = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(donneesProjet)
            });
            
            const texteReponse = await reponse.text();
            
            let resultat;
            try {
                resultat = JSON.parse(texteReponse);
            } catch (e) {
                console.error("Réponse JSON invalide:", e);
                throw new Error("Le serveur a retourné une réponse invalide");
            }
            
            if (reponse.ok && resultat.success) {
                this.showAlert("✅ Projet créé avec succès ! ID : " + resultat.project_id, "success");
                
                // Fermer le modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addProjectModal'));
                modal.hide();
                
                // Recharger les projets
                await this.chargerProjets();
                
                // Rafraîchir le tableau glacial s'il existe
                if (window.glacialTableManager) {
                    await window.glacialTableManager.refresh();
                }
                
            } else {
                const messageErreur = resultat.error || "Erreur inconnue lors de la création";
                this.showAlert("❌ " + messageErreur, "error");
            }
            
        } catch (erreur) {
            console.error("Erreur création projet modal:", erreur);
            this.showAlert("❌ Erreur : " + erreur.message, "error");
            
        } finally {
            // Restauration du bouton
            const submitBtn = document.querySelector('#addProjectForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Enregistrer le projet';
                submitBtn.disabled = false;
            }
        }
    }

    // Récupérer les technologies depuis le modal
    getModalTechnologiesFromDOM() {
        const technologies = [];
        
        // Récupérer depuis les inputs cachés
        const hiddenInputs = document.querySelectorAll('#modal_technologiesContainer input[name="modal_technologies[]"]');
        hiddenInputs.forEach(input => {
            if (input.value.trim()) {
                technologies.push(input.value.trim());
            }
        });
        return technologies;
    }

    // Récupérer les fonctionnalités depuis le modal
    getModalFeaturesFromDOM() {
        const features = [];
        
        const hiddenInputs = document.querySelectorAll('#modal_featuresContainer input[name="modal_features[]"]');
        hiddenInputs.forEach(input => {
            if (input.value.trim()) {
                features.push(input.value.trim());
            }
        });
        return features;
    }

    // ==============================================
    // GESTION DU MODAL D'ÉDITION
    // ==============================================

    // Charger un projet pour édition
    async editProject(projectId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}projetApi.php?action=admin_get&id=${projectId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors du chargement du projet');
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.openEditModal(data.project);
            } else {
                this.showAlert(data.error || 'Erreur lors du chargement', 'error');
            }
        } catch (error) {
            console.error('Erreur chargement projet:', error);
            this.showAlert('Impossible de charger le projet', 'error');
        }
    }

    // Ouvrir le modal d'édition avec les données du projet
    openEditModal(project) {
        // Remplir les champs du formulaire
        document.getElementById('edit_project_id').value = project.id;
        document.getElementById('edit_title').value = project.title || '';
        document.getElementById('edit_short_description').value = project.short_description || '';
        document.getElementById('edit_full_description').value = project.full_description || '';
        document.getElementById('edit_category').value = project.category || 'fullstack';
        document.getElementById('edit_main_image_url').value = project.main_image_url || '';
        document.getElementById('edit_thumbnail_url').value = project.thumbnail_url || '';
        document.getElementById('edit_github_url').value = project.github_url || '';
        document.getElementById('edit_demo_url').value = project.demo_url || '';
        document.getElementById('edit_client_name').value = project.client_name || '';
        document.getElementById('edit_project_date').value = project.project_date || '';
        document.getElementById('edit_display_order').value = project.display_order || 0;
        document.getElementById('edit_featured').checked = project.featured == 1;
        document.getElementById('edit_status').value = project.status || 'published';
        
        // Mettre à jour les prévisualisations d'images
        this.updateImagePreview('edit_main_image_url', 'edit_main_image_preview');
        this.updateImagePreview('edit_thumbnail_url', 'edit_thumbnail_preview');
        
        // Charger les technologies et fonctionnalités
        this.loadEditTechnologies(project.technologies || []);
        this.loadEditFeatures(project.features || []);
        
        // Configurer les uploads d'images pour l'édition
        this.setupEditImageUploads();
        this.updateEditImagePreview('main');
        this.updateEditImagePreview('thumbnail');

        // Ouvrir le modal Bootstrap
        const editModal = new bootstrap.Modal(document.getElementById('editProjectModal'));
        editModal.show();
        
        // Configurer l'événement de sauvegarde
        this.setupEditSave(project.id);
    }

    // Charger les technologies dans le modal d'édition
    loadEditTechnologies(technologies) {
        const container = document.getElementById('edit_technologies_container');
        container.innerHTML = '';
        
        if (technologies.length === 0) {
            this.addEditTechnologyField();
        } else {
            technologies.forEach(tech => {
                this.addEditTechnologyField(tech);
            });
        }
    }

    // Charger les fonctionnalités dans le modal d'édition
    loadEditFeatures(features) {
        const container = document.getElementById('edit_features_container');
        container.innerHTML = '';
        
        if (features.length === 0) {
            this.addEditFeatureField();
        } else {
            features.forEach(feature => {
                this.addEditFeatureField(feature);
            });
        }
    }

    // Ajouter un champ de technologie dans l'édition
    addEditTechnologyField(value = '') {
        const container = document.getElementById('edit_technologies_container');
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control edit-technology-input" 
                value="${value}" placeholder="Ex: React, Node.js...">
            <button class="btn btn-outline-danger" type="button" 
                    onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    }

    // Ajouter un champ de fonctionnalité dans l'édition
    addEditFeatureField(value = '') {
        const container = document.getElementById('edit_features_container');
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control edit-feature-input" 
                value="${value}" placeholder="Ex: Authentification, Dashboard...">
            <button class="btn btn-outline-danger" type="button" 
                    onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    }

    // Configurer l'événement de sauvegarde pour l'édition
    setupEditSave(projectId) {
        const saveBtn = document.getElementById('saveEditProject');
        
        // Remplacer le bouton pour éviter les écouteurs multiples
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        const newSaveBtn = document.getElementById('saveEditProject');
        
        newSaveBtn.onclick = async () => {
            await this.saveEditProject(projectId);
        };
    }

    // Sauvegarder les modifications d'un projet
    async saveEditProject(projectId) {
        try {
            const projectData = {
                id: projectId, // Important: inclure l'ID pour l'update
                title: document.getElementById('edit_title').value.trim(),
                short_description: document.getElementById('edit_short_description').value.trim(),
                full_description: document.getElementById('edit_full_description').value.trim(),
                category: document.getElementById('edit_category').value,
                technologies: this.getEditTechnologies(),
                features: this.getEditFeatures(),
                thumbnail_url: document.getElementById('edit_thumbnail_url').value.trim() || null,
                main_image_url: document.getElementById('edit_main_image_url').value.trim() || null,
                github_url: document.getElementById('edit_github_url').value.trim() || null,
                demo_url: document.getElementById('edit_demo_url').value.trim() || null,
                client_name: document.getElementById('edit_client_name').value.trim() || null,
                project_date: document.getElementById('edit_project_date').value,
                display_order: parseInt(document.getElementById('edit_display_order').value) || 0,
                featured: document.getElementById('edit_featured').checked ? 1 : 0,
                status: document.getElementById('edit_status').value
            };
            
            // Validation
            const errors = [];
            if (!projectData.title) errors.push('Le titre est obligatoire');
            if (!projectData.short_description) errors.push('La description courte est obligatoire');
            if (!projectData.full_description) errors.push('La description complète est obligatoire');
            
            if (errors.length > 0) {
                this.showAlert(errors.join('\n'), 'error');
                return;
            }
            
            // État "chargement" pour le bouton
            const saveBtn = document.getElementById('saveEditProject');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Enregistrement...';
            saveBtn.disabled = true;
            
            // Envoi de la requête d'update
            const response = await fetch(`${this.API_BASE_URL}projetApi.php?action=update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(projectData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('✅ Projet mis à jour avec succès', 'success');
                
                // Fermer le modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editProjectModal'));
                modal.hide();
                
                // Recharger la liste des projets
                await this.chargerProjets();
            } else {
                this.showAlert('❌ ' + (data.error || 'Erreur lors de la mise à jour'), 'error');
            }
            
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            this.showAlert('❌ Erreur serveur', 'error');
        } finally {
            // Restauration du bouton
            const saveBtn = document.getElementById('saveEditProject');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Enregistrer les modifications';
                saveBtn.disabled = false;
            }
        }
    }

    // Récupérer les technologies du modal d'édition
    getEditTechnologies() {
        const inputs = document.querySelectorAll('#edit_technologies_container .edit-technology-input');
        const technologies = [];
        inputs.forEach(input => {
            if (input.value.trim()) {
                technologies.push(input.value.trim());
            }
        });
        return technologies;
    }

    // Récupérer les fonctionnalités du modal d'édition
    getEditFeatures() {
        const inputs = document.querySelectorAll('#edit_features_container .edit-feature-input');
        const features = [];
        inputs.forEach(input => {
            if (input.value.trim()) {
                features.push(input.value.trim());
            }
        });
        return features;
    }

    // Mettre à jour la prévisualisation d'une image
    updateImagePreview(inputId, previewId) {
        const url = document.getElementById(inputId).value;
        const preview = document.getElementById(previewId);
        
        // Image SVG de remplacement stylée
        const placeholderImage = `data:image/svg+xml,%3Csvg width='200' height='150' viewBox='0 0 200 150' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='200' height='150' rx='10' fill='%231E293B'/%3E%3Cpath d='M70 50H50V70H70V50Z' stroke='%23475569' stroke-width='2'/%3E%3Cpath d='M120 50L100 70L140 60L130 65L125 62.5L120 65Z' stroke='%2337A1FF' stroke-width='2'/%3E%3Ccircle cx='60' cy='60' r='5' fill='%2337A1FF'/%3E%3Cpath d='M80 90L100 110M120 90L140 110' stroke='%23475569' stroke-width='2'/%3E%3Ctext x='100' y='100' text-anchor='middle' fill='%2394A3B8' font-size='12'%3E${encodeURIComponent(url ? 'Image configurée' : 'Aucune image')}%3C/text%3E%3C/svg%3E`;
        
        if (url) {
            preview.innerHTML = `
                <div class="position-relative">
                    <img src="${placeholderImage}" alt="Placeholder" 
                         style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
                    <div class="position-absolute bottom-0 start-0 end-0 bg-black/70 text-white p-2 rounded-b-lg">
                        <small><i class="fas fa-external-link-alt me-1"></i>${url.substring(0, 40)}${url.length > 40 ? '...' : ''}</small>
                    </div>
                </div>
                <div class="form-text mt-2">
                    <button class="btn btn-sm btn-outline-info me-2" onclick="window.open('${url}', '_blank')">
                        <i class="fas fa-external-link-alt me-1"></i>Voir l'image
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="document.getElementById('${inputId}').value=''; adminManager.updateImagePreview('${inputId}', '${previewId}')">
                        <i class="fas fa-trash me-1"></i>Effacer
                    </button>
                </div>
            `;
        } else {
            preview.innerHTML = `
                <img src="${placeholderImage}" alt="Aucune image" 
                     style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
                <div class="form-text text-center mt-2 text-gray-500">
                    <i class="fas fa-info-circle me-1"></i>Ajoutez une URL d'image
                </div>
            `;
        }
    }

    // Configurer les uploads d'images dans le modal d'édition
    setupEditImageUploads() {
        const mainImageInput = document.getElementById('edit_main_image_file');
        if (mainImageInput) {
            mainImageInput.addEventListener('change', (e) => {
                this.handleEditImageUpload(e.target.files[0], 'main');
            });
        }
        
        const thumbnailInput = document.getElementById('edit_thumbnail_file');
        if (thumbnailInput) {
            thumbnailInput.addEventListener('change', (e) => {
                this.handleEditImageUpload(e.target.files[0], 'thumbnail');
            });
        }
    }

    // Gérer l'upload d'image dans l'édition
    async handleEditImageUpload(file, type) {
        if (!file) return;
        
        // Afficher un aperçu immédiat
        this.showEditImagePreview(file, type);
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            // Envoi au serveur
            const response = await fetch(this.API_BASE_URL + 'upload.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remplir automatiquement le champ URL
                if (type === 'main') {
                    document.getElementById('edit_main_image_url').value = data.data.main_image_url;
                    this.updateEditImagePreview('main');
                } else if (type === 'thumbnail') {
                    document.getElementById('edit_thumbnail_url').value = data.data.thumbnail_url || data.data.main_image_url;
                    this.updateEditImagePreview('thumbnail');
                }
                
                this.showAlert('✅ Image uploadée avec succès !', 'success');
            } else {
                this.showAlert('❌ Erreur upload: ' + (data.error || 'Erreur inconnue'), 'error');
                this.updateEditImagePreview(type);
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showAlert('❌ Erreur de connexion au serveur', 'error');
            this.updateEditImagePreview(type);
        }
    }

    // Afficher l'aperçu d'image pendant l'upload
    showEditImagePreview(file, type) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewId = type === 'main' ? 'edit_main_image_preview' : 'edit_thumbnail_preview';
            const preview = document.getElementById(previewId);
            
            preview.innerHTML = `
                <div class="position-relative" style="width: 100%; height: 150px; border-radius: 8px; overflow: hidden;">
                    <img src="${e.target.result}" alt="Aperçu" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                    <div class="position-absolute top-2 right-2 badge bg-info">
                        <i class="fas fa-spinner fa-spin me-1"></i>Upload...
                    </div>
                    <div class="position-absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-center">
                        <small><i class="fas fa-clock me-1"></i>${file.name} (${Math.round(file.size / 1024)} KB)</small>
                    </div>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }

    // Effacer une image dans l'édition
    clearEditImage(type) {
        if (type === 'main') {
            document.getElementById('edit_main_image_url').value = '';
            document.getElementById('edit_main_image_file').value = '';
            this.updateEditImagePreview('main');
        } else if (type === 'thumbnail') {
            document.getElementById('edit_thumbnail_url').value = '';
            document.getElementById('edit_thumbnail_file').value = '';
            this.updateEditImagePreview('thumbnail');
        }
    }

    // Mettre à jour la prévisualisation d'image dans l'édition
    updateEditImagePreview(type) {
        const inputId = type === 'main' ? 'edit_main_image_url' : 'edit_thumbnail_url';
        const previewId = type === 'main' ? 'edit_main_image_preview' : 'edit_thumbnail_preview';
        const fileInputId = type === 'main' ? 'edit_main_image_file' : 'edit_thumbnail_file';
        
        const url = document.getElementById(inputId)?.value || '';
        const preview = document.getElementById(previewId);
        
        if (!preview) {
            console.error(`Preview ${previewId} non trouvé`);
            return;
        }
        
        preview.innerHTML = '';
        
        if (url && url.trim() !== '') {
            const container = document.createElement('div');
            container.className = 'position-relative';
            container.style.cssText = 'width: 100%; height: 150px; border-radius: 8px; overflow: hidden;';
            
            const img = document.createElement('img');
            img.src = url;
            img.alt = type === 'main' ? 'Image principale' : 'Miniature';
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            
            // Gestion d'erreur si l'image n'est pas accessible
            img.onerror = function() {
                this.src = `data:image/svg+xml,%3Csvg width='200' height='150' viewBox='0 0 200 150' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='200' height='150' rx='10' fill='%231a1a1a'/%3E%3Cpath d='M70 50H50V70H70V50Z' stroke='%23475569' stroke-width='2'/%3E%3Cpath d='M120 50L100 70L140 60L130 65L125 62.5L120 65Z' stroke='%2337A1FF' stroke-width='2'/%3E%3Ccircle cx='60' cy='60' r='5' fill='%2337A1FF'/%3E%3Cpath d='M80 90L100 110M120 90L140 110' stroke='%23475569' stroke-width='2'/%3E%3Ctext x='100' y='100' text-anchor='middle' fill='%2394A3B8' font-size='12'%3EImage non disponible%3C/text%3E%3C/svg%3E`;
                this.style.filter = 'grayscale(0.8) opacity(0.7)';
                
                // Ajouter un badge d'avertissement
                const warningBadge = document.createElement('div');
                warningBadge.className = 'position-absolute top-2 right-2 badge bg-warning text-dark';
                warningBadge.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>404';
                warningBadge.style.fontSize = '0.7rem';
                warningBadge.style.zIndex = '10';
                
                container.appendChild(warningBadge);
            };
            
            // Gestion de succès
            img.onload = function() {
                const successBadge = document.createElement('div');
                successBadge.className = 'position-absolute top-2 right-2 badge bg-success';
                successBadge.innerHTML = '<i class="fas fa-check me-1"></i>OK';
                successBadge.style.fontSize = '0.7rem';
                successBadge.style.zIndex = '10';
                
                container.appendChild(successBadge);
            };
            
            container.appendChild(img);
            
            // Overlay avec informations
            const overlay = document.createElement('div');
            overlay.className = 'position-absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2';
            overlay.style.fontSize = '0.75rem';
            
            const fileName = url.split('/').pop();
            overlay.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="text-truncate" style="max-width: 70%;">
                        <i class="fas fa-link me-1"></i>
                        ${fileName || 'Image'}
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-light me-1" onclick="window.open('${url}', '_blank')" title="Voir l'image">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="clearEditImage('${type}')" title="Effacer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(overlay);
            preview.appendChild(container);
            
        } else {
            // Placeholder pour upload d'image
            preview.innerHTML = `
                <div class="text-center py-4 border-2 border-dashed border-gray-700 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
                     onclick="document.getElementById('${fileInputId}').click()"
                     style="height: 150px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <i class="fas fa-cloud-upload-alt fa-3x text-gray-600 mb-3"></i>
                    <p class="text-gray-400 mb-1">Aucune image</p>
                    <small class="text-gray-500">
                        <i class="fas fa-mouse-pointer me-1"></i>Cliquez pour uploader
                    </small>
                </div>
            `;
        }
    }

    // ==============================================
    // GESTION DE LA SUPPRESSION DES PROJETS
    // ==============================================

    // Supprimer un projet (soft delete)
    async deleteProject(projectId) {
        // Demander confirmation
        if (!confirm("⚠️ Voulez-vous vraiment supprimer ce projet ?\n\nCette action le masquera du portfolio mais le conservera en base de données (soft delete).")) {
            return;
        }
        
        try {
            // État "chargement" pour le bouton
            const deleteBtn = event.target.closest('button');
            const originalHtml = deleteBtn?.innerHTML || '';
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                deleteBtn.disabled = true;
            }
            
            // Appel API de suppression
            const response = await fetch(`${this.API_BASE_URL}projetApi.php?action=delete&id=${projectId}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: projectId })
            });
            
            const data = await response.json();
            
            if (deleteBtn) {
                deleteBtn.innerHTML = originalHtml;
                deleteBtn.disabled = false;
            }
            
            if (data.success) {
                this.showAlert('✅ Projet marqué comme supprimé avec succès', 'success');
                
                // Rafraîchir la liste après 1 seconde
                setTimeout(() => {
                    this.chargerProjets();
                }, 1000);
                
            } else {
                this.showAlert('❌ Erreur: ' + (data.error || 'Impossible de supprimer le projet'), 'error');
            }
            
        } catch (error) {
            console.error("Erreur suppression:", error);
            
            // Restaurer le bouton
            const deleteBtn = event.target.closest('button');
            if (deleteBtn) {
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.disabled = false;
            }
            
            this.showAlert('❌ Erreur de connexion au serveur', 'error');
        }
    }

    // Restaurer un projet supprimé
    async restoreProject(projectId) {
        if (!confirm("🔄 Voulez-vous restaurer ce projet ?")) {
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE_URL}projetApi.php?action=restore&id=${projectId}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: projectId, status: 'draft' })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('✅ Projet restauré (mis en brouillon)', 'success');
                setTimeout(() => this.chargerProjets(), 1000);
            } else {
                this.showAlert('❌ ' + (data.error || 'Erreur de restauration'), 'error');
            }
        } catch (error) {
            console.error("Erreur restauration:", error);
            this.showAlert('❌ Erreur serveur', 'error');
        }
    }

    // Supprimer définitivement un projet
    async deletePermanently(projectId) {
        if (!confirm("☠️ ⚠️ ATTENTION : Suppression DÉFINITIVE !\n\nCe projet sera effacé de la base de données et ne pourra PAS être récupéré.\n\nConfirmez-vous cette action ?")) {
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE_URL}projetApi.php?action=delete_permanent&id=${projectId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('✅ Projet supprimé définitivement', 'success');
                setTimeout(() => this.chargerProjets(), 1000);
            } else {
                this.showAlert('❌ ' + (data.error || 'Erreur de suppression'), 'error');
            }
        } catch (error) {
            console.error("Erreur suppression définitive:", error);
            this.showAlert('❌ Erreur serveur', 'error');
        }
    }
}

// ==============================================
// FONCTIONS GLOBALES
// ==============================================

// Fonction pour ajouter une technologie dans le modal
window.addModalTechnology = function() {
    const input = document.getElementById('modal_technology_input');
    const value = input.value.trim();
    
    if (value) {
        const container = document.getElementById('modal_technologiesContainer');
        
        // Créer un nouveau champ input
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control technology-input" value="${value}" readonly>
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <input type="hidden" name="modal_technologies[]" value="${value}">
        `;
        container.appendChild(div);
        
        // Réinitialiser le champ d'entrée et ajouter un nouveau
        input.value = '';
        const newInputDiv = document.createElement('div');
        newInputDiv.className = 'input-group mb-2';
        newInputDiv.innerHTML = `
            <input type="text" class="form-control technology-input" 
                   placeholder="Ex: React, Node.js..." 
                   id="modal_technology_input">
            <button class="btn btn-outline-secondary" type="button" onclick="addModalTechnology()">
                <i class="fas fa-plus"></i>
            </button>
        `;
        container.appendChild(newInputDiv);
        
        // Focus sur le nouveau champ
        setTimeout(() => {
            const newInput = newInputDiv.querySelector('input');
            newInput.focus();
        }, 100);
    }
};

// Fonction pour ajouter une fonctionnalité dans le modal
window.addModalFeature = function() {
    const input = document.getElementById('modal_feature_input');
    const value = input.value.trim();
    
    if (value) {
        const container = document.getElementById('modal_featuresContainer');
        
        // Créer un nouveau champ input
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control feature-input" value="${value}" readonly>
            <button class="btn btn-outline-danger" type="button" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <input type="hidden" name="modal_features[]" value="${value}">
        `;
        container.appendChild(div);
        
        // Réinitialiser le champ d'entrée et ajouter un nouveau
        input.value = '';
        const newInputDiv = document.createElement('div');
        newInputDiv.className = 'input-group mb-2';
        newInputDiv.innerHTML = `
            <input type="text" class="form-control feature-input" 
                   placeholder="Ex: Authentification, Dashboard..." 
                   id="modal_feature_input">
            <button class="btn btn-outline-secondary" type="button" onclick="addModalFeature()">
                <i class="fas fa-plus"></i>
            </button>
        `;
        container.appendChild(newInputDiv);
        
        // Focus sur le nouveau champ
        setTimeout(() => {
            const newInput = newInputDiv.querySelector('input');
            newInput.focus();
        }, 100);
    }
};

// Gérer la touche Entrée dans les inputs
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('keypress', function(e) {
        if (e.target.id === 'modal_technology_input' && e.key === 'Enter') {
            e.preventDefault();
            addModalTechnology();
        }
        if (e.target.id === 'modal_feature_input' && e.key === 'Enter') {
            e.preventDefault();
            addModalFeature();
        }
    });
});

// Fonctions globales pour le modal d'édition
window.addEditTechnology = function() {
    if (window.adminManager && window.adminManager.addEditTechnologyField) {
        window.adminManager.addEditTechnologyField();
    }
};

window.addEditFeature = function() {
    if (window.adminManager && window.adminManager.addEditFeatureField) {
        window.adminManager.addEditFeatureField();
    }
};

window.clearEditImage = function(type) {
    if (window.adminManager && window.adminManager.clearEditImage) {
        window.adminManager.clearEditImage(type);
    }
};

window.clearAllTechnologies = function() {
    const container = document.getElementById('edit_technologies_container');
    if (container) {
        if (confirm('Voulez-vous vraiment effacer toutes les technologies ?')) {
            container.innerHTML = '';
            window.adminManager?.addEditTechnologyField();
        }
    }
};

window.clearAllFeatures = function() {
    const container = document.getElementById('edit_features_container');
    if (container) {
        if (confirm('Voulez-vous vraiment effacer toutes les fonctionnalités ?')) {
            container.innerHTML = '';
            window.adminManager?.addEditFeatureField();
        }
    }
};

// ==============================================
// INITIALISATION PRINCIPALE
// ==============================================

document.addEventListener("DOMContentLoaded", function() {
    try {
        // Initialisation du gestionnaire d'administration
        window.adminManager = new AdminManager();
        
    } catch (erreur) {
        console.error("Erreur initialisation AdminManager :", erreur);
        
        // Affichage d'un message d'erreur en cas d'échec
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