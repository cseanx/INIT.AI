const particleContainer = document.getElementById("particles");

for (let i = 0; i < 45; i++) {
    const particle = document.createElement("div");
    particle.classList.add("particle");
    const size = Math.random() * 4 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${8 + Math.random() * 8}s`;
    particle.style.animationDelay = `${Math.random() * -10}s`;
    particleContainer.appendChild(particle);

    const loginButton = document.getElementById("loginBtn");

loginButton.addEventListener("click", () => {

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    // Login delay
    setTimeout(() => {

        window.location.href = "dashboard.html";

    }, 500);

});
}