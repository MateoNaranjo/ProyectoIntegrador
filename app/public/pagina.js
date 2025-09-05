async function verificarAcceso() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("❌ No tienes acceso a esta página.");
    window.location.href = "/";
    return;
  }

  const response = await fetch("/api/usuario", {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Error desconocido" }));
    console.error("Error en la validación del token:", data.error);
    alert("❌ Acceso denegado. Inicia sesión nuevamente.");
    localStorage.removeItem("token");
    window.location.href = "/";
    return;
  }

  const data = await response.json();
  console.log("Usuario autenticado:", data.user);
}

verificarAcceso();
