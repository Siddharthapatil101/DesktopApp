document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
                const loadingScreen = document.getElementById('loadingScreen');
                loadingScreen.style.opacity = '0';
                loadingScreen.style.visibility = 'hidden';
            }, 2000);
            function updateDateTime() {
                const now = new Date();
                const timeString = now.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                });
                const dateString = now.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                document.getElementById('currentTime').textContent = timeString;
                document.getElementById('currentDate').textContent = dateString;
            }
            updateDateTime();
            setInterval(updateDateTime, 1000);
            let seconds = 0;
            function updateTimer() {
                seconds++;
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                const timerElement = document.getElementById('workTimer');
                if (timerElement) {
                    timerElement.textContent = 
                        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }
            }
            setInterval(updateTimer, 1000);
            const navLinks = document.querySelectorAll('.nav-link');
            const contentSections = document.querySelectorAll('.content-section');
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    document.querySelectorAll('.nav-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    this.parentElement.classList.add('active');
                    contentSections.forEach(section => {
                        section.classList.remove('active');
                    });
                    const targetId = this.getAttribute('href').substring(1);
                    const targetSection = document.getElementById(targetId);
                    if (targetSection) {
                        targetSection.classList.add('active');
                        targetSection.classList.add('fade-in');
                    }
                });
            });

            // Mobile menu handling
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');

            if (mobileMenuBtn && sidebar && overlay) {
                mobileMenuBtn.addEventListener('click', function() {
                    sidebar.classList.toggle('active');
                    overlay.classList.toggle('active');
                });

                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                });
            }

            // Form handling
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    // Add form submission logic here
                    alert('Form submitted successfully!');
                });
            });
        });
  const minBtn = document.getElementById('minBtn');
const maxBtn = document.getElementById('maxBtn');
const closeBtn = document.getElementById('closeBtn');
const header = document.querySelector('.header');
const dashboard = document.querySelector('#dashboard'); // Wrap your main dashboard content in a div with id="dashboard"

// Minimize
minBtn.addEventListener('click', () => {
    if (dashboard.style.display !== 'none') {
        dashboard.style.display = 'none';
    } else {
        dashboard.style.display = 'block';
    }
});

// Maximize / Fullscreen
maxBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

// Close
closeBtn.addEventListener('click', () => {
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:20%'>Dashboard Closed</h2>";
});
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if(query === "") {
        searchResults.style.display = 'none';
        return;
    }

    // Example: mock search results
    const results = [
        `Report: ${query} - Status: Completed`,
        `Activity: ${query} - Assigned today`,
        `Notification: ${query} updated`
    ];

    searchResults.innerHTML = results.map(r => `<p>${r}</p>`).join('');
    searchResults.style.display = 'block';
});

// Optional: trigger search on Enter key
searchInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
        searchBtn.click();
    }
});

