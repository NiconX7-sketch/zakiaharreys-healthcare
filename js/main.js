// ============================================
// MAIN JAVASCRIPT - COMPLETE WORKING
// ============================================

let allProducts = [];
let allBlogs = [];

function loadAllData() {
    if (!window.supabase) {
        setTimeout(loadAllData, 500);
        return;
    }
    
    console.log('Loading website data...');
    
    Promise.all([
        window.supabase.from('products').select('*').order('created_at', { ascending: false }),
        window.supabase.from('blog_posts').select('*').eq('published', true).order('created_at', { ascending: false })
    ]).then(([productsRes, blogsRes]) => {
        if (productsRes.data) allProducts = productsRes.data;
        if (blogsRes.data) allBlogs = blogsRes.data;
        
        console.log(`Loaded ${allProducts.length} products and ${allBlogs.length} blogs`);
        
        displayCategories();
        displayFeaturedProducts();
        displayLatestPosts();
        loadLogoSettings();
    }).catch(err => {
        console.error('Error loading data:', err);
        document.getElementById('featuredProducts').innerHTML = '<p style="text-align:center;color:#dc3545;">Error loading products. Please refresh.</p>';
    });
}

function displayCategories() {
    const container = document.getElementById('categoryGrid');
    if (!container) return;
    
    const categories = ['Immune Boosters', 'Bone and Joint Care', 'Reproductive Health', 'Cardiovascular Health', 'Digestive Health', 'Personal Care', 'Better Life', "Children's Nutrition"];
    const icons = {
        'Immune Boosters': 'fa-shield-virus',
        'Bone and Joint Care': 'fa-bone',
        'Reproductive Health': 'fa-venus-mars',
        'Cardiovascular Health': 'fa-heart-pulse',
        'Digestive Health': 'fa-stethoscope',
        'Personal Care': 'fa-hand-sparkles',
        'Better Life': 'fa-face-smile',
        "Children's Nutrition": 'fa-child'
    };
    
    container.innerHTML = categories.map(cat => `
        <div class="category-card" onclick="location.href='products.html?category=${encodeURIComponent(cat)}'">
            <i class="fas ${icons[cat] || 'fa-tag'}"></i>
            <h3>${cat}</h3>
        </div>
    `).join('');
}

function displayFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    
    const featured = allProducts.filter(p => p.featured).slice(0, 4);
    
    if (featured.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No featured products available.</p>';
        return;
    }
    
    const currency = localStorage.getItem('currency') || 'USD';
    const rate = parseFloat(localStorage.getItem('exchangeRate')) || 115;
    
    container.innerHTML = featured.map(p => {
        const price = currency === 'USD' ? `$${p.price.toFixed(2)}` : `KSh ${Math.round(p.price * rate).toLocaleString()}`;
        return `
            <div class="product-card">
                <img src="${p.image_url || 'https://images.unsplash.com/photo-1584017911766-451b3d0e8434?w=500'}" class="product-image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1584017911766-451b3d0e8434?w=500'">
                <div class="product-info">
                    <h3 class="product-title">${escapeHtml(p.name)}</h3>
                    <p class="product-description">${escapeHtml(p.description || 'High-quality wellness supplement')}</p>
                    <div class="product-price">${price}</div>
                    <button class="add-to-cart" onclick="cartSystem.addItem(${p.id}, '${escapeHtml(p.name)}', ${p.price}, '${p.image_url}')">Add to Cart</button>
                    <button class="whatsapp-inquiry" onclick="window.open('https://wa.me/254746800330?text=${encodeURIComponent('Hello, interested in ' + p.name)}', '_blank')"><i class="fab fa-whatsapp"></i> Inquire</button>
                </div>
            </div>
        `;
    }).join('');
    
    if (window.currencySystem) setTimeout(() => window.currencySystem.updateAllPrices(), 100);
}

function displayLatestPosts() {
    const container = document.getElementById('latestPosts');
    if (!container) return;
    
    const recent = allBlogs.slice(0, 3);
    
    if (recent.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No blog posts yet. Check back soon!</p>';
        return;
    }
    
    container.innerHTML = recent.map(post => {
        const date = new Date(post.created_at).toLocaleDateString();
        return `
            <div class="blog-card">
                <img src="${post.image_url || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500'}" class="blog-image" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500'">
                <div class="blog-content">
                    <h3 class="blog-title">${escapeHtml(post.title)}</h3>
                    <p class="blog-meta"><i class="far fa-calendar-alt"></i> ${date} | by ${escapeHtml(post.author || 'Dr. Zakiyah Arrey')}</p>
                    <p class="blog-excerpt">${escapeHtml(post.excerpt || (post.content ? post.content.substring(0, 100) + '...' : ''))}</p>
                    <a href="blog-post.html?slug=${post.slug}" class="read-more">Read More <i class="fas fa-arrow-right"></i></a>
                </div>
            </div>
        `;
    }).join('');
}

async function loadLogoSettings() {
    if (!window.supabase) return;
    try {
        const { data } = await window.supabase.from('site_settings').select('value').eq('key', 'logo_url').single();
        if (data && data.value) {
            const logoImg = document.getElementById('header-logo');
            const logoText = document.querySelector('.logo-text');
            if (logoImg && logoText) {
                logoImg.src = data.value;
                logoImg.style.display = 'block';
                logoText.style.display = 'none';
            }
        }
    } catch(e) { console.log('Logo error:', e); }
}

async function subscribeNewsletter(email) {
    if (!window.supabase) return false;
    try {
        await window.supabase.from('newsletter_subscribers').insert([{ email }]);
        return true;
    } catch(e) { return false; }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

// Event listeners
document.querySelector('.mobile-menu')?.addEventListener('click', () => {
    document.querySelector('.nav-menu')?.classList.toggle('active');
});

document.getElementById('newsletterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletterEmail').value;
    if (email && await subscribeNewsletter(email)) {
        alert('Successfully subscribed!');
        e.target.reset();
    } else {
        alert('Subscription failed. Please try again.');
    }
});

window.addEventListener('currencyChanged', () => displayFeaturedProducts());

document.addEventListener('DOMContentLoaded', () => {
    if (typeof cartSystem !== 'undefined') cartSystem.load();
    loadAllData();
});
