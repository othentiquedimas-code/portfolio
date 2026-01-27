/**
 * EXPERIENCE MANAGER - Version corrigée avec authentification
 */

class ExperienceManager {
    constructor() {
        this.API_BASE_URL = window.location.origin + '/portfoliodim/back/api/';
        this.experiences = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.sortField = 'start_date';
        this.sortOrder = 'desc';
        this.searchTerm = '';
        this.filter = 'all';
        
        this.init();
    }
    
    async init() {
        // Vérifier l'authentification
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            window.location.href = "login.html";
            return;
        }
        
        // Charger les expériences
        await this.loadExperiences();
        
        // Configurer les événements
        this.setupEventListeners();
        
        // Exposer l'instance globalement
        window.experienceManager = this;
    }
    
    async checkAuth() {
        try {
            const response = await fetch(`${this.API_BASE_URL}auth.php?action=check`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                return false;
            }
            
            const data = await response.json();
            return data.authenticated === true;
        } catch (error) {
            console.error('Erreur vérification auth:', error);
            return false;
        }
    }
    
    async loadExperiences(page = 1) {
        try {
            this.showLoading(true);
            
            const params = new URLSearchParams({
                action: 'list',
                page: page,
                limit: this.itemsPerPage,
                sort: this.sortField,
                order: this.sortOrder,
                search: this.searchTerm,
                filter: this.filter
            });
            
            const response = await fetch(`${this.API_BASE_URL}experienceApi.php?${params}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.experiences = data.experiences || [];
                this.currentPage = page;
                this.totalPages = data.pagination?.total_pages || 1;
                this.displayExperiences();
                this.updatePagination();
                this.updateCount();
            } else {
                throw new Error(data.error || 'Erreur lors du chargement');
            }
        } catch (error) {
            console.error('Erreur chargement expériences:', error);
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    displayExperiences() {
        const tbody = document.getElementById('experiencesList');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.experiences.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Aucune expérience</h5>
                        <p class="text-muted">Cliquez sur "Nouvelle expérience" pour en ajouter une.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        this.experiences.forEach(exp => {
            const row = this.createExperienceRow(exp);
            tbody.appendChild(row);
        });
    }
    
    createExperienceRow(exp) {
        const tr = document.createElement('tr');
        tr.className = 'experience-row';
        tr.dataset.id = exp.id;
        
        // Formater les dates
        const startDate = new Date(exp.start_date).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short'
        });
        
        let endDate = 'Présent';
        if (exp.end_date) {
            endDate = new Date(exp.end_date).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'short'
            });
        }
        
        // Formater la description (version courte)
        const shortDescription = exp.description.length > 100 
            ? exp.description.substring(0, 100) + '...' 
            : exp.description;
        
        // Badge de statut
        const statusBadge = exp.current_job == 1
            ? '<span class="badge bg-success"><i class="fas fa-play-circle me-1"></i>En cours</span>'
            : '<span class="badge bg-secondary">Terminé</span>';
        
        // Badge mis en avant
        const featuredBadge = exp.featured == 1
            ? '<span class="badge bg-warning text-dark ms-1"><i class="fas fa-star"></i></span>'
            : '';
        
        // Badge visibilité
        const visibilityIcon = exp.display_in_portfolio == 1 
            ? '<i class="fas fa-eye text-success me-1"></i>' 
            : '<i class="fas fa-eye-slash text-danger me-1"></i>';
        
        tr.innerHTML = `
          
            <td>
                <div class="d-flex align-items-start">
                    <div class="experience-avatar me-3">
                        <div class="avatar-placeholder bg-ice text-primary rounded-circle d-flex align-items-center justify-content-center"
                             style="width: 40px; height: 40px;">
                            <i class="fas fa-briefcase"></i>
                        </div>
                    </div>
                    <div>
                        <h6 class="mb-1">${this.escapeHtml(exp.job_title)}</h6>
                        <p class="text-primary mb-0">
                            <i class="fas fa-building me-1"></i>${this.escapeHtml(exp.company)}
                        </p>
                       
                    </div>
                </div>
            </td>
            <td>
                <div class="timeline-dates">
                    <div class="text-primary">${startDate}</div>
                    <div class="text-primary">→</div>
                    <div class="${exp.current_job == 1 ? 'text-success' : 'text-primary'}">${endDate}</div>
                </div>
            </td>
            <td>
                <p class="mb-1 text-truncate" style="max-width: 300px;" 
                   title="${this.escapeHtml(exp.description)}">
                    ${this.escapeHtml(shortDescription)}
                </p>
            
            </td>
            <td>
                ${statusBadge}
                ${featuredBadge}
           
            </td>
            <td class="text-end">
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary" 
                            onclick="experienceManager.editExperience(${exp.id})"
                            title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" 
                            onclick="experienceManager.confirmDelete(${exp.id})"
                            title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-secondary dropdown-toggle"
                                data-bs-toggle="dropdown" title="Actions">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end glacial-dropdown">
                            <li>
                                <a class="dropdown-item" href="#" 
                                   onclick="experienceManager.toggleFeatured(${exp.id})">
                                    <i class="fas fa-star me-2"></i>
                                    ${exp.featured == 1 ? 'Retirer mise en avant' : 'Mettre en avant'}
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="#" 
                                   onclick="experienceManager.toggleVisibility(${exp.id})">
                                    <i class="fas fa-eye${exp.display_in_portfolio == 1 ? '' : '-slash'} me-2"></i>
                                    ${exp.display_in_portfolio == 1 ? 'Masquer' : 'Afficher'}
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item" href="#" 
                                   onclick="experienceManager.duplicateExperience(${exp.id})">
                                    <i class="fas fa-copy me-2"></i>Dupliquer
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </td>
        `;
        
        return tr;
    }
    
    updatePagination() {
        const pagination = document.getElementById('experiencePagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        // Bouton précédent
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <a class="page-link glacial-page-link" href="#" 
               onclick="experienceManager.loadExperiences(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        `;
        pagination.appendChild(prevLi);
        
        // Pages
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
            li.innerHTML = `
                <a class="page-link glacial-page-link" href="#" 
                   onclick="experienceManager.loadExperiences(${i})">
                    ${i}
                </a>
            `;
            pagination.appendChild(li);
        }
        
        // Bouton suivant
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <a class="page-link glacial-page-link" href="#" 
               onclick="experienceManager.loadExperiences(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        pagination.appendChild(nextLi);
    }
    
    updateCount() {
        const countElement = document.getElementById('experienceCount');
        if (countElement) {
            countElement.textContent = this.experiences.length;
        }
    }
    
    showLoading(show) {
        const loadingRow = document.getElementById('loadingExperiences');
        if (loadingRow) {
            loadingRow.style.display = show ? '' : 'none';
        }
        
        const tbody = document.getElementById('experiencesList');
        if (show && tbody) {
            tbody.innerHTML = `
                <tr id="loadingExperiences">
                    <td colspan="6" class="text-center py-5">
                        <div class="spinner-border text-ice" role="status">
                            <span class="visually-hidden">Chargement...</span>
                        </div>
                        <p class="mt-3 text-muted">Chargement des expériences...</p>
                    </td>
                </tr>
            `;
        }
    }
    
    setupEventListeners() {
        // Recherche
        const searchInput = document.getElementById('experienceSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchTerm = e.target.value;
                    this.loadExperiences(1);
                }, 500);
            });
        }
        
        // Filtre
        const filterSelect = document.getElementById('experienceFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filter = e.target.value;
                this.loadExperiences(1);
            });
        }
        
        // Sélection multiple
        const selectAll = document.getElementById('selectAllExperiences');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                document.querySelectorAll('.experience-checkbox').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            });
        }
        
        // Confirmation de suppression
        const confirmDeleteBtn = document.getElementById('confirmDeleteExperience');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                const experienceId = confirmDeleteBtn.dataset.experienceId;
                if (experienceId) {
                    this.deleteExperience(experienceId);
                }
            });
        }
    }
    
    openAddModal() {
        this.resetForm();
        document.getElementById('experienceModalTitle').innerHTML = 
            '<i class="fas fa-plus-circle me-2"></i>Nouvelle expérience';
        
        // Date par défaut
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('start_date').value = today;
        
        const modal = new bootstrap.Modal(document.getElementById('experienceModal'));
        modal.show();
    }
    
    async editExperience(id) {
        try {
            const response = await fetch(`${this.API_BASE_URL}experienceApi.php?action=get&id=${id}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.fillForm(data.experience);
                
                document.getElementById('experienceModalTitle').innerHTML = 
                    '<i class="fas fa-edit me-2"></i>Modifier l\'expérience';
                
                const modal = new bootstrap.Modal(document.getElementById('experienceModal'));
                modal.show();
            } else {
                this.showError(data.error || 'Erreur lors du chargement');
            }
        } catch (error) {
            console.error('Erreur chargement expérience:', error);
            this.showError('Erreur de connexion');
        }
    }
    
    fillForm(experience) {
        document.getElementById('experience_id').value = experience.id;
        document.getElementById('job_title').value = experience.job_title;
        document.getElementById('company').value = experience.company;
        document.getElementById('start_date').value = experience.start_date;
        document.getElementById('end_date').value = experience.end_date || '';
        document.getElementById('current_job').checked = experience.current_job == 1;
        document.getElementById('location').value = experience.location || '';
        document.getElementById('description').value = experience.description;
        document.getElementById('achievements').value = experience.achievements || '';
        document.getElementById('featured').checked = experience.featured == 1;
        document.getElementById('display_in_portfolio').checked = experience.display_in_portfolio == 1;
        document.getElementById('display_order').value = experience.display_order || 0;
        
        // Charger les responsabilités
        const responsibilitiesContainer = document.getElementById('responsibilitiesContainer');
        responsibilitiesContainer.innerHTML = '';
        
        if (experience.responsibilities && experience.responsibilities.length > 0) {
            experience.responsibilities.forEach(resp => {
                this.addResponsibilityField(resp);
            });
        }
        this.addResponsibilityField();
        
        // Charger les technologies
        const technologiesContainer = document.getElementById('technologiesContainer');
        technologiesContainer.innerHTML = '';
        
        if (experience.technologies && experience.technologies.length > 0) {
            experience.technologies.forEach(tech => {
                this.addTechnologyField(tech);
            });
        }
        this.addTechnologyField();
    }
    
    resetForm() {
        document.getElementById('experienceForm').reset();
        document.getElementById('experience_id').value = '';
        
        // Réinitialiser les listes
        document.getElementById('responsibilitiesContainer').innerHTML = this.createResponsibilityInput();
        document.getElementById('technologiesContainer').innerHTML = this.createTechnologyInput();
        
        // Date par défaut
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('start_date').value = today;
    }
    
    createResponsibilityInput(value = '') {
        return `
            <div class="glacial-input-group mb-2">
                <input type="text" class="form-control glacial-input responsibility-input"
                       value="${value}" placeholder="Ex: Développement d'API REST...">
                <button type="button" class="btn btn-outline-secondary" onclick="addResponsibility()">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    }
    
    createTechnologyInput(value = '') {
        return `
            <div class="glacial-input-group mb-2">
                <input type="text" class="form-control glacial-input technology-input"
                       value="${value}" placeholder="Ex: React, Node.js...">
                <button type="button" class="btn btn-outline-secondary" onclick="addTechnology()">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    }
    
    addResponsibilityField(value = '') {
        const container = document.getElementById('responsibilitiesContainer');
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control glacial-input" 
                   value="${value}" placeholder="Ex: Développement d'API REST...">
            <button class="btn btn-outline-danger" type="button" 
                    onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    }
    
    addTechnologyField(value = '') {
        const container = document.getElementById('technologiesContainer');
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control glacial-input" 
                   value="${value}" placeholder="Ex: React, Node.js...">
            <button class="btn btn-outline-danger" type="button" 
                    onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    }
    
    async saveExperience() {
        try {
            // Validation
            const errors = this.validateForm();
            if (errors.length > 0) {
                this.showError(errors.join('<br>'));
                return;
            }
            
            // Préparation des données
            const formData = this.getFormData();
            
            // Déterminer l'action (création ou mise à jour)
            const experienceId = document.getElementById('experience_id').value;
            const action = experienceId ? 'update' : 'create';
            const url = `${this.API_BASE_URL}experienceApi.php?action=${action}` + 
                       (experienceId ? `&id=${experienceId}` : '');
            
            // État de chargement
            const saveBtn = document.querySelector('#experienceModal .btn-ice');
            const originalHtml = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Enregistrement...';
            saveBtn.disabled = true;
            
            // Envoi à l'API
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(experienceId ? '✅ Expérience mise à jour' : '✅ Expérience créée');
                
                // Fermer le modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('experienceModal'));
                modal.hide();
                
                // Recharger la liste
                await this.loadExperiences(this.currentPage);
            } else {
                this.showError(data.error || 'Erreur lors de l\'enregistrement');
            }
            
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            this.showError('Erreur de connexion au serveur');
        } finally {
            // Restaurer le bouton
            const saveBtn = document.querySelector('#experienceModal .btn-ice');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Enregistrer';
                saveBtn.disabled = false;
            }
        }
    }
    
    validateForm() {
        const errors = [];
        
        const jobTitle = document.getElementById('job_title').value.trim();
        const company = document.getElementById('company').value.trim();
        const startDate = document.getElementById('start_date').value;
        const description = document.getElementById('description').value.trim();
        
        if (!jobTitle) errors.push('Le poste est obligatoire');
        if (!company) errors.push('L\'entreprise est obligatoire');
        if (!startDate) errors.push('La date de début est obligatoire');
        if (!description) errors.push('La description est obligatoire');
        
        // Vérification des dates
        if (startDate) {
            const endDate = document.getElementById('end_date').value;
            const isCurrent = document.getElementById('current_job').checked;
            
            if (!isCurrent && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                
                if (end < start) {
                    errors.push('La date de fin doit être postérieure à la date de début');
                }
            }
        }
        
        return errors;
    }
    
    getFormData() {
        const formData = {
            job_title: document.getElementById('job_title').value.trim(),
            company: document.getElementById('company').value.trim(),
            start_date: document.getElementById('start_date').value,
            end_date: document.getElementById('end_date').value || null,
            current_job: document.getElementById('current_job').checked ? 1 : 0,
            location: document.getElementById('location').value.trim() || null,
            description: document.getElementById('description').value.trim(),
            achievements: document.getElementById('achievements').value.trim() || null,
            featured: document.getElementById('featured').checked ? 1 : 0,
            display_in_portfolio: document.getElementById('display_in_portfolio').checked ? 1 : 0,
            display_order: parseInt(document.getElementById('display_order').value) || 0,
            responsibilities: this.getResponsibilities(),
            technologies: this.getTechnologies()
        };
        
        const experienceId = document.getElementById('experience_id').value;
        if (experienceId) {
            formData.id = experienceId;
        }
        
        return formData;
    }
    
    getResponsibilities() {
        const inputs = document.querySelectorAll('#responsibilitiesContainer .form-control');
        const responsibilities = [];
        
        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                responsibilities.push(value);
            }
        });
        
        return responsibilities;
    }
    
    getTechnologies() {
        const inputs = document.querySelectorAll('#technologiesContainer .form-control');
        const technologies = [];
        
        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                technologies.push(value);
            }
        });
        
        return technologies;
    }
    
    confirmDelete(id) {
        const confirmBtn = document.getElementById('confirmDeleteExperience');
        confirmBtn.dataset.experienceId = id;
        
        const modal = new bootstrap.Modal(document.getElementById('deleteExperienceModal'));
        modal.show();
    }
    
    async deleteExperience(id) {
        try {
            const response = await fetch(`${this.API_BASE_URL}experienceApi.php?action=delete&id=${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('✅ Expérience supprimée');
                
                // Fermer le modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteExperienceModal'));
                modal.hide();
                
                // Recharger la liste
                await this.loadExperiences(this.currentPage);
            } else {
                this.showError(data.error || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('Erreur suppression:', error);
            this.showError('Erreur de connexion');
        }
    }
    
    async toggleFeatured(id) {
        try {
            const response = await fetch(`${this.API_BASE_URL}experienceApi.php?action=toggle_featured`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id: id })
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('⭐ Statut de mise en avant modifié');
                await this.loadExperiences(this.currentPage);
            }
        } catch (error) {
            console.error('Erreur toggle featured:', error);
            this.showError('Erreur lors de la modification');
        }
    }
    
    async toggleVisibility(id) {
        try {
            const response = await fetch(`${this.API_BASE_URL}experienceApi.php?action=toggle_visibility`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ id: id })
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('👁️ Visibilité modifiée');
                await this.loadExperiences(this.currentPage);
            }
        } catch (error) {
            console.error('Erreur toggle visibility:', error);
            this.showError('Erreur lors de la modification');
        }
    }
    
    async duplicateExperience(id) {
        try {
            const response = await fetch(`${this.API_BASE_URL}experienceApi.php?action=duplicate&id=${id}`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('📋 Expérience dupliquée');
                await this.loadExperiences(this.currentPage);
            }
        } catch (error) {
            console.error('Erreur duplication:', error);
            this.showError('Erreur lors de la duplication');
        }
    }
    
    async refresh() {
        await this.loadExperiences(this.currentPage);
        this.showSuccess('🔄 Liste actualisée');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
        `;
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} fa-lg me-3"></i>
                <div>${message}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Fonctions globales pour les listes dynamiques
window.addResponsibility = function() {
    const container = document.getElementById('responsibilitiesContainer');
    const inputs = container.querySelectorAll('.form-control');
    const lastInput = inputs[inputs.length - 1];
    
    if (lastInput && lastInput.value.trim()) {
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control glacial-input" 
                   placeholder="Ex: Développement d'API REST...">
            <button class="btn btn-outline-danger" type="button" 
                    onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
        
        // Focus sur le nouveau champ
        setTimeout(() => {
            div.querySelector('input').focus();
        }, 100);
    }
};

window.addTechnology = function() {
    const container = document.getElementById('technologiesContainer');
    const inputs = container.querySelectorAll('.form-control');
    const lastInput = inputs[inputs.length - 1];
    
    if (lastInput && lastInput.value.trim()) {
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control glacial-input" 
                   placeholder="Ex: React, Node.js...">
            <button class="btn btn-outline-danger" type="button" 
                    onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
        
        // Focus sur le nouveau champ
        setTimeout(() => {
            div.querySelector('input').focus();
        }, 100);
    }
};

// Gestion de la touche Entrée
document.addEventListener('keypress', function(e) {
    if (e.target.classList.contains('responsibility-input') && e.key === 'Enter') {
        e.preventDefault();
        addResponsibility();
    }
    
    if (e.target.classList.contains('technology-input') && e.key === 'Enter') {
        e.preventDefault();
        addTechnology();
    }
});

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le gestionnaire d'expériences
    new ExperienceManager();
});