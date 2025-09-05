// Registro usuario
async function registrarUsuario(event) {
  event.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("correo").value.trim();
  const password = document.getElementById("contraseña").value.trim();

  // Validación de campos vacíos
  if (!nombre || !email || !password) {
    alert("Por favor, completa todos los campos: nombre, correo y contraseña.");
    return;
  }

  const response = await fetch("/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password }),
  });

  const data = await response.json();
  alert(data.message || data.error);
}

// Login usuario
async function iniciarSesion(event) {
  event.preventDefault();

  const email = document.getElementById("loginCorreo").value.trim();
  const password = document.getElementById("loginContraseña").value.trim();

  // Validación de campos vacíos
  if (!email || !password) {
    alert("Por favor, ingresa tu correo y contraseña.");
    return;
  }

  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    alert("Bienvenido, " + data.user.nombre);
    window.location.href = "index-incial.html"; // Página protegida
  } else {
    alert("Error: " + data.error);
  }
}

// Eventos para los formularios
document.getElementById("registroForm").addEventListener("submit", registrarUsuario);
document.getElementById("loginForm").addEventListener("submit", iniciarSesion);
