// ============================================
// CURRENCY SYSTEM - USD / KES CONVERTER
// ============================================

const CurrencySystem = {
    currentCurrency: 'USD',
    exchangeRate: 115,
    
    init: function() {
        const saved = localStorage.getItem('currency');
        if (saved === 'USD' || saved === 'KES') {
            this.currentCurrency = saved;
        }
        
        const cachedRate = localStorage.getItem('exchangeRate');
        if (cachedRate) {
            this.exchangeRate = parseFloat(cachedRate);
        }
        
        this.updateAllPrices();
        this.setupButtons();
        console.log('Currency ready:', this.currentCurrency);
    },
    
    setupButtons: function() {
        document.querySelectorAll('.currency-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleClick);
            btn.addEventListener('click', this.handleClick.bind(this));
            
            if (btn.getAttribute('data-currency') === this.currentCurrency) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },
    
    handleClick: function(event) {
        const currency = event.currentTarget.getAttribute('data-currency');
        if (currency && currency !== this.currentCurrency) {
            this.setCurrency(currency);
        }
    },
    
    setCurrency: function(currency) {
        this.currentCurrency = currency;
        localStorage.setItem('currency', currency);
        this.updateAllPrices();
        this.setupButtons();
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
        document.querySelectorAll('.product-price, .cart-price, .cart-total, .program-price').forEach(el => {
            const match = el.textContent.match(/\$([0-9.]+)/);
            if (match) {
                const usd = parseFloat(match[1]);
                if (!isNaN(usd)) {
                    el.innerHTML = this.format(usd);
                }
            }
        });
        
        if (typeof window.cartSystem !== 'undefined' && window.cartSystem.renderCartPage) {
            window.cartSystem.renderCartPage();
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    CurrencySystem.init();
});

window.currencySystem = CurrencySystem;
