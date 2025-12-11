/**
 * TABLE MANAGER - Version propre sans CSS intégré
 * Compatible avec votre API PHP existante
 */

class GlacialTableManager {
    constructor(config) {
        // Configuration
        this.tableId = config.tableId;
        this.apiUrl = config.apiUrl;
        this.itemsPerPage = {
            desktop: config.desktopItems || 5,
            mobile: config.mobileItems || 2
        };
        this.columns = config.columns || [];
        this.actions = config.actions || [];
        
        // Données
        this.allData = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.currentFilters = {};
        this.currentItemsPerPage = this.getItemsPerPage();
        this.selectedRows = new Set();
        
        // Références DOM
        this.elements = {};
        
        // Initialisation
        this.init();
    }
    
    init() {
        this.detectViewport();
        this.createTableStructure();
        this.loadData();
        this.setupEventListeners();
        
        window.addEventListener('resize', () => {
            const oldItemsPerPage = this.currentItemsPerPage;
            this.currentItemsPerPage = this.getItemsPerPage();
            
            if (oldItemsPerPage !== this.currentItemsPerPage) {
                this.currentPage = 1;
                this.renderTable();
                this.renderPagination();
            }
        });
    }
    
    createTableStructure() {
        const container = document.getElementById(this.tableId);
        if (!container) {
            console.error(`Container #${this.tableId} non trouvé`);
            return;
        }
        
        container.innerHTML = `
         
                
                <!-- Filtres -->
                <div class="filter-section">
                    <div class="filter-title">
                        <i class="fas fa-filter icon"></i>
                        Filtres
                    </div>
                    <div class="row g-3">
                        <div class="col-md-3">
                            <div class="search-box">
                                <i class="fas fa-search search-icon"></i>
                                <input type="text" 
                                       class="search-input" 
                                       id="${this.tableId}_search" 
                                       placeholder="Rechercher...">
                                <button class="search-clear" id="${this.tableId}_clear">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="filter-group">
                                <label>Catégorie</label>
                                <div class="filter-dropdown">
                                    <select class="filter-select" id="${this.tableId}_filter_category">
                                        <option value="">Toutes catégories</option>
                                        <option value="frontend">Frontend</option>
                                        <option value="backend">Backend</option>
                                        <option value="fullstack">Full-Stack</option>
                                        <option value="mobile">Mobile</option>
                                        <option value="design">Design</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="filter-group">
                                <label>Statut</label>
                                <div class="filter-dropdown">
                                    <select class="filter-select" id="${this.tableId}_filter_status">
                                        <option value="">Tous statuts</option>
                                        <option value="published">Publié</option>
                                        <option value="draft">Brouillon</option>
                                        <option value="archived">Archivé</option>
                                        <option value="deleted">Supprimé</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="filter-actions">
                                <button class="btn btn-ice filter-apply" id="${this.tableId}_apply">
                                    Appliquer
                                </button>
                                <button class="btn btn-outline-ice filter-reset" id="${this.tableId}_reset">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Tableau -->
                <div class="table-responsive">
                    <table class="table table-glacial">
                        <thead class="glacial-thead">
                            <tr id="${this.tableId}_headers"></tr>
                        </thead>
                        <tbody id="${this.tableId}_body">
                            <tr id="${this.tableId}_loading_row">
                                <td colspan="${this.columns.length + 2}" class="text-center py-5">
                                    <div class="glacial-loading">
                                        <div class="loading-spinner">
                                            <div class="spinner-ice"></div>
                                        </div>
                                        <p>Chargement des données...</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- État vide -->
                <div class="glacial-empty-state" id="${this.tableId}_empty" style="display: none;">
                    <div class="empty-icon">
                        <i class="fas fa-snowflake"></i>
                    </div>
                    <h4>Aucune donnée trouvée</h4>
                    <p class="text-muted">Aucun élément ne correspond à vos critères</p>
                    <button class="btn btn-outline-ice mt-3" onclick="glacialTableManager.resetFilters()">
                        <i class="fas fa-filter-circle-xmark me-1"></i>Réinitialiser les filtres
                    </button>
                </div>
                
                <!-- Pagination -->
                <div class="glacial-pagination-container">
                    <div class="pagination-info">
                        <i class="fas fa-info-circle info-icon"></i>
                        Affichage <span id="${this.tableId}_range">0-0</span> sur 
                        <span id="${this.tableId}_total">0</span>
                    </div>
                    <nav class="glacial-pagination">
                        <button class="pagination-btn prev" id="${this.tableId}_prev" disabled>
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <div class="pagination-numbers" id="${this.tableId}_numbers"></div>
                        <button class="pagination-btn next" id="${this.tableId}_next">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </nav>
                </div>
            </div>
        `;
        
        // Stocker les références
        this.elements = {
            body: document.getElementById(`${this.tableId}_body`),
            empty: document.getElementById(`${this.tableId}_empty`),
            loading: document.getElementById(`${this.tableId}_loading_row`),
            range: document.getElementById(`${this.tableId}_range`),
            total: document.getElementById(`${this.tableId}_total`),
            prev: document.getElementById(`${this.tableId}_prev`),
            next: document.getElementById(`${this.tableId}_next`),
            numbers: document.getElementById(`${this.tableId}_numbers`),
            bulk: document.getElementById(`${this.tableId}_bulk`)
        };
        
        this.renderHeaders();
    }
    
