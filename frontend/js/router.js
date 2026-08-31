class Router {
    constructor() {
        this.routes = {};
        this.currentPage = 'home';
        this.currentParams = {};
    }

    addRoute(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path, params = {}) {
        // Update URL
        window.history.pushState({}, '', path);
        this.currentParams = params;
        this.handleRoute(path);
    }

    handleRoute(path) {
        // Remove leading slash
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        
        // Check for dynamic routes
        let matchedRoute = null;
        let matchedParams = {};

        for (const [routePath, handler] of Object.entries(this.routes)) {
            const routeParts = routePath.split('/');
            const pathParts = cleanPath.split('/');
            
            if (routeParts.length !== pathParts.length) continue;
            
            let match = true;
            const params = {};
            
            for (let i = 0; i < routeParts.length; i++) {
                if (routeParts[i].startsWith(':')) {
                    params[routeParts[i].slice(1)] = pathParts[i];
                } else if (routeParts[i] !== pathParts[i]) {
                    match = false;
                    break;
                }
            }
            
            if (match) {
                matchedRoute = routePath;
                matchedParams = params;
                break;
            }
        }

        if (matchedRoute && this.routes[matchedRoute]) {
            this.currentPage = matchedRoute;
            this.currentParams = { ...this.currentParams, ...matchedParams };
            this.routes[matchedRoute](this.currentParams);
        } else if (this.routes['*']) {
            this.routes['*'](cleanPath);
        }
    }

    getCurrentPath() {
        return window.location.pathname;
    }

    getParams() {
        return this.currentParams;
    }
}

// Create global router instance
const router = new Router();