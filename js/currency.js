// ============================================
// CURRENCY SYSTEM - USD / KES CONVERTER
// ============================================

const CurrencySystem = {
    currentCurrency: 'USD',  // FORCE USD as default
    exchangeRate: 115,
    
    init: function() {
        console.log('Currency system initializing...');
        
        // Force USD as default - ignore saved preference for now
        this.currentCurrency = 'USD';
        localStorage.setItem('currency', 'USD');
        
        // Load exchange rate from storage
        const cachedRate = localStorage.getItem('exchangeRate');
        if (cachedRate) {
            this.exchangeRate = parseFloat(cachedRate);
        }
        
        // Update all prices to USD first
        this.updateAllPrices();
        
        // Setup button listeners
        this.setupButtons();
        
        console.log('Currency system ready. Current currency:', this.currentCurrency);
    },
    
    setupButtons: function() {
        const buttons = document.querySelectorAll('.currency-btn');
        console.log('Found currency buttons:', buttons.length);
        
        buttons.forEach(btn => {
            // Remove existing listener
            btn.removeEventListener('click', this.handleClick);
            btn.addEventListener('click', this.handleClick.bind(this));
            
            // Update active state - USD should be active by default
            const btnCurrency = btn.getAttribute('data-currency');
            if (btnCurrency === this.currentCurrency) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },
    
    handleClick: function(event) {
        const btn = event.currentTarget;
        const currency = btn.getAttribute('data-currency');
        console.log('Button clicked:', currency);
        
        if (currency && currency !== this.currentCurrency) {
            this.setCurrency(currency);
        }
    },
    
    setCurrency: function(currency) {
        console.log('Switching currency from', this.currentCurrency, 'to', currency);
        
        this.currentCurrency = currency;
        localStorage.setItem('currency', currency);
        
        // Update button active states
        document.querySelectorAll('.currency-btn').forEach(btn => {
            const btnCurrency = btn.getAttribute('data-currency');
            if (btnCurrency === currency) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update all prices
        this.updateAllPrices();
        
        // Show notification
        this.showNotification('Currency switched to ' + currency);
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { currency: currency } }));
    },
    
    convert: function(usdAmount) {
        if (this.currentCurrency === 'USD') {
            return usdAmount;
        } else {
            return Math.round(usdAmount * this.exchangeRate);
        }
    },
    
    format: function(usdAmount) {
        const converted = this.convert(usdAmount);
        if (this.currentCurrency === 'USD') {
            return '$' + converted.toFixed(2);
        } else {
            return 'KSh ' + converted.toLocaleString();
        }
    },
    
    updateAllPrices: function() {
        console.log('Updating all prices to', this.currentCurrency);
        
        // Find all price elements and update them
        const priceElements = document.querySelectorAll('.product-price, .cart-price, .cart-total, .program-price, .summary-row span:last-child, .summary-total span:last-child');
        
        priceElements.forEach(el => {
            // Try to get USD value from data-usd attribute first
            let usdAmount = el.getAttribute('data-usd');
            
            if (!usdAmount) {
                // Try to extract from text content
                const usdMatch = el.textContent.match(/\$([0-9.]+)/);
                if (usdMatch) {
                    usdAmount = usdMatch[1];
                }
            }
            
            if (usdAmount) {
                const usd = parseFloat(usdAmount);
                if (!isNaN(usd)) {
                    el.innerHTML = this.format(usd);
                    // Store USD value for future conversions
                    el.setAttribute('data-usd', usd);
                }
            }
        });
        
        // Refresh cart display
        if (typeof window.cartSystem !== 'undefined' && window.cartSystem.renderCartPage) {
            window.cartSystem.renderCartPage();
        }
        
        // Refresh checkout totals
        if (typeof window.updateOrderSummary === 'function') {
            window.updateOrderSummary();
        }
    },
    
    showNotification: function(message) {
        const notification = document.createElement('div');
        notification.className = 'toast-notification';
        notification.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;
        notification.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#2e7d32;color:white;padding:12px 20px;border-radius:8px;z-index:10000;animation:slideIn 0.3s;';
        document.body.appendChild(notification);
        setTimeout(function() { notification.remove(); }, 3000);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        CurrencySystem.init();
    }, 100);
});

// Make available globally
window.currencySystem = CurrencySystem;
window.setCurrency = function(currency) { CurrencySystem.setCurrency(currency); };