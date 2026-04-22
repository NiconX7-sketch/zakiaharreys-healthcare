// ============================================
// CART SYSTEM - COMPLETE WORKING VERSION
// ============================================

const CartSystem = {
    items: [],
    
    // Load cart from localStorage
    load: function() {
        const saved = localStorage.getItem('zakiyah_cart');
        if (saved) {
            this.items = JSON.parse(saved);
        } else {
            this.items = [];
        }
        this.updateCount();
        return this.items;
    },
    
    // Save cart to localStorage
    save: function() {
        localStorage.setItem('zakiyah_cart', JSON.stringify(this.items));
        this.updateCount();
    },
    
    // Add item to cart
    addItem: function(id, name, price, image) {
        const existing = this.items.find(item => item.id === id);
        
        if (existing) {
            existing.quantity += 1;
        } else {
            this.items.push({
                id: id,
                name: name,
                price: parseFloat(price),
                image: image,
                quantity: 1
            });
        }
        
        this.save();
        this.showNotification(`${name} added to cart!`);
        return true;
    },
    
    // Remove item from cart
    removeItem: function(id) {
        const item = this.items.find(i => i.id === id);
        const name = item ? item.name : 'Item';
        this.items = this.items.filter(item => item.id !== id);
        this.save();
        this.showNotification(`${name} removed from cart`);
        
        if (typeof window.updateCartPage === 'function') {
            window.updateCartPage();
        }
        return true;
    },
    
    // Update quantity
    updateQuantity: function(id, quantity) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            quantity = parseInt(quantity);
            if (quantity <= 0) {
                this.removeItem(id);
            } else {
                item.quantity = quantity;
                this.save();
                if (typeof window.updateCartPage === 'function') {
                    window.updateCartPage();
                }
            }
        }
        return true;
    },
    
    // Get subtotal
    getSubtotal: function() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },
    
    // Get total with shipping
    getTotal: function() {
        return this.getSubtotal() + 5;
    },
    
    // Get item count
    getItemCount: function() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    
    // Clear cart
    clear: function() {
        this.items = [];
        this.save();
        if (typeof window.updateCartPage === 'function') {
            window.updateCartPage();
        }
        this.showNotification('Cart cleared');
    },
    
    // Update cart count badge
    updateCount: function() {
        const count = this.getItemCount();
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = count;
        });
    },
    
    // Render cart page
    renderCartPage: function() {
        const container = document.getElementById('cartItemsContainer');
        const summary = document.getElementById('cartSummary');
        
        if (!container) return;
        
        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="empty-cart" style="text-align:center;padding:60px;">
                    <i class="fas fa-shopping-cart fa-4x" style="color:#ccc;margin-bottom:20px;"></i>
                    <h3>Your cart is empty</h3>
                    <p>Looks like you haven't added any items to your cart yet.</p>
                    <a href="products.html" class="btn btn-primary" style="margin-top:20px;">Continue Shopping</a>
                </div>
            `;
            if (summary) summary.innerHTML = '';
            return;
        }
        
        const formatPrice = (usd) => {
            const currency = localStorage.getItem('currency') || 'USD';
            const rate = parseFloat(localStorage.getItem('exchangeRate')) || 115;
            if (currency === 'USD') {
                return `$${usd.toFixed(2)}`;
            } else {
                return `KSh ${Math.round(usd * rate).toLocaleString()}`;
            }
        };
        
        // Render cart items
        container.innerHTML = `
            <div class="cart-header" style="display:grid;grid-template-columns:3fr 1fr 1fr 0.5fr;background:#f5f5f5;padding:15px;font-weight:600;border-radius:8px;margin-bottom:10px;">
                <div>Product</div><div>Price</div><div>Quantity</div><div>Total</div>
            </div>
            ${this.items.map(item => `
                <div class="cart-item" style="display:grid;grid-template-columns:3fr 1fr 1fr 0.5fr;padding:20px;border-bottom:1px solid #eee;align-items:center;">
                    <div style="display:flex;gap:15px;align-items:center;">
                        <img src="${item.image || 'https://images.unsplash.com/photo-1584017911766-451b3d0e8434?w=80'}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
                        <span style="font-weight:500;">${this.escapeHtml(item.name)}</span>
                    </div>
                    <div>${formatPrice(item.price)}</div>
                    <div><input type="number" value="${item.quantity}" min="1" style="width:60px;padding:8px;text-align:center;border:1px solid #ddd;border-radius:5px;" onchange="cartSystem.updateQuantity(${item.id}, this.value)"></div>
                    <div>${formatPrice(item.price * item.quantity)}</div>
                    <div><button onclick="cartSystem.removeItem(${item.id})" style="background:none;border:none;color:#dc3545;cursor:pointer;font-size:1.2rem;"><i class="fas fa-trash-alt"></i></button></div>
                </div>
            `).join('')}
        `;
        
        // Render summary
        if (summary) {
            const subtotal = this.getSubtotal();
            const shipping = 5;
            const total = this.getTotal();
            
            summary.innerHTML = `
                <h3 style="margin-bottom:20px;color:#2e7d32;">Order Summary</h3>
                <div class="summary-row" style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;">
                    <span>Subtotal</span><span>${formatPrice(subtotal)}</span>
                </div>
                <div class="summary-row" style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;">
                    <span>Shipping</span><span>${formatPrice(shipping)}</span>
                </div>
                <div class="summary-total" style="display:flex;justify-content:space-between;padding:15px 0;font-weight:bold;font-size:1.2rem;color:#2e7d32;border-top:2px solid #2e7d32;margin-top:10px;">
                    <span>Total</span><span>${formatPrice(total)}</span>
                </div>
                <button class="btn btn-primary checkout-btn" style="width:100%;margin-top:20px;padding:15px;" onclick="location.href='checkout.html'">
                    Proceed to Checkout
                </button>
                <button class="btn btn-secondary" style="width:100%;margin-top:10px;padding:15px;" onclick="location.href='products.html'">
                    Continue Shopping
                </button>
            `;
        }
    },
    
    // Show notification
    showNotification: function(message) {
        const notification = document.createElement('div');
        notification.className = 'toast-notification';
        notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        notification.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#2e7d32;color:white;padding:12px 20px;border-radius:8px;z-index:10000;animation:slideIn 0.3s;';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    },
    
    // Escape HTML
    escapeHtml: function(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
};

// Initialize cart
document.addEventListener('DOMContentLoaded', function() {
    CartSystem.load();
});

// Make available globally
window.cartSystem = CartSystem;
window.updateCartPage = function() { CartSystem.renderCartPage(); };
