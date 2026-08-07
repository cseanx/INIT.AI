const clock = document.querySelector(".clock");

function updateClock(){

const now = new Date();

clock.innerHTML = now.toLocaleTimeString([],{

hour:"2-digit",
minute:"2-digit"

});

}

updateClock();

setInterval(updateClock,1000);

const sidebar = document.getElementById("sidebar");

const toggle = document.getElementById("toggleSidebar");

toggle.addEventListener("click",()=>{

    sidebar.classList.toggle("collapsed");

});

const navLinks=document.querySelectorAll("nav a");

navLinks.forEach(link=>{

    link.addEventListener("click",(e)=>{

        e.preventDefault();

        navLinks.forEach(item=>item.classList.remove("active"));

        link.classList.add("active");

    });

});