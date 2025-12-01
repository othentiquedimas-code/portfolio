// Fonctions de basculement entre login/register
function showRegister() {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "block";
}

function showLogin() {
  document.getElementById("register-form").style.display = "none";
  document.getElementById("login-form").style.display = "block";
}

// Toggle password visibility
function togglePassword(inputId) {
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

// Gestion des formulaires
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  handleLogin();
});

document
  .getElementById("registerForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    handleRegister();
  });

async function handleLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const btn = document.getElementById("loginBtn");

   console.log("Email :", email);
  console.log("Mot de passe : :", password);

  // Simulation de chargement
  btn.innerHTML =
    '<div class="spinner-border spinner-border-sm me-2"></div>Connexion...';
  btn.disabled = true;

  // Ici, vous intégrerez l'appel API réel

try {
  const response = await fetch("back/api/auth.php?action=login",{
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
     email: email,
     password: password, 

    }),
  });

     const data = await response.json();
    console.log(data)

    if (data.success) {
      setTimeout(() => {
    showToast("Connexion réussie!", "Bienvenue sur TaskMaster!", "success");
    btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Se connecter';
    btn.disabled = false;

    // Redirection vers le dashboard
    setTimeout(() => {
      window.location.href = "front/assets/dashboard.html";
    }, 1500);
  }, 2000);
      
    } else {
      showToast("Erreur", data.error || "Erreur lors de la connexion", "error");
 
    }

} catch (error) {
   
  showToast("Erreur", "Problème de connexion au serveur", "error");
  
}finally {
    btn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Créer mon compte';
    btn.disabled = false;
  }

  
}

async function handleRegister() {
  const firstName = document.getElementById("registerFirstName").value;
  const lastName = document.getElementById("registerLastName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById(
    "registerConfirmPassword"
  ).value;
  const timezone = document.getElementById('timezone').value;

  const btn = document.getElementById("registerBtn");

  // 👉 Vérification dans la console
  console.log("Prénom :", firstName);
  console.log("Nom :", lastName);
  console.log("Email :", email);
  console.log("Mot de passe :", password);
  console.log("Confirmation du mot de passe :", confirmPassword);
  // Validation basique
  if (password !== confirmPassword) {
    showToast("Erreur", "Les mots de passe ne correspondent pas", "error");
    return;
  }

  if (password.length < 8) {
    showToast(
      "Erreur",
      "Le mot de passe doit faire au moins 8 caractères",
      "error"
    );
    return;
  }

  // // Simulation de chargement
  btn.innerHTML =
    '<div class="spinner-border spinner-border-sm me-2"></div>Création du compte...';
  btn.disabled = true;

  // Ici, vous intégrerez l'appel API réel

  try {
    const response = await fetch("back/api/auth.php?action=register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
        timezone: timezone || "Europe/Paris",
      }),
    });

    const data = await response.json();
    console.log(data)

    if (data.success) {
      showToast("Compte créé!", "Bienvenue " + firstName + "!", "success");

      // Redirection vers la connexion
      setTimeout(() => {
        showLogin();
      }, 2000);
    } else {
      showToast("Erreur", data.error || "Erreur lors de la création", "error");
    }
  } catch (error) {
    // console.error("Erreur:", error);
    showToast("Erreur", "Problème de connexion au serveur", "error");
  } finally {
    btn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Créer mon compte';
    btn.disabled = false;
  }

  
}

// Fonction toast
function showToast(title, message, type = "info") {
  const toast = new bootstrap.Toast(document.getElementById("authToast"));
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMessage").textContent = message;

  // Changer la couleur selon le type
  const toastHeader = document.querySelector("#authToast .toast-header");
  toastHeader.className = "toast-header";
  if (type === "success") toastHeader.classList.add("text-success");
  if (type === "error") toastHeader.classList.add("text-danger");

  toast.show();
}
