
document.addEventListener("DOMContentLoaded", () => {
    const loadComponent = (id, file) => {
        const el = document.getElementById(id);
        if (el) {
            fetch(file)
                .then(r => r.text())
                .then(html => el.outerHTML = html)
                .catch(e => console.error("Error loading component:", e));
        }
    };

    loadComponent("footer-placeholder", "components/footer.html");
    loadComponent("legal-header-placeholder", "components/legal-header.html");
});
