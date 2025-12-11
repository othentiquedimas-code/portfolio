/**
 * Classe principale pour gérer le portfolio
 * Responsable du chargement des projets, navigation, filtrage et animations
 */
class PortfolioManager {
    // URL de base de l'API pour charger les projets
    static API_BASE_URL = window.location.origin + '/portfoliodim/back/api/';

    constructor() {
        // Initialisation des références aux éléments DOM
        this.sections = document.querySelectorAll('section'); // Toutes les sections de la page
        this.navLinks = document.querySelectorAll('.nav-link'); // Liens de navigation
        this.filterButtons = document.querySelectorAll('.filter-btn'); // Boutons de filtrage par catégorie
        this.projectCards = document.querySelectorAll('[data-category]'); // Cartes de projet existantes
        this.statNumbers = document.querySelectorAll('.stat-number'); // Nombres des statistiques à animer
        this.contactForm = document.querySelector('.contact-form form'); // Formulaire de contact
        this.projectsGrid = document.getElementById('projects-grid'); // Grille pour afficher les projets
        
        // Lancement de l'initialisation
        this.init();
    }

    /**
     * Initialisation principale du portfolio
     * Configure toutes les fonctionnalités et charge les projets
     */
    async init() {
        // Configuration des fonctionnalités de base
        this.setupNavigation();
        this.setupSmoothScrolling();
        this.setupProjectFiltering();
        this.setupContactForm();
        this.animateStats();
        
        // Chargement des projets depuis l'API
        await this.loadProjects();
        
        // Animation des cartes de projet après leur chargement
        this.animateProjectCards();
    }

