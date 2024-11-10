function toggleForm() {
    const form = document.getElementById("user-form");
    form.classList.toggle("hidden");
}

function applyChanges() {
    alert("Cambios aplicados correctamente");
}

function cancelForm() {
    const form = document.getElementById("user-form");
    form.classList.add("hidden");
}