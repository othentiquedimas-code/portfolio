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
            const url = this.API_BASE_URL + "projetApi.php?action=admin_list";
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
            
            // Déterminer la couleur du badge de statut
            let statusClass = 'bg-secondary';
            let statusText = 'Inconnu';
            
            switch(projet.status) {
                case 'published':
                    statusClass = 'bg-success';
                    statusText = 'Publié';
                    break;
                case 'draft':
                    statusClass = 'bg-warning text-dark';
                    statusText = 'Brouillon';
                    break;
                case 'archived':
                    statusClass = 'bg-dark';
                    statusText = 'Archivé';
                    break;
                case 'deleted':
                    statusClass = 'bg-danger';
                    statusText = 'Supprimé';
                    break;
            }
            
            // Si le projet est supprimé, l'afficher en grisé
            const rowClass = projet.status === 'deleted' ? 'text-muted bg-light' : '';
            
            html += `
                <tr class="${rowClass}">
                    <td>
                        ${projet.title}
                        ${projet.status === 'deleted' ? '<i class="fas fa-trash ms-2 text-danger"></i>' : ''}
                    </td>
                    <td><span class="badge bg-primary">${projet.category}</span></td>
                    <td>
                        <span class="badge ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td>${date}</td>
                    <td>
                        ${projet.status !== 'deleted' ? `
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="window.adminManager && window.adminManager.editProject(${projet.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        ` : ''}
                        
                        ${projet.status === 'deleted' ? `
                        <button class="btn btn-sm btn-outline-secondary" 
                                onclick="window.adminManager && window.adminManager.restoreProject(${projet.id})"
                                title="Restaurer">
                            <i class="fas fa-undo"></i>
                        </button>
                        
                        <button class="btn btn-sm btn-outline-danger ms-2" 
                                onclick="window.adminManager && window.adminManager.deletePermanently(${projet.id})"
                                title="Supprimer définitivement">
                            <i class="fas fa-skull-crossbones"></i>
                        </button>
                        ` : `
                        <button class="btn btn-sm btn-outline-danger ms-2" 
                                onclick="window.adminManager && window.adminManager.deleteProject(${projet.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                        `}
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

          // Prévisualisation images édition
        document.getElementById('edit_main_image_url')?.addEventListener('input', (e) => {
            this.updateImagePreview('edit_main_image_url', 'edit_main_image_preview');
        });
        
        document.getElementById('edit_thumbnail_url')?.addEventListener('input', (e) => {
            this.updateImagePreview('edit_thumbnail_url', 'edit_thumbnail_preview');
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

    async editProject(projectId) {
        console.log("✏️ Modification du projet ID:", projectId);
        
        try {
            // Récupérer les détails du projet
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
            console.error('Erreur:', error);
            this.showAlert('Impossible de charger le projet', 'error');
        }
    }

    openEditModal(project) {
        console.log("📋 Ouverture modal édition:", project);
        console.log("this est défini ?", this !== undefined);
        
        // Vérifiez que Bootstrap est chargé
        console.log("Bootstrap existe ?", typeof bootstrap !== 'undefined');
        console.log("Modal élément:", document.getElementById('editProjectModal'));
        
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
        
        // Afficher les prévisualisations d'images
        this.updateImagePreview('edit_main_image_url', 'edit_main_image_preview');
        this.updateImagePreview('edit_thumbnail_url', 'edit_thumbnail_preview');
        
        // Charger les technologies
        this.loadEditTechnologies(project.technologies || []);
        
        // Charger les fonctionnalités
        this.loadEditFeatures(project.features || []);
        
         // AJOUTEZ CETTE LIGNE IMPORTANTE :
        this.setupEditImageUploads();
        
        // ... mettez à jour les prévisualisations
        this.updateEditImagePreview('main');
        this.updateEditImagePreview('thumbnail');

        // Ouvrir le modal
        const editModal = new bootstrap.Modal(document.getElementById('editProjectModal'));
        editModal.show();

       
        
        // Configurer l'événement de sauvegarde
        this.setupEditSave(project.id);
    }

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

    setupEditSave(projectId) {
        const saveBtn = document.getElementById('saveEditProject');
        
        // Retirer les anciens écouteurs
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        const newSaveBtn = document.getElementById('saveEditProject');
        
        newSaveBtn.onclick = async () => {
            await this.saveEditProject(projectId);
        };
    }

    async saveEditProject(projectId) {
        try {
            const projectData = {
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
            
            // Bouton loading
            const saveBtn = document.getElementById('saveEditProject');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Enregistrement...';
            saveBtn.disabled = true;
            
            // Envoyer la requête
            const response = await fetch(`${this.API_BASE_URL}projetApi.php?action=update&id=${projectId}`, {
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
                
                // Recharger la liste
                await this.chargerProjets();
            } else {
                this.showAlert('❌ ' + (data.error || 'Erreur lors de la mise à jour'), 'error');
            }
            
        } catch (error) {
            console.error('Erreur:', error);
            this.showAlert('❌ Erreur serveur', 'error');
        } finally {
            // Restaurer le bouton
            const saveBtn = document.getElementById('saveEditProject');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Enregistrer les modifications';
                saveBtn.disabled = false;
            }
        }
    }

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

  updateImagePreview(inputId, previewId) {
    const url = document.getElementById(inputId).value;
    const preview = document.getElementById(previewId);
    
    // Image de remplacement (SVG stylé)
    const placeholderImage = `data:image/svg+xml,%3Csvg width='200' height='150' viewBox='0 0 200 150' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='200' height='150' rx='10' fill='%231E293B'/%3E%3Cpath d='M70 50H50V70H70V50Z' stroke='%23475569' stroke-width='2'/%3E%3Cpath d='M120 50L100 70L140 60L130 65L125 62.5L120 65Z' stroke='%2337A1FF' stroke-width='2'/%3E%3Ccircle cx='60' cy='60' r='5' fill='%2337A1FF'/%3E%3Cpath d='M80 90L100 110M120 90L140 110' stroke='%23475569' stroke-width='2'/%3E%3Ctext x='100' y='100' text-anchor='middle' fill='%2394A3B8' font-size='12'%3E${encodeURIComponent(url ? 'Image configurée' : 'Aucune image')}%3C/text%3E%3C/svg%3E`;
    
    if (url) {
        // Afficher TOUJOURS le placeholder, jamais l'URL réelle
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
// Méthode pour vérifier si une image existe
    async checkImageExists(url) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors' // Important pour éviter les problèmes CORS
            });
            return true;
        } catch (error) {
            console.log("Image non disponible:", url);
            return false;
        }
    }

// Dans votre classe AdminManager, AJOUTEZ CES MÉTHODES :

setupEditImageUploads() {
    console.log("⚙️ Configuration des uploads d'images...");
    
    // Configurer l'upload pour l'image principale
    const mainImageInput = document.getElementById('edit_main_image_file');
    if (mainImageInput) {
        mainImageInput.addEventListener('change', (e) => {
            this.handleEditImageUpload(e.target.files[0], 'main');
        });
    }
    
    // Configurer l'upload pour la miniature
    const thumbnailInput = document.getElementById('edit_thumbnail_file');
    if (thumbnailInput) {
        thumbnailInput.addEventListener('change', (e) => {
            this.handleEditImageUpload(e.target.files[0], 'thumbnail');
        });
    }
}

async handleEditImageUpload(file, type) {
    if (!file) return;
    
    console.log(`📤 Upload ${type}:`, file.name);
    
    // Afficher une prévisualisation immédiate
    this.showEditImagePreview(file, type);
    
    try {
        const formData = new FormData();
        formData.append('image', file);
        
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
            this.updateEditImagePreview(type); // Réafficher le placeholder
        }
    } catch (error) {
        console.error('Upload error:', error);
        this.showAlert('❌ Erreur de connexion au serveur', 'error');
        this.updateEditImagePreview(type); // Réafficher le placeholder
    }
}

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

