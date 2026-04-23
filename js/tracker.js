// ============================================
// VISITOR TRACKING SYSTEM
// ============================================

const VisitorTracker = {
    visitorId: null,
    tracked: false,
    
    init: function() {
        if (this.tracked) return;
        this.getOrCreateVisitorId();
        this.trackPageView();
        this.tracked = true;
    },
    
    getOrCreateVisitorId: function() {
        let id = localStorage.getItem('visitor_id');
        if (!id) {
            id = 'vis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('visitor_id', id);
        }
        this.visitorId = id;
        return id;
    },
    
    getDeviceInfo: function() {
        const ua = navigator.userAgent;
        let device = 'Desktop';
        let os = 'Unknown';
        let browser = 'Unknown';
        
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) device = 'Tablet';
        else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle/i.test(ua)) device = 'Mobile';
        
        if (ua.indexOf('Windows') > -1) os = 'Windows';
        else if (ua.indexOf('Mac') > -1) os = 'MacOS';
        else if (ua.indexOf('Linux') > -1) os = 'Linux';
        else if (ua.indexOf('Android') > -1) os = 'Android';
        else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1) os = 'iOS';
        
        if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
        else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
        else if (ua.indexOf('Safari') > -1) browser = 'Safari';
        else if (ua.indexOf('Edge') > -1) browser = 'Edge';
        
        return { device, os, browser };
    },
    
    trackPageView: function() {
        if (!window.supabase) {
            setTimeout(() => this.trackPageView(), 500);
            return;
        }
        
        const deviceInfo = this.getDeviceInfo();
        
        // Track visitor
        window.supabase.from('visitors').upsert({
            visitor_id: this.visitorId,
            user_agent: navigator.userAgent,
            device_type: deviceInfo.device,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            last_visit: new Date().toISOString()
        }, { onConflict: 'visitor_id' }).catch(err => console.log('Visitor track error:', err));
        
        // Track page view
        window.supabase.from('page_views').insert([{
            visitor_id: this.visitorId,
            page_url: window.location.pathname,
            page_title: document.title,
            referrer: document.referrer || 'direct',
            viewed_at: new Date().toISOString()
        }]).catch(err => console.log('Page view error:', err));
    }
};

// Initialize when ready
if (window.supabase) {
    VisitorTracker.init();
} else {
    document.addEventListener('supabaseReady', () => VisitorTracker.init());
}
