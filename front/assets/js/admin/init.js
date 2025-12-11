/**
 * INITIALISATION - Configuration des tableaux glacials
 * Compatible avec votre AdminManager existant
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser quand l'onglet "Gérer les projets" est actif
    const projectsTab = document.getElementById('manageProjects');
    
    if (projectsTab) {
        initProjectsTable();
        
        // Vérifier si l'onglet est actif au chargement
        if (projectsTab.classList.contains('active') || projectsTab.classList.contains('show')) {
            setTimeout(loadTableData, 300);
        }
        
        // Écouter le changement d'onglet
        document.querySelectorAll('[data-bs-target="#manageProjects"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', () => {
                setTimeout(loadTableData, 100);
            });
        });
    }
});

function initProjectsTable() {
    // Configuration du tableau glacial
    const tableConfig = {
        tableId: 'glacialProjectsTable',
        apiUrl: 'http://localhost/portfoliodim/back/api/projetApi.php?action=admin_list',
        desktopItems: 10,
        mobileItems: 3,
        columns: [
            {
                field: 'id',
                title: 'ID',
                width: '80px',
                class: 'text-center',
                mobileHidden: true
            },
            {
                field: 'title',
                title: 'Titre',
                sortable: true,
                width: '250px'
            },
            {
                field: 'category',
                title: 'Catégorie',
                type: 'badge',
                options: {
                    badgeTypes: {
                        frontend: 'badge-blue',
                        backend: 'badge-purple',
                        fullstack: 'badge-cyan',
                        mobile: 'badge-purple',
                        design: 'badge-pink'
                    }
                }
            },
            {
                field: 'technologies',
                title: 'Technologies',
                type: 'array',
                mobileHidden: true,
                width: '200px'
            },
            {
                field: 'status',
                title: 'Statut',
                type: 'badge',
                width: '120px',
                options: {
                    badgeTypes: {
                        published: 'badge-success',
                        draft: 'badge-warning',
                        archived: 'badge-secondary',
                        deleted: 'badge-danger'
                    },
                    displayText: {
                        published: 'Publié',
                        draft: 'Brouillon',
                        archived: 'Archivé',
                        deleted: 'Supprimé'
                    }
                }
            },
            {
                field: 'created_at',
                title: 'Date',
                type: 'date',
                mobileHidden: true,
                width: '120px'
            }
        ],
        actions: [
            {
                icon: 'fas fa-eye',
                type: 'outline-ice',
                class: 'btn-view',
                title: 'Voir les détails',
                onclick: 'glacialViewAction'
            },
            {
                icon: 'fas fa-edit',
                type: 'outline-ice',
                class: 'btn-edit',
                title: 'Modifier',
                onclick: 'glacialEditAction'
            },
            {
                icon: 'fas fa-trash',
                type: 'outline-ice',
                class: 'btn-delete',
                title: 'Supprimer',
                onclick: 'glacialDeleteAction',
                disabledCondition: (item) => item.status === 'deleted'
            },
            {
                icon: 'fas fa-undo',
                type: 'outline-ice',
                class: 'btn-restore',
                title: 'Restaurer',
                onclick: 'glacialRestoreAction',
                disabledCondition: (item) => item.status !== 'deleted'
            }
        ]
    };
    
    // Initialiser le tableau glacial
    window.glacialTableManager = new GlacialTableManager(tableConfig);
    
    // Connecter avec votre AdminManager
    connectWithAdminManager();
}

function loadTableData() {
    if (window.glacialTableManager) {
        window.glacialTableManager.refresh();
        // Mettre à jour les statistiques après le chargement
        setTimeout(updateStatistics, 500);
    }
}

function connectWithAdminManager() {
    // S'assurer que AdminManager existe
    if (!window.adminManager) {
        console.warn('AdminManager non trouvé, tentative de création...');
        // Attendre un peu plus longtemps pour AdminManager
        setTimeout(() => {
            if (!window.adminManager) {
                console.error('AdminManager toujours non disponible');
            } else {
                setupAdminManagerIntegration();
            }
        }, 1000);
    } else {
        setupAdminManagerIntegration();
    }
    
    function setupAdminManagerIntegration() {
        // Surcharger la fonction chargerProjets pour mettre à jour les deux tableaux
        if (window.adminManager.chargerProjets) {
            const originalChargerProjets = window.adminManager.chargerProjets;
            
            window.adminManager.chargerProjets = async function() {
                try {
                    // Appeler la fonction originale
                    await originalChargerProjets.call(this);
                    
                    // Mettre à jour le tableau glacial
                    if (window.glacialTableManager) {
                        await window.glacialTableManager.refresh();
                        updateStatistics();
                    }
                    
                } catch (error) {
                    console.error('Erreur chargement projets:', error);
                }
            };
        }
        
        // Rafraîchir le tableau après création/édition/suppression
        setupActionRefresh();
    }
}

function updateStatistics() {
    if (window.glacialTableManager && window.glacialTableManager.allData) {
        const projects = window.glacialTableManager.allData;
        
        // Calculer les statistiques
        const stats = {
            totalProjects: projects.length,
            publishedProjects: projects.filter(p => p.status === 'published').length,
            draftProjects: projects.filter(p => p.status === 'draft').length,
            deletedProjects: projects.filter(p => p.status === 'deleted').length
        };
        
        // Mettre à jour les éléments DOM avec vérification
        updateElementIfExists('totalProjects', stats.totalProjects);
        updateElementIfExists('publishedProjects', stats.publishedProjects);
        updateElementIfExists('draftProjects', stats.draftProjects);
        updateElementIfExists('deletedProjects', stats.deletedProjects);
        
        console.log('Statistiques mises à jour:', stats);
    }
}

function updateElementIfExists(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Élément ${elementId} non trouvé pour les statistiques`);
    }
}

function setupActionRefresh() {
    // Surcharger les actions de l'AdminManager pour rafraîchir le tableau glacial
    if (window.adminManager) {
        // Création de projet
        if (window.adminManager.creerProjet) {
            const originalCreerProjet = window.adminManager.creerProjet;
            window.adminManager.creerProjet = async function(...args) {
                const result = await originalCreerProjet.call(this, ...args);
                refreshAfterAction();
                return result;
            };
        }
        
        // Édition de projet
        if (window.adminManager.saveEditProject) {
            const originalSaveEditProject = window.adminManager.saveEditProject;
            window.adminManager.saveEditProject = async function(...args) {
                const result = await originalSaveEditProject.call(this, ...args);
                refreshAfterAction();
                return result;
            };
        }
        
        // Suppression de projet
        if (window.adminManager.deleteProject) {
            const originalDeleteProject = window.adminManager.deleteProject;
            window.adminManager.deleteProject = async function(...args) {
                const result = await originalDeleteProject.call(this, ...args);
                refreshAfterAction();
                return result;
            };
        }
        
        // Restauration de projet
        if (window.adminManager.restoreProject) {
            const originalRestoreProject = window.adminManager.restoreProject;
            window.adminManager.restoreProject = async function(...args) {
                const result = await originalRestoreProject.call(this, ...args);
                refreshAfterAction();
                return result;
            };
        }
    }
}

function refreshAfterAction() {
    if (window.glacialTableManager) {
        setTimeout(() => {
            window.glacialTableManager.refresh();
            updateStatistics();
        }, 1000);
    }
}

// Actions globales pour les boutons du tableau
window.glacialViewAction = function(id) {
    console.log('Voir projet:', id);
    // Vous pouvez implémenter une vue détaillée ici
    alert(`Voir le projet ID: ${id}\n\nÀ implémenter: vue détaillée`);
};

window.glacialEditAction = function(id) {
    if (window.adminManager && window.adminManager.editProject) {
        window.adminManager.editProject(id);
    } else {
        console.error('AdminManager.editProject non disponible');
        alert('Fonction d\'édition non disponible');
    }
};

window.glacialDeleteAction = function(id) {
    if (window.adminManager && window.adminManager.deleteProject) {
        if (confirm('Voulez-vous vraiment supprimer ce projet ?')) {
            window.adminManager.deleteProject(id);
        }
    } else {
        console.error('AdminManager.deleteProject non disponible');
        alert('Fonction de suppression non disponible');
    }
};

window.glacialRestoreAction = function(id) {
    if (window.adminManager && window.adminManager.restoreProject) {
        if (confirm('Voulez-vous restaurer ce projet ?')) {
            window.adminManager.restoreProject(id);
        }
    } else {
        console.error('AdminManager.restoreProject non disponible');
        alert('Fonction de restauration non disponible');
    }
};