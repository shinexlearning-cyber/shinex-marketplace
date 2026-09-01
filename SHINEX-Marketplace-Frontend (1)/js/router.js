const Router = {
  go(){
    const raw=location.hash.replace(/^#/,"")||"/home";
    const [path,queryString]=raw.split("?");
    const params=new URLSearchParams(queryString||"");
    if(path==="/"||path==="/home") return App.home();
    if(path==="/search") return App.search(params);
    if(path==="/product" || path.startsWith("/product/")) return App.product(decodeURIComponent(path.split("/")[2]||""));
    if(path==="/sell") return App.sell();
    if(path==="/advertise") return App.advertise();
    if(path==="/login") return App.auth("login");
    if(path==="/register") return App.auth("register");
    if(["/about","/contact","/privacy-policy","/terms"].includes(path)) return App.staticPage(path.slice(1));
    if(path==="/favorites") return App.page("Favorites",'<div class="empty">Your favorites will appear here when connected to your account.</div>');
    if(path==="/profile") return App.page("Profile",'<div class="empty">Sign in to view your profile.</div><div style="margin-top:12px"><a class="btn btn-primary btn-small" href="#/login">Login</a></div>');
    if(path==="/activity") return App.page("Activity",'<div class="empty">No activity yet.</div>');
    if(path==="/settings") return App.page("Settings",'<div class="panel"><button class="btn btn-secondary btn-small" id="themeBtn">Toggle dark mode</button></div>');
    if(path.startsWith("/shop/")) return App.page("Shop",'<div class="empty">Seller shop details will load from the backend.</div>');
    if(path==="/admin") return App.page("Admin",'<div class="empty">Admin access is controlled by the backend. Sign in with an authorized admin account.</div>');
    return App.page("Page not found",'<div class="empty">The page you requested could not be found.</div>');
  }
};
window.addEventListener("hashchange",()=>Router.go());
document.addEventListener("DOMContentLoaded",()=>Router.go());
document.addEventListener("click",e=>{
  const fav=e.target.closest("[data-fav]"); if(fav){e.preventDefault();e.stopPropagation();fav.querySelector("i").classList.toggle("fa-regular");fav.querySelector("i").classList.toggle("fa-solid");}
});
document.getElementById("globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.value.trim())location.hash="/search?q="+encodeURIComponent(e.target.value.trim())});
document.getElementById("mobileMenuBtn").onclick=()=>location.hash="/profile";