    /**
     * Configure la navigation active en fonction du défilement
     * Met en surbrillance le lien correspondant à la section visible
     */
    setupNavigation() {
        window.addEventListener('scroll', () => {
            let current = ''; // ID de la section actuellement visible
            const scrollPosition = window.scrollY + 100; // Position avec offset
            
            // Déterminer quelle section est actuellement visible
            this.sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });
            
            // Mettre à jour les classes actives des liens de navigation
            this.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href').substring(1) === current) {
                    link.classList.add('active');
                }
            });
        });
    }

    /**
     * Configure le défilement fluide pour les ancres internes
     */
    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault(); // Empêcher le comportement par défaut
                const targetId = anchor.getAttribute('href');
                
                // Ignorer les ancres vides
                if (targetId === '#') return;
                
                // Trouver l'élément cible et faire défiler vers lui
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Offset pour la navbar
                        behavior: 'smooth' // Animation fluide
                    });
                }
            });
        });
    }

    /**
     * Configure les boutons de filtrage des projets par catégorie
     */
    setupProjectFiltering() {
        this.filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Retirer la classe active de tous les boutons
                this.filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Ajouter la classe active au bouton cliqué
                button.classList.add('active');
                
                // Récupérer la catégorie de filtrage
                const filter = button.getAttribute('data-filter');
                
                // Appliquer le filtre
                this.filterProjects(filter);
            });
        });
    }

    /**
     * Filtre les projets selon la catégorie sélectionnée
     *  - Catégorie à filtrer ('all' pour tout afficher)
     */
    filterProjects(filter) {
        const allCards = document.querySelectorAll('[data-category]');
        
        allCards.forEach(card => {
            // Afficher ou masquer selon le filtre
            if (filter === 'all' || card.getAttribute('data-category') === filter) {
                card.style.display = 'block';
                // Animation d'apparition
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 10);
            } else {
                // Animation de disparition
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300); // Attendre la fin de l'animation avant de masquer
            }
        });
    }

    /**
     * Configure le formulaire de contact
     */
    setupContactForm() {
        if (this.contactForm) {
            this.contactForm.addEventListener('submit', (e) => {
                e.preventDefault(); // Empêcher l'envoi classique
                
                // Simulation d'envoi (à remplacer par un appel API)
                alert('Message envoyé avec succès ! Je vous répondrai dans les plus brefs délais.');
                
                // Réinitialisation du formulaire
                this.contactForm.reset();
            });
        }
    }

    /**
     * Anime les nombres des statistiques (compteurs)
     */
    animateStats() {
        this.statNumbers.forEach(stat => {
            const finalValue = parseInt(stat.textContent); // Valeur finale à atteindre
            let currentValue = 0; // Valeur courante
            const increment = finalValue / 50; // Incrément pour animation fluide
            const timer = setInterval(() => {
                currentValue += increment;
                
                // Vérifier si on a atteint la valeur finale
                if (currentValue >= finalValue) {
                    // Formater avec le suffixe (+ ou %)
                    stat.textContent = finalValue + (stat.textContent.includes('+') ? '+' : '%');
                    clearInterval(timer); // Arrêter l'animation
                } else {
                    // Mettre à jour la valeur affichée
                    stat.textContent = Math.floor(currentValue) + (stat.textContent.includes('+') ? '+' : '%');
                }
            }, 30); // Intervalle de 30ms pour une animation fluide
        });
    }

    /**
     * Charge les projets depuis l'API
     * @returns {Promise<void>}
     */
    async loadProjects() {
        try {
            // Vérifier que la grille de projets existe
            if (!this.projectsGrid) {
                console.error('Grille de projets non trouvée');
                return;
            }
            
            // Appel à l'API pour récupérer les projets
            const response = await fetch(this.constructor.API_BASE_URL + 'projetApi.php?action=list');
            
            // Vérifier que la réponse est OK
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}`);
            }
            
            // Parser la réponse JSON
            const data = await response.json();
            
            // Vérifier que des projets ont été retournés
            if (data.success && data.projects && data.projects.length > 0) {
                // Vider le contenu existant
                this.projectsGrid.innerHTML = '';
                
                // Afficher les projets
                this.displayProjects(data.projects);
                
                // Mettre à jour la liste des cartes de projet
                this.projectCards = document.querySelectorAll('[data-category]');
            } else {
                // Aucun projet trouvé
                this.showDefaultMessage();
            }
        } catch (error) {
            console.error('Erreur lors du chargement des projets:', error);
            this.showDefaultMessage();
        }
    }

    /**
     * Affiche les projets dans la grille
     *  - Liste des projets à afficher
     */
    displayProjects(projects) {
        projects.forEach((project, index) => {
            const projectCard = this.createProjectCard(project, index);
            this.projectsGrid.appendChild(projectCard);
        });
    }

    /**
     * Crée une carte de projet HTML
     *  - Données du projet
     *  - Index pour l'animation
     * - Élément de carte de projet
     */
    createProjectCard(project, index) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.setAttribute('data-category', project.category);
        
        // Configuration de l'animation
        col.style.opacity = '0';
        col.style.transform = 'translateY(20px)';
        col.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        col.style.transitionDelay = `${index * 100}ms`; // Délai progressif

        // Utiliser l'image principale ou une image par défaut
        const imageUrl = project.main_image_url || this.getDefaultImage(project.category);
        
        // Générer les badges de technologie (limité à 4)
        const techBadges = (project.technologies || []).slice(0, 4).map(tech => 
            `<span class="tech-tag">${tech}</span>`
        ).join('');

        // Structure HTML de la carte
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

        // Créer également le modal détaillé pour ce projet
        this.createProjectModal(project);

        // Lancer l'animation après un délai
        setTimeout(() => {
            col.style.opacity = '1';
            col.style.transform = 'translateY(0)';
        }, 100 + index * 100);

        return col;
    }

    /**
     * Retourne une image par défaut selon la catégorie
     * - Catégorie du projet
     *  - URL de l'image par défaut
     */
    getDefaultImage(category) {
        const defaultImages = {
            'fullstack': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            'frontend': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            'backend': 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            'mobile': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            'design': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        };
        
        // Retourner l'image correspondante ou une image par défaut
        return defaultImages[category] || defaultImages.fullstack;
    }

    /**
     * Crée un modal détaillé pour un projet
     * @param {Object} project - Données du projet
     */
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

    /**
     * Anime les cartes de projet après leur chargement
     */
    animateProjectCards() {
        const cards = document.querySelectorAll('[data-category]');
        cards.forEach((card, index) => {
            // Configuration initiale pour l'animation
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            // Animation progressive
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + index * 100);
        });
    }

    /**
     * Affiche un message par défaut si aucun projet n'est trouvé
     */
    showDefaultMessage() {
        if (this.projectsGrid) {
            this.projectsGrid.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Aucun projet disponible pour le moment.
                    </div>
                </div>
            `;
        }
    }

    /**
     * Rafraîchit la liste des projets
     * Utile après des modifications en admin
     * 
     */
    async refreshProjects() {
        await this.loadProjects();
    }
}

// Initialisation du portfolio au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const portfolioManager = new PortfolioManager();
    
    // Exposer l'instance pour le débogage (si nécessaire)
    window.portfolioManager = portfolioManager;
});