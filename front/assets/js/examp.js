class AdminManager {
    static API_BASE_URL = window.location.origin + '/portfoliodim/back/api/';

    constructor() {
        this.init();
    }

    async init() {
        // Vérifier si l'utilisateur est connecté
        const isAuthenticated = await this.checkAuth();
        
        if (!isAuthenticated) {
            window.location.href = '/portfoliodim/login.html';
            return;
        }

        this.bindEvents();
        this.loadProjects();
    }

    async checkAuth() {
        try {
            const response = await fetch(this.API_BASE_URL + 'auth.php?action=check', {
                credentials: 'include'
            });
            const data = await response.json();
            return data.authenticated;
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    bindEvents() {
        // Formulaire d'ajout de projet
        document.getElementById('projectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createProject();
        });

        // Bouton de déconnexion
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Gestion des technologies
        document.addEventListener('keypress', (e) => {
            if (e.target.classList.contains('technology-input') && e.key === 'Enter') {
                e.preventDefault();
                this.addTechnology();
            }
            if (e.target.classList.contains('feature-input') && e.key === 'Enter') {
                e.preventDefault();
                this.addFeature();
            }
        });
    }

    async createProject() {
        const formData = {
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            short_description: document.getElementById('short_description').value,
            full_description: document.getElementById('full_description').value,
            thumbnail_url: document.getElementById('thumbnail_url').value || null,
            main_image_url: document.getElementById('main_image_url').value || null,
            github_url: document.getElementById('github_url').value || null,
            demo_url: document.getElementById('demo_url').value || null,
            technologies: this.getTechnologies(),
            features: this.getFeatures(),
            status: 'published',
            featured: 0,
            display_order: 0
        };

        try {
            const response = await fetch(this.API_BASE_URL + 'projects.php?action=create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                toastr.success('Projet créé avec succès!');
                this.resetForm();
                this.loadProjects(); // Recharger la liste
            } else {
                toastr.error(data.error || 'Erreur lors de la création');
            }
        } catch (error) {
            toastr.error('Erreur de connexion au serveur');
            console.error('Create project error:', error);
        }
    }

    async loadProjects() {
        try {
            const response = await fetch(this.API_BASE_URL + 'projects.php?action=list', {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayProjects(data.projects);
            }
        } catch (error) {
            console.error('Load projects error:', error);
        }
    }

    displayProjects(projects) {
        const tbody = document.getElementById('projectsTableBody');
        tbody.innerHTML = '';

        projects.forEach(project => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${project.title}</td>
                <td><span class="badge bg-primary">${project.category}</span></td>
                <td><span class="badge ${project.status === 'published' ? 'bg-success' : 'bg-warning'}">${project.status}</span></td>
                <td>${new Date(project.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="adminManager.editProject(${project.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="adminManager.deleteProject(${project.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getTechnologies() {
        const inputs = document.querySelectorAll('.technology-input');
        const technologies = [];
        inputs.forEach(input => {
            if (input.value.trim()) {
                technologies.push(input.value.trim());
            }
        });
        return technologies;
    }

    getFeatures() {
        const inputs = document.querySelectorAll('.feature-input');
        const features = [];
        inputs.forEach(input => {
            if (input.value.trim()) {
                features.push(input.value.trim());
            }
        });
        return features;
    }

    addTechnology() {
        const container = document.getElementById('technologiesContainer');
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control technology-input" placeholder="Ajouter une technologie...">
            <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
        div.querySelector('input').focus();
    }

    addFeature() {
        const container = document.getElementById('featuresContainer');
        const div = document.createElement('div');
        div.className = 'input-group mb-2';
        div.innerHTML = `
            <input type="text" class="form-control feature-input" placeholder="Ajouter une fonctionnalité...">
            <button type="button" class="btn btn-outline-danger" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
        div.querySelector('input').focus();
    }

    resetForm() {
        document.getElementById('projectForm').reset();
        document.getElementById('technologiesContainer').innerHTML = `
            <div class="input-group mb-2">
                <input type="text" class="form-control technology-input" placeholder="Ex: React, Node.js...">
                <button type="button" class="btn btn-outline-secondary" onclick="adminManager.addTechnology()">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        document.getElementById('featuresContainer').innerHTML = `
            <div class="input-group mb-2">
                <input type="text" class="form-control feature-input" placeholder="Ex: Authentification, Dashboard...">
                <button type="button" class="btn btn-outline-secondary" onclick="adminManager.addFeature()">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
    }

    async logout() {
        try {
            const response = await fetch(this.API_BASE_URL + 'auth.php?action=logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                window.location.href = '/portfoliodim/login.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
}

// Initialisation
let adminManager;
document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
    window.adminManager = adminManager; // Pour les fonctions inline
});

// Fonctions globales pour les boutons inline
window.addTechnology = function() { adminManager.addTechnology(); };
window.addFeature = function() { adminManager.addFeature(); };
window.resetForm = function() { adminManager.resetForm(); };