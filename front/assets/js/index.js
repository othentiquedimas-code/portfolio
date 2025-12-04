class PortfolioManager {
    static API_BASE_URL = window.location.origin + '/portfoliodim/back/api/';

    constructor() {
        this.sections = document.querySelectorAll('section');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.projectCards = document.querySelectorAll('[data-category]');
        this.statNumbers = document.querySelectorAll('.stat-number');
        this.contactForm = document.querySelector('.contact-form form');
        this.projectsGrid = document.getElementById('projects-grid');
        
        this.init();
    }

    async init() {
        // Initialiser les fonctionnalités de base
        this.setupNavigation();
        this.setupSmoothScrolling();
        this.setupProjectFiltering();
        this.setupContactForm();
        this.animateStats();
        
        // Charger les projets depuis l'API
        await this.loadProjects();
        
        // Animer les cartes après chargement
        this.animateProjectCards();
    }

    setupNavigation() {
        window.addEventListener('scroll', () => {
            let current = '';
            const scrollPosition = window.scrollY + 100;
            
            this.sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });
            
            this.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href').substring(1) === current) {
                    link.classList.add('active');
                }
            });
        });
    }

    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    setupProjectFiltering() {
        this.filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                this.filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                const filter = button.getAttribute('data-filter');
                this.filterProjects(filter);
            });
        });
    }

    filterProjects(filter) {
        const allCards = document.querySelectorAll('[data-category]');
        
        allCards.forEach(card => {
            if (filter === 'all' || card.getAttribute('data-category') === filter) {
                card.style.display = 'block';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 10);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
    }

    setupContactForm() {
        if (this.contactForm) {
            this.contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Message envoyé avec succès ! Je vous répondrai dans les plus brefs délais.');
                this.contactForm.reset();
            });
        }
    }

    animateStats() {
        this.statNumbers.forEach(stat => {
            const finalValue = parseInt(stat.textContent);
            let currentValue = 0;
            const increment = finalValue / 50;
            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= finalValue) {
                    stat.textContent = finalValue + (stat.textContent.includes('+') ? '+' : '%');
                    clearInterval(timer);
                } else {
                    stat.textContent = Math.floor(currentValue) + (stat.textContent.includes('+') ? '+' : '%');
                }
            }, 30);
        });
    }

    async loadProjects() {
        try {
            // Vérifier si la grille de projets existe
            if (!this.projectsGrid) {
                console.log('Projects grid not found');
                return;
            }

            console.log('🔗 Loading projects from API...');
            
            const response = await fetch(this.constructor.API_BASE_URL + 'projetApi.php?action=public_list');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📦 API response:', data);
            
            if (data.success && data.projects && data.projects.length > 0) {
                // Vider le contenu existant
                this.projectsGrid.innerHTML = '';
                
                // Afficher les projets
                this.displayProjects(data.projects);
                
                // Mettre à jour la liste des cartes de projet
                this.projectCards = document.querySelectorAll('[data-category]');
            } else {
                console.log('No projects found or API error');
                this.showDefaultMessage();
            }
        } catch (error) {
            console.error('❌ Error loading projects:', error);
            this.showDefaultMessage();
        }
    }

    displayProjects(projects) {
        projects.forEach((project, index) => {
            const projectCard = this.createProjectCard(project, index);
            this.projectsGrid.appendChild(projectCard);
        });
    }

    createProjectCard(project, index) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.setAttribute('data-category', project.category);
        
        // Animation delay
        col.style.opacity = '0';
        col.style.transform = 'translateY(20px)';
        col.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        col.style.transitionDelay = `${index * 100}ms`;

        // Image par défaut si aucune image
        const imageUrl = project.main_image_url || this.getDefaultImage(project.category);
        
        // Technologies comme badges (limité à 4)
        const techBadges = (project.technologies || []).slice(0, 4).map(tech => 
            `<span class="tech-tag">${tech}</span>`
        ).join('');

        col.innerHTML = `
            <div class="project-card">
                <img src="${imageUrl}" class="project-image" alt="${project.title}" loading="lazy">
                <div class="project-content">
                    <span class="project-category">${project.category}</span>
                    <h4 class="project-title">${project.title}</h4>
                    <p class="project-description">${project.short_description}</p>
                    <div class="project-tech">${techBadges}</div>
                    <div class="project-links">
                        <a href="#" class="project-link" data-bs-toggle="modal" data-bs-target="#projectModal${project.id}">
                            <i class="fas fa-info-circle"></i> Détails
                        </a>
                        ${project.github_url ? `
                        <a href="${project.github_url}" target="_blank" class="project-link" rel="noopener noreferrer">
                            <i class="fab fa-github"></i> Code
                        </a>` : ''}
                        ${project.demo_url ? `
                        <a href="${project.demo_url}" target="_blank" class="project-link" rel="noopener noreferrer">
                            <i class="fas fa-external-link-alt"></i> Démo
                        </a>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Créer également le modal pour ce projet
        this.createProjectModal(project);

        // Animation au chargement
        setTimeout(() => {
            col.style.opacity = '1';
            col.style.transform = 'translateY(0)';
        }, 100 + index * 100);

        return col;
    }

    getDefaultImage(category) {
        const defaultImages = {
            'fullstack': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            'frontend': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            'backend': 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            'mobile': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            'design': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        };
        
        return defaultImages[category] || defaultImages.fullstack;
    }

    createProjectModal(project) {
        const modalHtml = `
            <div class="modal fade" id="projectModal${project.id}" tabindex="-1">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content project-modal">
                        <div class="modal-header">
                            <h5 class="modal-title">${project.title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" style="filter: invert(1);"></button>
                        </div>
                        <div class="modal-body">
                            ${project.main_image_url ? `
                            <img src="${project.main_image_url}" class="img-fluid rounded mb-4" alt="${project.title}" loading="lazy">` : ''}
                            
                            <h6>Description du projet</h6>
                            <p class="mb-4">${project.full_description}</p>
                            
                            ${project.technologies && project.technologies.length > 0 ? `
                            <h6>Technologies utilisées</h6>
                            <div class="project-tech mb-4">
                                ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                            </div>` : ''}
                            
                            ${project.features && project.features.length > 0 ? `
                            <h6>Fonctionnalités principales</h6>
                            <ul class="expertise-list mb-4">
                                ${project.features.map(feature => `<li>${feature}</li>`).join('')}
                            </ul>` : ''}
                            
                            ${project.client_name ? `
                            <h6>Client</h6>
                            <p>${project.client_name}</p>` : ''}
                            
                            ${project.project_date ? `
                            <h6>Date du projet</h6>
                            <p>${new Date(project.project_date).toLocaleDateString('fr-FR')}</p>` : ''}
                        </div>
                        <div class="modal-footer">
                            <a href="#" class="btn-ice-outline" data-bs-dismiss="modal">Fermer</a>
                            ${project.github_url ? `
                            <a href="${project.github_url}" target="_blank" class="btn-ice" rel="noopener noreferrer">
                                <i class="fab fa-github me-2"></i> Voir le code
                            </a>` : ''}
                            ${project.demo_url ? `
                            <a href="${project.demo_url}" target="_blank" class="btn-ice" rel="noopener noreferrer">
                                <i class="fas fa-external-link-alt me-2"></i> Voir la démo
                            </a>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Ajouter le modal au body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    animateProjectCards() {
        // Cette fonction est maintenant appelée après le chargement des projets
        const cards = document.querySelectorAll('[data-category]');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + index * 100);
        });
    }

    showDefaultMessage() {
        if (this.projectsGrid) {
            this.projectsGrid.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Chargement des projets en cours...
                    </div>
                </div>
            `;
        }
    }

    // Méthode utilitaire pour rafraîchir les projets
    async refreshProjects() {
        await this.loadProjects();
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    const portfolioManager = new PortfolioManager();
    
    // Exposer pour le débogage si nécessaire
    window.portfolioManager = portfolioManager;
    
    console.log('🎨 PortfolioManager initialized');
});