clearEditImage(type) {
    console.log(`🗑️ Effacer image ${type}`);
    
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

// ET REMPLACEZ updateEditImagePreview par cette version corrigée :
updateEditImagePreview(type) {
    const inputId = type === 'main' ? 'edit_main_image_url' : 'edit_thumbnail_url';
    const previewId = type === 'main' ? 'edit_main_image_preview' : 'edit_thumbnail_preview';
    const fileInputId = type === 'main' ? 'edit_main_image_file' : 'edit_thumbnail_file';
    
    const url = document.getElementById(inputId)?.value || '';
    const preview = document.getElementById(previewId);
    
        if (!preview) {
            console.error(`❌ Preview ${previewId} non trouvé`);
            return;
        }
    
    // Vider complètement le preview
    preview.innerHTML = '';
    
    if (url && url.trim() !== '') {
        // Créer un conteneur
        const container = document.createElement('div');
        container.className = 'position-relative';
        container.style.cssText = 'width: 100%; height: 150px; border-radius: 8px; overflow: hidden;';
        
        // Créer l'image
        const img = document.createElement('img');
        img.src = url;
        img.alt = type === 'main' ? 'Image principale' : 'Miniature';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        
        // Gestion d'erreur discrète

        img.onerror = function() {
                    // SVG de remplacement
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
                    // Ajouter un badge de succès
                    const successBadge = document.createElement('div');
                    successBadge.className = 'position-absolute top-2 right-2 badge bg-success';
                    successBadge.innerHTML = '<i class="fas fa-check me-1"></i>OK';
                    successBadge.style.fontSize = '0.7rem';
                    successBadge.style.zIndex = '10';
                    
                    container.appendChild(successBadge);
                };
                
        container.appendChild(img);
        
        // Ajouter un overlay avec l'info URL
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
        // Afficher un placeholder invitant à uploader
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

async deleteProject(projectId) {
    console.log("🗑️ Tentative de suppression du projet ID:", projectId);
    
    // Demander confirmation
    if (!confirm("⚠️ Voulez-vous vraiment supprimer ce projet ?\n\nCette action le masquera du portfolio mais le conservera en base de données (soft delete).")) {
        console.log("❌ Suppression annulée par l'utilisateur");
        return;
    }
    
    try {
        // Bouton de suppression - afficher état "en cours"
        const deleteBtn = event.target.closest('button');
        const originalHtml = deleteBtn?.innerHTML || '';
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            deleteBtn.disabled = true;
        }
        
        // Appeler l'API de suppression
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
            console.log("✅ Projet supprimé avec succès");
            this.showAlert('✅ Projet marqué comme supprimé avec succès', 'success');
            
            // Rafraîchir la liste des projets après 1 seconde
            setTimeout(() => {
                this.chargerProjets();
            }, 1000);
            
        } else {
            console.error("❌ Erreur lors de la suppression:", data.error);
            this.showAlert('❌ Erreur: ' + (data.error || 'Impossible de supprimer le projet'), 'error');
        }
        
    } catch (error) {
        console.error("💥 Erreur réseau:", error);
        
        // Restaurer le bouton
        const deleteBtn = event.target.closest('button');
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.disabled = false;
        }
        
        this.showAlert('❌ Erreur de connexion au serveur', 'error');
    }
}

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
        console.error("Erreur:", error);
        this.showAlert('❌ Erreur serveur', 'error');
    }
}

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
        console.error("Erreur:", error);
        this.showAlert('❌ Erreur serveur', 'error');
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

// Fonctions globales pour les boutons
window.addEditTechnology = function() {
    if (window.adminManager) {
        window.adminManager.addEditTechnologyField();
    }
};

window.addEditFeature = function() {
    if (window.adminManager) {
        window.adminManager.addEditFeatureField();
    }
};


// Fonctions globales pour le modal d'édition
window.clearEditImage = function(type) {
    if (window.adminManager && window.adminManager.clearEditImage) {
        window.adminManager.clearEditImage(type);
    }
};

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

// Gestion du read-only des URLs
document.addEventListener('DOMContentLoaded', function() {
    const urlInputs = ['edit_main_image_url', 'edit_thumbnail_url'];
    
    urlInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            // Réactiver le read-only si on sort du champ
            input.addEventListener('blur', function() {
                if (!this.value.trim()) {
                    this.setAttribute('readonly', true);
                }
            });
        }
    });
});

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