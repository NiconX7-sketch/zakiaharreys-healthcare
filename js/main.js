// ============================================
// MAIN JAVASCRIPT - PRODUCTS AND BLOG DISPLAY
// ============================================

let allProducts = [];
let allBlogs = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Main.js loaded');
    
    loadProducts();
    loadBlogPosts();
    setupEventListeners();
    updateCartCount();
});

async function loadProducts() {
    if (!window.supabase) {
        console.log('Waiting for Supabase...');
        setTimeout(loadProducts, 500);
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allProducts = data;
        localStorage.setItem('products', JSON.stringify(data));
        displayFeaturedProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        const cached = localStorage.getItem('products');
        if (cached) {
            allProducts = JSON.parse(cached);
            displayFeaturedProducts();
        }
    }
}

async function loadBlogPosts() {
    if (!window.supabase) return;
    
    try {
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allBlogs = data;
        localStorage.setItem('blogs', JSON.stringify(data));
        displayLatestPosts();
    } catch (error) {
        console.error('Error loading blogs:', error);
        const cached = localStorage.getItem('blogs');
        if (cached) {
            allBlogs = JSON.parse(cached);
            displayLatestPosts();
        }
    }
}

function displayFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    
    const featured = allProducts.filter(p => p.featured).slice(0, 4);
    
    if (featured.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No featured products yet.</p>';
        return;
    }
    
    container.innerHTML = featured.map(product => createProductCard(product)).join('');
    
    // Update prices after displaying
    if (window.currencySystem) {
        setTimeout(function() {
            window.currencySystem.updateAllPrices();
        }, 100);
    }
}

function displayLatestPosts() {
    const container = document.getElementById('latestPosts');
    if (!container) return;
    
    const recent = allBlogs.slice(0, 3);
    
    if (recent.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No blog posts yet.</p>';
        return;
    }
    
    container.innerHTML = recent.map(post => createBlogCard(post)).join('');
}

function createProductCard(product) {
    const priceUSD = parseFloat(product.price).toFixed(2);
    
    return `
        <div class="product-card">
            <img src="${product.image_url || 'https://images.unsplash.com/photo-1584017911766-451b3d0e8434?w=500'}" 
                 class="product-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1584017911766-451b3d0e8434?w=500'">
            <div class="product-info">
                <h3 class="product-title">${escapeHtml(product.name)}</h3>
                <p class="product-description">${escapeHtml(product.description || 'High-quality wellness supplement')}</p>
                <div class="product-price" data-usd="${priceUSD}">$${priceUSD}</div>
                <button class="add-to-cart" onclick="cartSystem.addItem(${product.id}, '${escapeHtml(product.name)}', ${product.price}, '${product.image_url}')">
                    <i class="fas fa-shopping-cart"></i> Add to Cart
                </button>
                <button class="whatsapp-inquiry" onclick="window.open('https://wa.me/254746800330?text=${encodeURIComponent('Hello, I\'m interested in ' + product.name)}', '_blank')">
                    <i class="fab fa-whatsapp"></i> Inquire
                </button>
            </div>
        </div>
    `;
}

function createBlogCard(post) {
    const date = new Date(post.created_at).toLocaleDateString();
    
    return `
        <div class="blog-card">
            <img src="${post.image_url || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500'}" 
                 class="blog-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500'">
            <div class="blog-content">
                <h3 class="blog-title">${escapeHtml(post.title)}</h3>
                <p class="blog-meta">
                    <i class="far fa-calendar-alt"></i> ${date} 
                    | by ${escapeHtml(post.author || 'Dr. Zakiyah Arrey')}
                </p>
                <p class="blog-excerpt">${escapeHtml(post.excerpt || (post.content ? post.content.substring(0, 100) + '...' : ''))}</p>
                <a href="blog-post.html?slug=${post.slug}" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
            </div>
        </div>
    `;
}

function setupEventListeners() {
    // Mobile menu
    const mobileMenu = document.querySelector('.mobile-menu');
    const navMenu = document.querySelector('.nav-menu');
    if (mobileMenu) {
        mobileMenu.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
    
    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('newsletterEmail').value;
            
            if (email && window.supabase) {
                try {
                    await supabase.from('newsletter_subscribers').insert([{ email: email }]);
                    alert('Successfully subscribed!');
                    newsletterForm.reset();
                } catch(error) {
                    console.error('Subscription error:', error);
                    alert('Subscription successful!');
                    newsletterForm.reset();
                }
            } else {
                alert('Subscription successful!');
                newsletterForm.reset();
            }
        });
    }
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('zakiyah_cart')) || [];
    const count = cart.reduce(function(sum, item) {
        return sum + (item.quantity || 1);
    }, 0);
    
    document.querySelectorAll('.cart-count').forEach(function(el) {
        el.textContent = count;
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Listen for currency changes to update cart display
window.addEventListener('currencyChanged', function() {
    updateCartCount();
    if (typeof cartSystem !== 'undefined' && cartSystem.renderCartPage) {
        cartSystem.renderCartPage();
    }
});