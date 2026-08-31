// ========================================
// SHINEX MARKETPLACE — ROUTER
// ========================================

class Router {
    constructor() {
        this.routes = {};
        this.currentPath = '';
        this.params = {};
    }

    /**
     * Register a route
     */
    add(path, handler) {
        this.routes[path] = handler;
        return this;
    }

    /**
     * Navigate to a route
     */
    navigate(path, params = {}) {
        // Update URL hash
        window.location.hash = path;
        this.currentPath = path;
        this.params = params;
        this.render();
    }

    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.currentPath || window.location.hash.slice(1) || '/';
    }

    /**
     * Get route params
     */
    getParams() {
        return this.params;
    }

    /**
     * Render current route
     */
    render() {
        const path = this.getCurrentRoute();
        const handler = this.routes[path];

        if (handler) {
            handler(this.params);
        } else {
            // Check for dynamic routes
            for (const [route, handlerFn] of Object.entries(this.routes)) {
                if (route.includes(':')) {
                    const pattern = route.replace(/:[^/]+/g, '([^/]+)');
                    const regex = new RegExp(`^${pattern}$`);
                    const match = path.match(regex);
                    if (match) {
                        const keys = route.match(/:[^/]+/g).map(k => k.slice(1));
                        const params = {};
                        keys.forEach((key, i) => {
                            params[key] = match[i + 1];
                        });
                        handlerFn(params);
                        return;
                    }
                }
            }
            // 404
            this.show404();
        }
    }

    /**
     * Show 404 page
     */
    show404() {
        const main = document.getElementById('main-content');
        if (!main) return;

        main.innerHTML = `
            <div class="container page-container">
                <div class="empty-state">
                    <i class="fas fa-map-signs"></i>
                    <h3>Page Not Found</h3>
                    <p>The page you're looking for doesn't exist.</p>
                    <button class="btn btn-primary" onclick="router.navigate('/')">
                        <i class="fas fa-home"></i> Go Home
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Initialize router
     */
    init() {
        window.addEventListener('hashchange', () => {
            this.render();
        });

        // Handle initial load
        if (!window.location.hash) {
            window.location.hash = '/';
        }

        this.render();
    }
}

// Create router instance
const router = new Router();
