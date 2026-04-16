// Cart System
const CartSystem = {
    items: [],
    
    load: function() {
        const saved = localStorage.getItem('zakiyah_cart');
        this.items = saved ? JSON.parse(saved) : [];
        this.updateCount();
        return this.items;
    },
    
    save: function() {
        localStorage.setItem('zakiyah_cart', JSON.stringify(this.items));
        this.updateCount();
    },
    
    addItem: function(id, name, price, image) {
        const existing = this.items.find(i => i.id === id);
        if (existing) existing.quantity++;
        else this.items.push({ id, name, price, image, quantity: 1 });
        this.save();
        this.showNotification(`${name} added to cart!`);
    },
    
    removeItem: function(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.save();
        this.showNotification('Item removed');
        if (typeof window.updateCartPage === 'function') window.updateCartPage();
    },
    
    updateQuantity: function(id, qty) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            qty = parseInt(qty);
            if (qty <= 0) this.removeItem(id);
            else { item.quantity = qty; this.save(); }
            if (typeof window.updateCartPage === 'function') window.updateCartPage();
        }
    },
    
    getSubtotal: function() { return this.items.reduce((s, i) => s + (i.price * i.quantity), 0); },
    getTotal: function() { return this.getSubtotal() + 5; },
    getCount: function() { return this.items.reduce((s, i) => s + i.quantity, 0); },
    
    updateCount: function() {
        const count = this.getCount();
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
    },
    
    clear: function() { this.items = []; this.save(); },
    
    renderCartPage: function() {
        const container = document.getElementById('cart-items-container');
        const summary = document.getElementById('cart-summary');
        if (!container) return;
        
        if (this.items.length === 0) {
            container.innerHTML = `<div class="empty-cart" style="text-align:center;padding:60px;"><i class="fas fa-shopping-cart fa-4x"></i><h3>Your cart is empty</h3><a href="products.html" class="btn btn-primary">Continue Shopping</a></div>`;
            if (summary) summary.innerHTML = '';
            return;
        }
        
        const format = (usd) => window.currencySystem ? window.currencySystem.format(usd) : `$${usd.toFixed(2)}`;
        container.innerHTML = `<div class="cart-header" style="display:grid;grid-template-columns:3fr 1fr 1fr 0.5fr;background:#f5f5f5;padding:15px;font-weight:600;"><div>Product</div><div>Price</div><div>Quantity</div><div>Total</div></div>` +
            this.items.map(item => `<div class="cart-item" style="display:grid;grid-template-columns:3fr 1fr 1fr 0.5fr;padding:20px;border-bottom:1px solid #eee;align-items:center;">
                <div style="display:flex;gap:15px;"><img src="${item.image || 'https://images.unsplash.com/photo-1584017911766-451b3d0e8434?w=80'}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;"><span>${this.escapeHtml(item.name)}</span></div>
                <div>${format(item.price)}</div>
                <div><input type="number" value="${item.quantity}" min="1" style="width:60px;padding:5px;" onchange="cartSystem.updateQuantity(${item.id}, this.value)"></div>
                <div>${format(item.price * item.quantity)}</div>
                <div><button onclick="cartSystem.removeItem(${item.id})" style="background:none;border:none;color:#dc3545;cursor:pointer;"><i class="fas fa-trash"></i></button></div>
            </div>`).join('');
        
        if (summary) {
            const subtotal = this.getSubtotal();
            const total = this.getTotal();
            summary.innerHTML = `<div style="background:white;padding:25px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1);position:sticky;top:100px;"><h3 style="margin-bottom:20px;">Order Summary</h3>
                <div style="display:flex;justify-content:space-between;padding:10px 0;"><span>Subtotal</span><span>${format(subtotal)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:10px 0;"><span>Shipping</span><span>${format(5)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:15px 0;font-weight:bold;font-size:1.2rem;border-top:2px solid #2e7d32;"><span>Total</span><span>${format(total)}</span></div>
                <button class="btn btn-primary" style="width:100%;" onclick="location.href='checkout.html'">Proceed to Checkout</button>
                <button class="btn btn-secondary" style="width:100%;margin-top:10px;" onclick="location.href='products.html'">Continue Shopping</button></div>`;
        }
    },
    
    escapeHtml: function(s) { if (!s) return ''; return s.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); },
    showNotification: function(msg) { const n = document.createElement('div'); n.className = 'toast-notification'; n.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`; document.body.appendChild(n); setTimeout(() => n.remove(), 3000); }
};

document.addEventListener('DOMContentLoaded', () => { CartSystem.load(); });
window.cartSystem = CartSystem;
window.updateCartPage = () => CartSystem.renderCartPage();