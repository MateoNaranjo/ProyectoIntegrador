// public/login.js

// Mostrar campos según correo
document.getElementById("correo").addEventListener("input", function () {
  const correo = this.value.trim().toLowerCase();
  const camposDoctor = document.getElementById("camposDoctor");
  const camposPaciente = document.getElementById("camposPaciente");

  if (correo.includes("@arcdata.com")) {
    camposDoctor.style.display = "block";
    camposPaciente.style.display = "none";
    ["especialidad", "nit_eps_doctor", "direccion_doctor", "fecha_nacimiento_doctor"].forEach(id => {
      document.getElementById(id).required = true;
    });
    ["direccion", "fecha_nacimiento", "nit_eps_paciente"].forEach(id => {
      document.getElementById(id).required = false;
    });
  } else {
    camposDoctor.style.display = "none";
    camposPaciente.style.display = "block";
    ["direccion", "fecha_nacimiento", "nit_eps_paciente"].forEach(id => {
      document.getElementById(id).required = true;
    });
    ["especialidad", "nit_eps_doctor", "direccion_doctor", "fecha_nacimiento_doctor"].forEach(id => {
      document.getElementById(id).required = false;
    });
  }
});

// REGISTRO
document.getElementById("registroForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const documento = document.getElementById("documento").value.trim();
  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const correo = document.getElementById("correo").value.trim().toLowerCase();
  const contraseña = document.getElementById("contraseña").value.trim();

  if (!documento || !nombre || !apellido || !correo || !contraseña) {
    alert("Completa los campos básicos");
    return;
  }

  const data = { documento, nombre, apellido, correo, contraseña };

  if (correo.includes("@arcdata.com")) {
    const especialidad = document.getElementById("especialidad").value;
    const nit_eps = document.getElementById("nit_eps_doctor").value.trim();
    const direccion = document.getElementById("direccion_doctor").value.trim();
    const fecha_nacimiento = document.getElementById("fecha_nacimiento_doctor").value;

    if (!especialidad || !nit_eps || !direccion || !fecha_nacimiento) {
      alert("Completa todos los campos del doctor");
      return;
    }

    data.especialidad = especialidad;
    data.nit_eps = nit_eps;
    data.direccion = direccion;
    data.fecha_nacimiento = fecha_nacimiento;
    data.tipo = "doctor";
  } else {
    const direccion = document.getElementById("direccion").value.trim();
    const fecha_nacimiento = document.getElementById("fecha_nacimiento").value;
    const nit_eps = document.getElementById("nit_eps_paciente").value.trim();

    if (!direccion || !fecha_nacimiento || !nit_eps) {
      alert("Completa todos los campos del paciente");
      return;
    }

    data.direccion = direccion;
    data.fecha_nacimiento = fecha_nacimiento;
    data.nit_eps = nit_eps;
    data.tipo = "paciente"; // ← AQUÍ ESTÁ
  }

  console.log("Enviando al backend:", data); // ← DEPURACIÓN

  const res = await fetch("/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  alert(result.message || result.error);
});

// LOGIN
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const correo = document.getElementById("loginCorreo").value.trim().toLowerCase();
  const contraseña = document.getElementById("loginContraseña").value.trim();

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, contraseña }),
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id);
    localStorage.setItem("userType", data.user.tipo);
    localStorage.setItem("userName", data.user.nombre);
    alert("Bienvenido, " + data.user.nombre);
    // Redirigir según el tipo de usuario
    if (data.user.tipo === 'doctor') {
      window.location.href = "Doctor.html";
    } else {
      window.location.href = "index-inicial.html";
    }
  } else {
    alert("Error: " + data.error);
  }
});

// Poblar selects de EPS al cargar la página
async function poblarEps() {
  try {
    const res = await fetch('/api/eps');
    if (!res.ok) return;
    const eps = await res.json();
    const selDoctor = document.getElementById('nit_eps_doctor');
    const selPaciente = document.getElementById('nit_eps_paciente');
    if (!selDoctor || !selPaciente) return;
    eps.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id; // usamos Id_Eps como value
      opt.textContent = e.nombre;
      selDoctor.appendChild(opt.cloneNode(true));
      selPaciente.appendChild(opt.cloneNode(true));
    });
  } catch (e) { console.debug('No se pudieron cargar EPS:', e); }
}

// Ejecutar al cargar el script
document.addEventListener('DOMContentLoaded', poblarEps);