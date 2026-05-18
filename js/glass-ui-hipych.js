// Legacy compatibility for old cached loaders. The public Hipych widget was replaced by the safe health assistant.
(function () {
    function bindAlias() {
        if (window.glassUIHealth) {
            window.glassUIHipych = window.glassUIHealth;
        }
    }

    function loadHealthWidget() {
        bindAlias();
        if (window.glassUIHealth) return;

        const existingScript = document.querySelector('script[src*="glass-ui-health.js"]');
        if (existingScript) {
            existingScript.addEventListener('load', bindAlias, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'js/glass-ui-health.js?v=20260518-wellness-bro-ui';
        script.defer = true;
        script.onload = bindAlias;
        script.onerror = () => console.warn('[health-widget] failed to load legacy alias target');
        document.body.appendChild(script);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadHealthWidget);
    } else {
        loadHealthWidget();
    }
})();
