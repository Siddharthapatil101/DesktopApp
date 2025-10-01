document.addEventListener('DOMContentLoaded', () => {
    const logoutConfirmBtn = document.getElementById("logoutConfirmBtn");
    if (logoutConfirmBtn) {
        logoutConfirmBtn.addEventListener("click", () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "login.html";
        });
    }

    const dashboardSearch = document.getElementById('dashboardSearch');
    if (dashboardSearch) {
        dashboardSearch.addEventListener('input', (e) => {
            if (!e.target.value.trim()) {
                document.querySelectorAll('.nav-link li').forEach(li => li.style.display = '');
                document.querySelectorAll('.card').forEach(card => card.style.display = '');
            }
        });
    }
});

