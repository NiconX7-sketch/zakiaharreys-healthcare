// ============================================
// ZAKIYAH ARREYS HEALTHCARE - PAYMENT SYSTEM
// Flutterwave, PayPal, and M-Pesa STK Push
// ============================================

window.paymentSystem = {
    // Payment configurations (replace with your actual keys)
    config: {
        flutterwave: {
            public_key: 'FLWPUBK-xxxxxxxxxxxxxxxxxxxxx', // Replace with your Flutterwave public key
            encryption_key: 'xxxxxxxxxxxxxxxxxxxxx'      // Replace with your encryption key
        },
        paypal: {
            client_id: 'xxxxxxxxxxxxxxxxxxxxx'           // Replace with your PayPal client ID
        },
        mpesa: {
            shortcode: '174379',
            passkey: 'xxxxxxxxxxxxxxxxxxxxx',            // Replace with your M-Pesa passkey
            callback_url: 'https://yourdomain.com/api/mpesa/callback'
        }
    },
    
    // Current order being processed
    currentOrder: null,
    
    // Initialize payment methods
    init: function() {
        this.loadFlutterwave();
        this.loadPayPal();
    },
    
    // Load Flutterwave SDK
    loadFlutterwave: function() {
        if (!document.querySelector('script[src*="flutterwave"]')) {
            const script = document.createElement('script');
            script.src = 'https://checkout.flutterwave.com/v3.js';
            script.async = true;
            document.head.appendChild(script);
        }
    },
    
    // Load PayPal SDK
    loadPayPal: function() {
        if (!document.querySelector('script[src*="paypal"]')) {
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${this.config.paypal.client_id}&currency=USD`;
            script.async = true;
            document.head.appendChild(script);
        }
    },
    
    // Process payment based on method
    processPayment: async function(orderData, method) {
        this.currentOrder = orderData;
        
        switch(method) {
            case 'flutterwave':
                return this.processFlutterwave(orderData);
            case 'paypal':
                return this.processPayPal(orderData);
            case 'mpesa':
                return this.processMpesa(orderData);
            default:
                window.showNotification('Please select a payment method', 'error');
                return false;
        }
    },
    
    // Flutterwave Payment
    processFlutterwave: function(orderData) {
        return new Promise((resolve, reject) => {
            if (typeof FlutterwaveCheckout === 'undefined') {
                window.showNotification('Loading payment gateway...', 'info');
                setTimeout(() => this.processFlutterwave(orderData), 1000);
                return;
            }
            
            const totalAmount = orderData.total;
            const orderId = orderData.orderNumber || 'ORD-' + Date.now();
            
            FlutterwaveCheckout({
                public_key: this.config.flutterwave.public_key,
                tx_ref: orderId,
                amount: totalAmount,
                currency: 'USD',
                payment_options: 'card, mobilemoney, ussd',
                customer: {
                    email: orderData.email,
                    name: orderData.name,
                    phone_number: orderData.phone
                },
                customizations: {
                    title: 'Zakiyah Arreys Healthcare',
                    description: `Order #${orderId}`,
                    logo: '/images/logo.svg'
                },
                callback: async (response) => {
                    if (response.status === 'successful') {
                        await this.saveOrder(orderData, 'flutterwave', response.transaction_id);
                        window.location.href = `/success.html?orderId=${orderId}&tx_ref=${response.tx_ref}`;
                        resolve(true);
                    } else {
                        window.location.href = `/failure.html?orderId=${orderId}`;
                        reject(false);
                    }
                },
                onclose: () => {
                    window.location.href = `/failure.html?orderId=${orderId}`;
                    reject(false);
                }
            });
        });
    },
    
    // PayPal Payment
    processPayPal: function(orderData) {
        return new Promise((resolve, reject) => {
            const totalAmount = orderData.total;
            const orderId = orderData.orderNumber || 'ORD-' + Date.now();
            
            // Store order data for return
            localStorage.setItem('pendingPayPalOrder', JSON.stringify({
                ...orderData,
                orderId: orderId
            }));
            
            // Redirect to PayPal checkout page
            window.location.href = `/paypal-checkout.html?orderId=${orderId}&amount=${totalAmount}`;
            resolve(true);
        });
    },
    
    // M-Pesa STK Push Payment
    processMpesa: async function(orderData) {
        const phone = prompt('Enter M-Pesa phone number (e.g., 2547XXXXXXXX):');
        
        if (!phone || phone.length < 10) {
            window.showNotification('Please enter a valid phone number', 'error');
            return false;
        }
        
        window.showNotification('Initiating M-Pesa payment...', 'info');
        
        const orderId = orderData.orderNumber || 'ORD-' + Date.now();
        const totalAmount = Math.round(orderData.total * (window.currencySystem?.exchangeRate || 115));
        
        try {
            // Store order for callback
            await this.saveOrder(orderData, 'mpesa', null);
            
            // This would call your Supabase Edge Function
            // For now, simulate M-Pesa prompt
            window.showNotification(`Please enter M-Pesa PIN to complete payment of KSh ${totalAmount.toLocaleString()}`, 'info');
            
            // Simulate successful payment after 5 seconds (remove in production)
            setTimeout(async () => {
                const mpesaCode = 'MPESA' + Math.floor(Math.random() * 1000000);
                await this.updateOrderPayment(orderId, 'completed', mpesaCode);
                window.location.href = `/success.html?orderId=${orderId}&payment=mpesa`;
            }, 5000);
            
            return true;
        } catch (error) {
            console.error('M-Pesa error:', error);
            window.showNotification('M-Pesa payment failed. Please try again.', 'error');
            return false;
        }
    },
    
    // Save order to Supabase
    saveOrder: async function(orderData, paymentMethod, transactionId) {
        const orderNumber = 'ORD-' + Date.now();
        
        const orderRecord = {
            order_number: orderNumber,
            customer_name: orderData.name,
            customer_email: orderData.email,
            customer_phone: orderData.phone,
            shipping_address: orderData.address,
            items: orderData.items,
            subtotal: orderData.subtotal,
            shipping: orderData.shipping || 5,
            total: orderData.total,
            currency: window.currencySystem?.currentCurrency || 'USD',
            payment_method: paymentMethod,
            payment_status: 'pending',
            order_status: 'pending',
            transaction_id: transactionId,
            created_at: new Date().toISOString()
        };
        
        try {
            if (window.supabase) {
                const { data, error } = await supabase
                    .from('orders')
                    .insert([orderRecord])
                    .select();
                
                if (error) throw error;
                
                // Store order ID for reference
                localStorage.setItem('lastOrderId', orderNumber);
                return data;
            }
        } catch (error) {
            console.error('Error saving order:', error);
            // Fallback to localStorage
            const orders = JSON.parse(localStorage.getItem('orders')) || [];
            orders.push(orderRecord);
            localStorage.setItem('orders', JSON.stringify(orders));
            localStorage.setItem('lastOrderId', orderNumber);
        }
        
        return orderRecord;
    },
    
    // Update order payment status
    updateOrderPayment: async function(orderId, status, mpesaCode = null) {
        try {
            if (window.supabase) {
                const updateData = { payment_status: status };
                if (mpesaCode) updateData.mpesa_code = mpesaCode;
                
                await supabase
                    .from('orders')
                    .update(updateData)
                    .eq('order_number', orderId);
            }
        } catch (error) {
            console.error('Error updating order:', error);
        }
    },
    
    // Verify payment (for callback pages)
    verifyPayment: async function(orderId, transactionId = null) {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('order_number', orderId)
                .single();
            
            if (error) throw error;
            
            return data;
        } catch (error) {
            // Check localStorage
            const orders = JSON.parse(localStorage.getItem('orders')) || [];
            return orders.find(o => o.order_number === orderId);
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    window.paymentSystem.init();
});

// Make available globally
window.paymentSystem = window.paymentSystem;