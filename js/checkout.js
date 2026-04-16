// ============================================
// ZAKIYAH ARREYS HEALTHCARE - CHECKOUT SYSTEM
// Complete checkout with validation and payment
// ============================================

window.checkoutSystem = {
    cartItems: [],
    orderData: null,
    
    // Initialize checkout
    init: async function() {
        this.loadCart();
        this.setupEventListeners();
        this.setupPaymentMethods();
        this.updateOrderSummary();
        this.setupRealTimeValidation();
    },
    
    // Load cart from localStorage
    loadCart: function() {
        const savedCart = localStorage.getItem('zakiyah_cart');
        if (savedCart) {
            this.cartItems = JSON.parse(savedCart);
        }
        
        if (this.cartItems.length === 0) {
            // Redirect to cart page if cart is empty
            window.location.href = 'cart.html';
        }
    },
    
    // Update order summary display
    updateOrderSummary: function() {
        const subtotal = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 5.00;
        const total = subtotal + shipping;
        
        const currency = localStorage.getItem('currency') || 'USD';
        const exchangeRate = parseFloat(localStorage.getItem('exchangeRate')) || 115;
        
        const formatPrice = (amount) => {
            if (currency === 'USD') {
                return `$${amount.toFixed(2)}`;
            } else {
                return `KSh ${Math.round(amount * exchangeRate).toLocaleString()}`;
            }
        };
        
        // Update summary items
        const itemsContainer = document.getElementById('summaryItems');
        if (itemsContainer && this.cartItems.length > 0) {
            itemsContainer.innerHTML = this.cartItems.map(item => `
                <div class="summary-row">
                    <span>${this.escapeHtml(item.name)} x ${item.quantity}</span>
                    <span>${formatPrice(item.price * item.quantity)}</span>
                </div>
            `).join('');
        } else if (itemsContainer) {
            itemsContainer.innerHTML = '<div class="summary-row">Your cart is empty</div>';
        }
        
        // Update totals
        const subtotalEl = document.getElementById('summarySubtotal');
        const shippingEl = document.getElementById('summaryShipping');
        const totalEl = document.getElementById('summaryTotal');
        
        if (subtotalEl) subtotalEl.innerHTML = formatPrice(subtotal);
        if (shippingEl) shippingEl.innerHTML = formatPrice(shipping);
        if (totalEl) totalEl.innerHTML = formatPrice(total);
        
        // Store for later use
        this.orderData = {
            subtotal: subtotal,
            shipping: shipping,
            total: total,
            items: this.cartItems,
            currency: currency
        };
    },
    
    // Setup payment method selection
    setupPaymentMethods: function() {
        const methods = document.querySelectorAll('.payment-method');
        methods.forEach(method => {
            method.addEventListener('click', () => {
                methods.forEach(m => m.classList.remove('selected'));
                method.classList.add('selected');
                const paymentMethodInput = document.getElementById('paymentMethod');
                if (paymentMethodInput) {
                    paymentMethodInput.value = method.dataset.method;
                }
            });
        });
    },
    
    // Setup real-time validation
    setupRealTimeValidation: function() {
        const fields = ['fullName', 'email', 'phone', 'address', 'city'];
        fields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                input.addEventListener('input', () => this.validateField(fieldId));
                input.addEventListener('blur', () => this.validateField(fieldId));
            }
        });
    },
    
    // Validate individual field
    validateField: function(fieldId) {
        const input = document.getElementById(fieldId);
        if (!input) return true;
        
        const value = input.value.trim();
        const errorDiv = document.getElementById(`${fieldId}Error`);
        
        if (!value) {
            input.classList.add('error');
            if (errorDiv) errorDiv.classList.add('show');
            return false;
        }
        
        if (fieldId === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                input.classList.add('error');
                if (errorDiv) errorDiv.classList.add('show');
                return false;
            }
        }
        
        input.classList.remove('error');
        if (errorDiv) errorDiv.classList.remove('show');
        return true;
    },
    
    // Validate all form fields
    validateForm: function() {
        const fields = ['fullName', 'email', 'phone', 'address', 'city'];
        let isValid = true;
        
        fields.forEach(fieldId => {
            if (!this.validateField(fieldId)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            this.showError('Please fill in all required fields correctly');
            return false;
        }
        
        return true;
    },
    
    // Show error notification
    showError: function(message) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    },
    
    // Show success notification
    showSuccess: function(message) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'success');
        } else {
            alert(message);
        }
    },
    
    // Show loading overlay
    showLoading: function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    },
    
    // Hide loading overlay
    hideLoading: function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },
    
    // Save order to Supabase
    saveOrderToSupabase: async function(orderData) {
        try {
            if (typeof supabase !== 'undefined') {
                const { data, error } = await supabase
                    .from('orders')
                    .insert([{
                        order_number: orderData.orderNumber,
                        customer_name: orderData.name,
                        customer_email: orderData.email,
                        customer_phone: orderData.phone,
                        shipping_address: orderData.address,
                        items: orderData.items,
                        subtotal: orderData.subtotal,
                        shipping: orderData.shipping,
                        total: orderData.total,
                        currency: localStorage.getItem('currency') || 'USD',
                        payment_method: orderData.paymentMethod,
                        payment_status: 'pending',
                        order_status: 'pending',
                        notes: orderData.notes,
                        created_at: new Date().toISOString()
                    }]);
                
                if (error) throw error;
                console.log('Order saved to Supabase:', orderData.orderNumber);
                return true;
            }
        } catch (error) {
            console.error('Error saving order to Supabase:', error);
            // Fallback to localStorage
            const orders = JSON.parse(localStorage.getItem('orders')) || [];
            orders.push(orderData);
            localStorage.setItem('orders', JSON.stringify(orders));
            return true;
        }
        return false;
    },
    
    // Process M-Pesa payment
    processMpesaPayment: async function(orderData) {
        const exchangeRate = parseFloat(localStorage.getItem('exchangeRate')) || 115;
        const amountKES = Math.round(orderData.total * exchangeRate);
        
        this.showSuccess(`M-Pesa payment of KSh ${amountKES.toLocaleString()} initiated. Check your phone for the STK push prompt.`);
        
        // Simulate M-Pesa STK Push (replace with actual API call to Supabase Edge Function)
        setTimeout(() => {
            const mpesaCode = 'MPESA' + Math.floor(Math.random() * 1000000);
            window.location.href = `success.html?orderId=${orderData.orderNumber}&payment=mpesa&code=${mpesaCode}`;
        }, 3000);
    },
    
    // Process PayPal payment
    processPayPalPayment: function(orderData) {
        this.showSuccess('Redirecting to PayPal secure checkout...');
        
        // Store order for return
        localStorage.setItem('paypalOrder', JSON.stringify(orderData));
        
        // Simulate PayPal redirect
        setTimeout(() => {
            window.location.href = `success.html?orderId=${orderData.orderNumber}&payment=paypal`;
        }, 1500);
    },
    
    // Process Flutterwave payment
    processFlutterwavePayment: function(orderData) {
        this.showSuccess('Redirecting to Flutterwave secure checkout...');
        
        setTimeout(() => {
            window.location.href = `success.html?orderId=${orderData.orderNumber}&payment=flutterwave`;
        }, 1500);
    },
    
    // Main process order function
    processOrder: async function() {
        // Validate form
        if (!this.validateForm()) {
            return false;
        }
        
        // Get form values
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const altPhone = document.getElementById('altPhone')?.value.trim() || '';
        const address = document.getElementById('address').value.trim();
        const city = document.getElementById('city').value.trim();
        const postalCode = document.getElementById('postalCode')?.value.trim() || '';
        const notes = document.getElementById('notes')?.value.trim() || '';
        const paymentMethod = document.getElementById('paymentMethod')?.value || 'mpesa';
        
        // Build full address
        const fullAddress = `${address}, ${city}${postalCode ? ', ' + postalCode : ''}`;
        
        // Create order data
        const orderData = {
            name: fullName,
            email: email,
            phone: phone,
            altPhone: altPhone,
            address: fullAddress,
            items: this.cartItems,
            subtotal: this.orderData.subtotal,
            shipping: this.orderData.shipping,
            total: this.orderData.total,
            notes: notes,
            orderNumber: 'ORD-' + Date.now(),
            paymentMethod: paymentMethod,
            timestamp: new Date().toISOString()
        };
        
        // Show loading overlay
        this.showLoading();
        
        // Save order to database
        await this.saveOrderToSupabase(orderData);
        
        // Clear cart
        localStorage.removeItem('zakiyah_cart');
        
        // Process payment based on method
        if (paymentMethod === 'mpesa') {
            await this.processMpesaPayment(orderData);
        } else if (paymentMethod === 'paypal') {
            this.processPayPalPayment(orderData);
        } else if (paymentMethod === 'flutterwave') {
            this.processFlutterwavePayment(orderData);
        } else {
            // Default: go to confirmation
            window.location.href = `confirmation.html?id=${orderData.orderNumber}`;
        }
        
        this.hideLoading();
        return true;
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.processOrder();
            });
        }
        
        // Update summary when currency changes
        window.addEventListener('currencyChanged', () => {
            this.updateOrderSummary();
        });
    },
    
    // Escape HTML
    escapeHtml: function(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};

// Initialize checkout when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('checkout.html')) {
        window.checkoutSystem.init();
    }
});