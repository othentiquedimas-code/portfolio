class AuthManager {
  // CORRECTION ICI : changer '/todolist/' par '/portfoliodim/'
  static API_BASE_URL = window.location.origin + '/portfoliodim/back/api/';

  constructor() {
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    // Éléments de connexion
    this.loginForm = document.getElementById("loginForm");
    this.loginEmail = document.getElementById("loginEmail");
    this.loginPassword = document.getElementById("loginPassword");
    this.loginBtn = document.getElementById("loginBtn");
    
    // Éléments toast
    this.toastElement = document.getElementById("authToast");
    this.toastTitle = document.getElementById("toastTitle");
    this.toastMessage = document.getElementById("toastMessage");
  }

  bindEvents() {
    // Écouteur pour le formulaire de connexion
    if (this.loginForm) {
      this.loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }
  }

  // Méthode pour basculer la visibilité du mot de passe
  togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentNode.querySelector(".password-toggle i");

    if (input.type === "password") {
      input.type = "text";
      icon.className = "fas fa-eye-slash";
    } else {
      input.type = "password";
      icon.className = "fas fa-eye";
    }
  }

  // Méthode générique pour les appels API
  async apiCall(endpoint, method = 'POST', data = null) {
    const url = AuthManager.API_BASE_URL + endpoint;
    
    console.log('🔗 API Call URL:', url); // Debug
    console.log('📤 Data sent:', data); // Debug
    
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json"
      },
      credentials: 'include' // Important pour les cookies de session
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      console.log('📥 Response status:', response.status); // Debug
      
      // Vérifier le statut HTTP
      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        
        // Essayer de lire le message d'erreur
        let errorMessage = `Erreur ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Ignorer si pas de JSON
        }
        
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('✅ API Response:', responseData); // Debug
      
      return responseData;
    } catch (error) {
      console.error('❌ API call error:', error);
      throw error;
    }
  }

  // Gestion de la connexion
  async handleLogin() {
    if (!this.validateLoginForm()) return;

    const email = this.loginEmail.value;
    const password = this.loginPassword.value;
    
    this.showLoading(this.loginBtn, "Connexion...");

    try {
      console.log('🔐 Login attempt:', { email, password: '***' }); // Debug
      
      const data = await this.apiCall('auth.php?action=login', 'POST', {
        email: email,
        password: password
      });
      
      console.log('✅ Login response:', data); // Debug
      
      if (data.success) {
        this.handleLoginSuccess(data.user);
      } else {
        this.showToast("Erreur", data.error || "Erreur lors de la connexion", "error");
        this.resetButton(this.loginBtn, '<i class="fas fa-sign-in-alt me-2"></i>Se connecter');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      this.showToast("Erreur", error.message || "Problème de connexion au serveur", "error");
      this.resetButton(this.loginBtn, '<i class="fas fa-sign-in-alt me-2"></i>Se connecter');
    }
  }

  // Validation du formulaire de connexion
  validateLoginForm() {
    if (!this.loginEmail.value || !this.loginPassword.value) {
      this.showToast("Erreur", "Veuillez remplir tous les champs", "error");
      return false;
    }
    
    // Validation basique d'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.loginEmail.value)) {
      this.showToast("Erreur", "Veuillez entrer une adresse email valide", "error");
      return false;
    }
    
    return true;
  }

  // Gestion de la connexion réussie

handleLoginSuccess(userData) {
    this.showToast("Connexion réussie!", `Bienvenue ${userData.username} !`, "success");
    this.resetButton(this.loginBtn, '<i class="fas fa-sign-in-alt me-2"></i>Se connecter');

    // Redirection vers l'interface d'administration
    setTimeout(() => {
        window.location.href = "/portfoliodim/front/assets/admin.html";
    }, 1500);
}
  // Méthodes utilitaires
  showLoading(button, text) {
    button.innerHTML = `<div class="spinner-border spinner-border-sm me-2"></div>${text}`;
    button.disabled = true;
  }

  resetButton(button, content) {
    button.innerHTML = content;
    button.disabled = false;
  }

  showToast(title, message, type = "info") {
    if (!this.toastElement) {
      console.error('Toast element not found');
      alert(`${title}: ${message}`); // Fallback
      return;
    }

    this.toastTitle.textContent = title;
    this.toastMessage.textContent = message;

    // Changer la couleur selon le type
    const toastHeader = this.toastElement.querySelector(".toast-header");
    if (toastHeader) {
      toastHeader.className = "toast-header";
      if (type === "success") toastHeader.classList.add("text-success", "bg-light");
      if (type === "error") toastHeader.classList.add("text-danger", "bg-light");
      if (type === "info") toastHeader.classList.add("text-info", "bg-light");
    }

    try {
      const toast = new bootstrap.Toast(this.toastElement);
      toast.show();
    } catch (e) {
      console.error('Toast error:', e);
    }
  }
}

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
  const authManager = new AuthManager();
  
  // Exposer les méthodes pour qu'elles soient accessibles depuis HTML
  window.togglePassword = (inputId) => authManager.togglePassword(inputId);
  
  // Pour debug
  window.authManager = authManager;
  console.log('🔧 AuthManager initialized with API URL:', AuthManager.API_BASE_URL);
});