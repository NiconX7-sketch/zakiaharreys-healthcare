// ============================================
// VISITOR TRACKING SYSTEM - FIXED VERSION
// ============================================

const VisitorTracker = {
    visitorId: null,
    
    init: function() {
        console.log('Visitor Tracker initializing...');
        this.getOrCreateVisitorId();
        this.trackPageView();
    },
    
    getOrCreateVisitorId: function() {
        let id = localStorage.getItem('visitor_id');
        if (!id) {
            id = 'vis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('visitor_id', id);
            console.log('New visitor ID created:', id);
        } else {
            console.log('Existing visitor ID:', id);
        }
        this.visitorId = id;
        return id;
    },
    
    getDeviceInfo: function() {
        const ua = navigator.userAgent;
        let device = 'Desktop';
        let browser = 'Unknown';
        
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) device = 'Tablet';
        else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle/i.test(ua)) device = 'Mobile';
        
        if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
        else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
        else if (ua.indexOf('Safari') > -1) browser = 'Safari';
        else if (ua.indexOf('Edge') > -1) browser = 'Edge';
        
        return { device, browser };
    },
    
    trackPageView: function() {
        if (!window.supabase) {
            console.log('Waiting for Supabase...');
            setTimeout(() => this.trackPageView(), 1000);
            return;
        }
        
        const deviceInfo = this.getDeviceInfo();
        
        // Track visitor using upsert
        window.supabase.from('visitors').upsert({
            visitor_id: this.visitorId,
            device_type: deviceInfo.device,
            browser: deviceInfo.browser,
            last_visit: new Date().toISOString()
        }, { onConflict: 'visitor_id' }).then(result => {
            console.log('Visitor tracked:', result);
        }).catch(error => {
            console.error('Visitor track error:', error);
        });
        
        // Track page view
        window.supabase.from('page_views').insert([{
            visitor_id: this.visitorId,
            page_url: window.location.pathname,
            page_title: document.title,
            referrer: document.referrer || 'direct',
            viewed_at: new Date().toISOString()
        }]).then(result => {
            console.log('Page view tracked:', result);
        }).catch(error => {
            console.error('Page view error:', error);
        });
    }
};

// Initialize when ready
if (window.supabase) {
    VisitorTracker.init();
} else {
    document.addEventListener('supabaseReady', () => {
        VisitorTracker.init();
    });
    // Also try after a short delay
    setTimeout(() => {
        if (window.supabase && !VisitorTracker.visitorId) {
            VisitorTracker.init();
        }
    }, 2000);
}