    renderHeaders() {
        const headersRow = document.getElementById(`${this.tableId}_headers`);
        if (!headersRow) return;
        
        let headersHTML = '<th class="row-selection mobile-hidden"></th>';
        
        this.columns.forEach(column => {
            headersHTML += `
                <th class="${column.class || ''} ${column.mobileHidden ? 'mobile-hidden' : ''}" 
                    style="${column.width ? `width: ${column.width}` : ''}"
                    ${column.sortable ? 'data-sortable="true" data-field="' + column.field + '"' : ''}>
                    ${column.title}
                    ${column.sortable ? '<i class="fas fa-sort sort-icon"></i>' : ''}
                </th>
            `;
        });
        
        if (this.actions.length > 0) {
            headersHTML += `<th class="table-cell-actions text-center">Actions</th>`;
        }
        
        headersRow.innerHTML = headersHTML;
        
        // Ajouter les écouteurs pour le tri
        if (headersRow) {
            headersRow.querySelectorAll('[data-sortable="true"]').forEach(th => {
                th.addEventListener('click', () => {
                    const field = th.dataset.field;
                    this.sortBy(field);
                });
            });
        }
    }
    
    async loadData() {
        try {
            this.showLoading(true);
            
            const response = await fetch(this.apiUrl, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Erreur réseau');
            
            const data = await response.json();
            
            if (data.success) {
                this.allData = data.projects || data.data || [];
                this.filteredData = [...this.allData];
                this.showLoading(false);
                this.renderTable();
                this.renderPagination();
                this.updateEmptyState();
                this.updateStats();
            } else {
                throw new Error(data.error || 'Erreur de chargement');
            }
        } catch (error) {
            console.error('Erreur chargement données:', error);
            this.showLoading(false);
            this.showError(error.message);
        }
    }
    
    renderTable() {
        if (!this.elements.body) return;
        
        const startIndex = (this.currentPage - 1) * this.currentItemsPerPage;
        const endIndex = startIndex + this.currentItemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            this.elements.body.innerHTML = '';
            return;
        }
        
        let rowsHTML = '';
        
        pageData.forEach((item, index) => {
            const isSelected = this.selectedRows.has(item.id);
            const rowClass = isSelected ? 'selected' : '';
            
            rowsHTML += `
                <tr class="glacial-table-row ${rowClass} ${item.status === 'deleted' ? 'deleted' : ''}" 
                    data-id="${item.id}">
                    ${this.renderSelectionCell(item)}
                    ${this.renderRowCells(item)}
                    ${this.renderActions(item)}
                </tr>
            `;
        });
        
        this.elements.body.innerHTML = rowsHTML;
        
        // Ajouter les écouteurs de sélection
        this.elements.body.querySelectorAll('.selection-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const row = e.target.closest('.glacial-table-row');
                const id = parseInt(row.dataset.id);
                
                if (e.target.checked) {
                    this.selectedRows.add(id);
                    row.classList.add('selected');
                } else {
                    this.selectedRows.delete(id);
                    row.classList.remove('selected');
                }
                
                this.updateBulkActions();
            });
        });
    }
    
    renderSelectionCell(item) {
        return `
            <td class="row-selection mobile-hidden">
                <div class="glacial-checkbox">
                    <input type="checkbox" class="selection-checkbox" 
                           ${this.selectedRows.has(item.id) ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </div>
            </td>
        `;
    }
    
    renderRowCells(item) {
        let cellsHTML = '';
        
        this.columns.forEach(column => {
            const value = this.getCellValue(item, column.field);
            const cellClass = column.mobileHidden ? 'mobile-hidden' : '';
            
            cellsHTML += `
                <td class="${column.class || ''} ${cellClass}">
                    ${this.formatCell(value, column.type, column.options)}
                </td>
            `;
        });
        
        return cellsHTML;
    }
    
    getCellValue(item, field) {
        if (!field) return '';
        return field.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : '';
        }, item);
    }
    
    formatCell(value, type = 'text', options = {}) {
        switch(type) {
            case 'badge':
                const badgeClass = options.badgeTypes?.[value] || 'badge-info';
                return `<span class="glacial-badge ${badgeClass}">${value}</span>`;
                
            case 'array':
                if (!Array.isArray(value)) return '';
                const chips = value.slice(0, 2).map(v => 
                    `<span class="chip-ice">${v}</span>`
                ).join('');
                const more = value.length > 2 ? 
                    `<span class="chip-more">+${value.length - 2}</span>` : '';
                return `<div class="table-cell-array">${chips}${more}</div>`;
                
            case 'date':
                return value ? new Date(value).toLocaleDateString('fr-FR') : '';
                
            case 'image':
                if (value) {
                    return `
                        <div class="table-cell-image">
                            <img src="${value}" class="table-image" alt="">
                        </div>
                    `;
                }
                return `
                    <div class="table-cell-image">
                        <div class="table-image-placeholder">
                            <i class="fas fa-image"></i>
                        </div>
                    </div>
                `;
                
            case 'boolean':
                return value ? 
                    `<i class="fas fa-check text-success"></i>` :
                    `<i class="fas fa-times text-danger"></i>`;
                
            default:
                return value || '';
        }
    }
    
    renderActions(item) {
        if (this.actions.length === 0) return '';
        
        const actionsHTML = this.actions.map(action => {
            const disabled = action.disabledCondition?.(item) || false;
            return `
                <button class="btn btn-${action.type || 'outline-ice'} btn-ice-xs ${action.class || ''}"
                        onclick="${action.onclick}(${item.id})"
                        title="${action.title}"
                        ${disabled ? 'disabled' : ''}>
                    <i class="${action.icon}"></i>
                </button>
            `;
        }).join('');
        
        return `
            <td class="table-cell-actions text-center">
                <div class="action-buttons">
                    ${actionsHTML}
                </div>
            </td>
        `;
    }
    
    // Pagination
    renderPagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.currentItemsPerPage);
        
        if (this.elements.range) {
            const start = ((this.currentPage - 1) * this.currentItemsPerPage) + 1;
            const end = Math.min(this.currentPage * this.currentItemsPerPage, this.filteredData.length);
            this.elements.range.textContent = `${start}-${end}`;
        }
        
        if (this.elements.total) {
            this.elements.total.textContent = this.filteredData.length;
        }
        
        if (this.elements.prev) {
            this.elements.prev.disabled = this.currentPage === 1;
        }
        
        if (this.elements.next) {
            this.elements.next.disabled = this.currentPage === totalPages || totalPages === 0;
        }
        
        if (this.elements.numbers) {
            this.elements.numbers.innerHTML = this.generatePaginationNumbers(totalPages);
            
            this.elements.numbers.querySelectorAll('.page-number').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = parseInt(e.target.dataset.page);
                    this.goToPage(page);
                });
            });
        }
    }
    
    generatePaginationNumbers(totalPages) {
        if (totalPages <= 1) return '';
        
        const maxVisible = this.isMobile ? 3 : 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        let html = '';
        
        if (startPage > 1) {
            html += `<button class="page-number" data-page="1">1</button>`;
            if (startPage > 2) html += `<span class="page-ellipsis">...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="page-ellipsis">...</span>`;
            html += `<button class="page-number" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        return html;
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.currentItemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderTable();
        this.renderPagination();
        
        // Animation douce
        const container = document.getElementById(this.tableId);
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // Gestion responsive
    getItemsPerPage() {
        this.isMobile = window.innerWidth <= 768;
        return this.isMobile ? this.itemsPerPage.mobile : this.itemsPerPage.desktop;
    }
    
    detectViewport() {
        return this.getItemsPerPage();
    }
    
    // État de l'interface
    showLoading(show = true) {
        if (this.elements.loading) {
            this.elements.loading.style.display = show ? 'table-row' : 'none';
        }
    }
    
    showError(message) {
        if (this.elements.body) {
            this.elements.body.innerHTML = `
                <tr>
                    <td colspan="${this.columns.length + 2}" class="text-center text-danger py-5">
                        <div class="alert-ice alert-ice-danger">
                            <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                            <h5 class="mb-2">Erreur de chargement</h5>
                            <p class="mb-3">${message}</p>
                            <button class="btn btn-ice btn-ice-sm" onclick="glacialTableManager.refresh()">
                                <i class="fas fa-redo me-1"></i> Réessayer
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    updateEmptyState() {
        if (!this.elements.empty || !this.elements.body) return;
        
        const isEmpty = this.filteredData.length === 0;
        const hasContent = this.elements.body.children.length > 1; // Exclut le loading row
        
        this.elements.empty.style.display = isEmpty && !hasContent ? 'block' : 'none';
    }
    
    updateStats() {
        // Mettre à jour les cartes statistiques si elles existent
        const total = this.allData.length;
        const published = this.allData.filter(p => p.status === 'published').length;
        const draft = this.allData.filter(p => p.status === 'draft').length;
        const deleted = this.allData.filter(p => p.status === 'deleted').length;
        
        const stats = {
            totalProjects: total,
            publishedProjects: published,
            draftProjects: draft,
            deletedProjects: deleted
        };
        
        // Mettre à jour les éléments DOM s'ils existent
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = stats[key];
            }
        });
    }
    
    updateBulkActions() {
        if (!this.elements.bulk) return;
        
        const count = this.selectedRows.size;
        if (count > 0) {
            this.elements.bulk.classList.add('visible');
            this.elements.bulk.querySelector('.bulk-count').textContent = `${count} sélectionné(s)`;
        } else {
            this.elements.bulk.classList.remove('visible');
        }
    }
    
    // Configuration des événements
    setupEventListeners() {
        // Recherche
        const searchInput = document.getElementById(`${this.tableId}_search`);
        const clearButton = document.getElementById(`${this.tableId}_clear`);
        
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.applySearch(e.target.value);
                }, 300);
            });
        }
        
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                searchInput.value = '';
                this.applySearch('');
            });
        }
        
        // Filtres
        const applyButton = document.getElementById(`${this.tableId}_apply`);
        const resetButton = document.getElementById(`${this.tableId}_reset`);
        
        if (applyButton) {
            applyButton.addEventListener('click', () => this.applyFilters());
        }
        
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetFilters());
        }
        
        // Pagination
        if (this.elements.prev) {
            this.elements.prev.addEventListener('click', () => {
                if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
            });
        }
        
        if (this.elements.next) {
            this.elements.next.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredData.length / this.currentItemsPerPage);
                if (this.currentPage < totalPages) this.goToPage(this.currentPage + 1);
            });
        }
    }
    
    applySearch(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredData = [...this.allData];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredData = this.allData.filter(item => {
                return this.columns.some(column => {
                    const value = this.getCellValue(item, column.field);
                    return String(value).toLowerCase().includes(term);
                });
            });
        }
        
        this.currentPage = 1;
        this.renderTable();
        this.renderPagination();
        this.updateEmptyState();
    }
    
    applyFilters() {
        const category = document.getElementById(`${this.tableId}_filter_category`)?.value || '';
        const status = document.getElementById(`${this.tableId}_filter_status`)?.value || '';
        
        let filtered = [...this.allData];
        
        if (category) {
            filtered = filtered.filter(item => item.category === category);
        }
        
        if (status) {
            filtered = filtered.filter(item => item.status === status);
        }
        
        this.filteredData = filtered;
        this.currentPage = 1;
        this.renderTable();
        this.renderPagination();
        this.updateEmptyState();
    }
    
    resetFilters() {
        document.getElementById(`${this.tableId}_search`).value = '';
        document.getElementById(`${this.tableId}_filter_category`).value = '';
        document.getElementById(`${this.tableId}_filter_status`).value = '';
        
        this.filteredData = [...this.allData];
        this.currentPage = 1;
        this.renderTable();
        this.renderPagination();
        this.updateEmptyState();
    }
    
    sortBy(field) {
        // Implémentation du tri
        console.log('Tri par:', field);
    }
    
    // Actions en masse
    bulkDelete() {
        if (this.selectedRows.size === 0) return;
        
        if (confirm(`Voulez-vous vraiment supprimer ${this.selectedRows.size} élément(s) ?`)) {
            // Implémenter la suppression en masse
            console.log('Suppression en masse:', Array.from(this.selectedRows));
        }
    }
    
    bulkExport() {
        if (this.selectedRows.size === 0) return;
        
        // Implémenter l'export
        console.log('Export en masse:', Array.from(this.selectedRows));
    }
    
    // Rafraîchissement
    refresh() {
        this.currentPage = 1;
        this.selectedRows.clear();
        this.resetFilters();
        this.loadData();
    }
}

// Export global pour les actions
window.glacialTableManager = null;

// Fonctions d'action globales
window.glacialViewAction = function(id) {
    console.log('Voir élément:', id);
};

window.glacialEditAction = function(id) {
    if (window.adminManager && window.adminManager.editProject) {
        window.adminManager.editProject(id);
    }
};

window.glacialDeleteAction = function(id) {
    if (window.adminManager && window.adminManager.deleteProject) {
        window.adminManager.deleteProject(id);
    }
};