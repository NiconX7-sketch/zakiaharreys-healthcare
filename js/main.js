// ============================================
// MAIN JAVASCRIPT - COMPLETE WORKING VERSION
// ============================================

const SUPABASE_URL = 'https://qczrxqxwowfkltkbcyho.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjenJ4cXh3b3dma2x0a2JjeWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjE1MDgsImV4cCI6MjA5MTg5NzUwOH0.VPDdz5bGuneuXSxAlhjMpFZbAzAkYeF9nYfgbopkZoE';

let supabaseClient = null;
let allProducts = [];
let allBlogs = [];

// Initialize Supabase
function initSupabase() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized');
        loadAllData();
        return true;
    }
    setTimeout(initSupabase, 500);
}

// Load all data
async function loadAllData() {
    if (!supabaseClient) {
        console.log('Waiting for Supabase...');
        setTimeout(loadAllData, 500);
        return;
    }
    
    try {
        console.log('Loading products...');
        const { data: products, error: productsError } = await supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (productsError) throw productsError;
        
        console.log('Loading blog posts...');
        const { data: blogs, error: blogsError } = await supabaseClient
            .from('blog_posts')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });
        
        if (blogsError) throw blogsError;
        
        allProducts = products || [];
        allBlogs = blogs || [];
        
        console.log(`Loaded ${allProducts.length} products and ${allBlogs.length} blog posts`);
        
        // Display data
        displayFeaturedProducts();
        displayLatestPosts();
        loadLogoSettings();
        
    } catch (error) {
        console.error('Error loading data:', error);
        // Show error message on page
        const container = document.getElementById('featuredProducts');
        if (container) {
            container.innerHTML = '<p style="text-align:center;color:#dc3545;">Error loading products. Please check your database connection.</p>';
        }
    }
}

// Display featured products
function displayFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    
    const featured = allProducts.filter(p => p.featured).slice(0, 4);
    
    if (featured.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No featured products available. Add products in admin panel.</p>';
        return;
    }
    
    const currency = localStorage.getItem('currency') || 'USD';
    const rate = parseFloat(localStorage.getItem('exchangeRate')) || 115;
    
    container.innerHTML = featured.map(product => {
        const price = currency === 'USD' ? `$${product.price.toFixed(2)}` : `KSh ${Math.round(product.price * rate).toLocaleString()}`;
        
        return `
            <div class="product-card">
                <img src="${product.image_url || 'https://images.unsplash.com/photo-1584017911766-451b3d0e8434?w=500'}" 
                     class="product-image" 
                     loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1584017911766-451b3d0e8434?w=500'">
                <div class="product-info">
                    <h3 class="product-title">${escapeHtml(product.name)}</h3>
                    <p class="product-description">${escapeHtml(product.description || 'High-quality wellness supplement')}</p>
                    <div class="product-price">${price}</div>
                    <button class="add-to-cart" onclick="cartSystem.addItem(${product.id}, '${escapeHtml(product.name)}', ${product.price}, '${product.image_url}')">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <button class="whatsapp-inquiry" onclick="window.open('https://wa.me/254746800330?text=${encodeURIComponent('Hello, I\'m interested in ' + product.name)}', '_blank')">
                        <i class="fab fa-whatsapp"></i> Inquire
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Update currency display if needed
    if (window.currencySystem) {
        setTimeout(() => window.currencySystem.updateAllPrices(), 100);
    }
}

// Display latest blog posts
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
                <img src="${post.image_url || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500'}" 
                     class="blog-image" 
                     loading="lazy"
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
    }).join('');
}

// Load logo settings
async function loadLogoSettings() {
    if (!supabaseClient) return;
    
    try {
        const { data } = await supabaseClient
            .from('site_settings')
            .select('value')
            .eq('key', 'logo_url')
            .single();
        
        if (data && data.value) {
            const logoImg = document.getElementById('header-logo');
            const logoText = document.querySelector('.logo-text');
            if (logoImg && logoText) {
                logoImg.src = data.value;
                logoImg.style.display = 'block';
                logoText.style.display = 'none';
            }
        }
    } catch (error) {
        console.log('Using default logo');
    }
}

// Newsletter subscription
async function subscribeNewsletter(email) {
    if (!supabaseClient) return false;
    
    try {
        await supabaseClient.from('newsletter_subscribers').insert([{ email }]);
        return true;
    } catch (error) {
        console.error('Newsletter error:', error);
        return false;
    }
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Setup event listeners
function setupEventListeners() {
    // Mobile menu
    const mobileMenu = document.querySelector('.mobile-menu');
    const navMenu = document.querySelector('.nav-menu');
    if (mobileMenu) {
        mobileMenu.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('newsletterEmail').value;
            if (email) {
                const success = await subscribeNewsletter(email);
                if (success) {
                    alert('Successfully subscribed!');
                    newsletterForm.reset();
                } else {
                    alert('Subscription failed. Please try again.');
                }
            }
        });
    }
    
    // Currency change listener
    window.addEventListener('currencyChanged', () => {
        displayFeaturedProducts();
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initSupabase();
    cartSystem.load();
});

// Make functions global
window.addToCart = (id, name, price, image) => cartSystem.addItem(id, name, price, image);
