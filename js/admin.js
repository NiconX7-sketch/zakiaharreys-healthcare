// ============================================
// ZAKIYAH ARREYS HEALTHCARE - ADMIN DASHBOARD
// Complete admin panel with CRUD operations
// ============================================

let currentUser = null;
let currentEditId = null;
let currentEditType = null;

// ============================================
// AUTHENTICATION CHECK
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    await checkAdminAuth();
    await loadAdminProfile();
    await loadDashboardStats();
    await loadProducts();
    await loadBlogPosts();
    await loadCorporatePrograms();
    await loadAffiliates();
    await loadOrders();
    await loadMessages();
    await loadSubscribers();
    await loadSettings();
    
    setupMenuNavigation();
});

async function checkAdminAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        window.location.href = 'admin.html';
        return;
    }
    
    // Check if user has admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
    
    if (!profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        window.location.href = 'admin.html';
        return;
    }
    
    currentUser = session.user;
}

async function loadAdminProfile() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (profile) {
        document.getElementById('adminName').textContent = profile.full_name || 'Admin User';
        document.getElementById('adminEmail').textContent = currentUser.email;
        if (profile.avatar_url) {
            document.getElementById('profilePic').src = profile.avatar_url;
        }
    }
}

async function uploadAvatar() {
    const file = document.getElementById('avatarUpload').files[0];
    if (!file) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);
    
    if (error) {
        alert('Upload failed: ' + error.message);
        return;
    }
    
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
    
    await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);
    
    document.getElementById('profilePic').src = publicUrl;
    alert('Profile picture updated!');
}

// ============================================
// DASHBOARD STATS
// ============================================
async function loadDashboardStats() {
    try {
        // Get orders for revenue
        const { data: orders } = await supabase
            .from('orders')
            .select('total, payment_status');
        
        const totalRevenue = orders?.reduce((sum, o) => 
            o.payment_status === 'completed' ? sum + o.total : sum, 0) || 0;
        
        const { count: orderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });
        
        const { count: productCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });
        
        const { count: blogCount } = await supabase
            .from('blog_posts')
            .select('*', { count: 'exact', head: true });
        
        document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
        document.getElementById('totalOrders').textContent = orderCount || 0;
        document.getElementById('totalProducts').textContent = productCount || 0;
        document.getElementById('totalBlogs').textContent = blogCount || 0;
        
        // Recent orders
        const { data: recentOrders } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        const tableBody = document.querySelector('#recentOrdersTable tbody');
        if (recentOrders && recentOrders.length > 0) {
            tableBody.innerHTML = recentOrders.map(order => `
                <tr>
                    <td>${order.order_number}</td>
                    <td>${order.customer_name}</td>
                    <td>$${order.total.toFixed(2)}</td>
                    <td><span style="background: ${order.payment_status === 'completed' ? '#d4edda' : '#fff3cd'}; padding: 5px 10px; border-radius: 20px;">${order.payment_status}</span></td>
                    <td>${new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No orders yet</td></tr>';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================
// PRODUCTS CRUD
// ============================================
async function loadProducts() {
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
    
    const tableBody = document.querySelector('#productsTable tbody');
    if (products && products.length > 0) {
        tableBody.innerHTML = products.map(product => `
            <tr>
                <td>${escapeHtml(product.name)}</td>
                <td>$${product.price}</td>
                <td>${product.category || '-'}</td>
                <td>${product.featured ? 'Yes' : 'No'}</td>
                <td>
                    <button class="edit-btn" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } else {
        tableBody.innerHTML = '<tr><td colspan="5">No products found</td></tr>';
    }
}

function showProductModal(product = null) {
    currentEditType = 'product';
    currentEditId = product?.id || null;
    
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>${product ? 'Edit Product' : 'Add Product'}</h3>
            <button onclick="closeModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <form id="productForm">
            <div class="form-group"><label>Name</label><input type="text" id="prodName" value="${product?.name || ''}" required></div>
            <div class="form-group"><label>Description</label><textarea id="prodDesc">${product?.description || ''}</textarea></div>
            <div class="form-group"><label>Price (USD)</label><input type="number" id="prodPrice" step="0.01" value="${product?.price || ''}" required></div>
            <div class="form-group"><label>Category</label><input type="text" id="prodCategory" value="${product?.category || ''}"></div>
            <div class="form-group"><label>Image URL</label><input type="text" id="prodImage" value="${product?.image_url || ''}"></div>
            <div class="form-group"><label><input type="checkbox" id="prodFeatured" ${product?.featured ? 'checked' : ''}> Featured Product</label></div>
            <button type="submit" class="btn-add">${product ? 'Update' : 'Create'} Product</button>
        </form>
    `;
    
    document.getElementById('productForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('prodName').value,
            description: document.getElementById('prodDesc').value,
            price: parseFloat(document.getElementById('prodPrice').value),
            category: document.getElementById('prodCategory').value,
            image_url: document.getElementById('prodImage').value,
            featured: document.getElementById('prodFeatured').checked
        };
        
        if (currentEditId) {
            await supabase.from('products').update(data).eq('id', currentEditId);
        } else {
            await supabase.from('products').insert([data]);
        }
        
        closeModal();
        loadProducts();
        loadDashboardStats();
        alert('Product saved!');
    };
    
    document.getElementById('modal').classList.add('active');
}

window.editProduct = async (id) => {
    const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
    showProductModal(product);
};

window.deleteProduct = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
        await supabase.from('products').delete().eq('id', id);
        loadProducts();
        loadDashboardStats();
        alert('Product deleted!');
    }
};

// ============================================
// CORPORATE WELLNESS CRUD
// ============================================
async function loadCorporatePrograms() {
    const { data: programs } = await supabase
        .from('corporate_wellness')
        .select('*')
        .order('created_at', { ascending: false });
    
    const tableBody = document.querySelector('#corporateTable tbody');
    if (programs && programs.length > 0) {
        tableBody.innerHTML = programs.map(program => `
            <tr>
                <td>${escapeHtml(program.title)}</td>
                <td>${program.program_type || '-'}</td>
                <td>$${program.price}</td>
                <td>${program.active ? 'Active' : 'Inactive'}</td>
                <td>
                    <button class="edit-btn" onclick="editCorporate(${program.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteCorporate(${program.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } else {
        tableBody.innerHTML = '<tr><td colspan="5">No programs found</td></tr>';
    }
}

function showCorporateModal(program = null) {
    currentEditType = 'corporate';
    currentEditId = program?.id || null;
    
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>${program ? 'Edit Program' : 'Add Corporate Wellness Program'}</h3>
            <button onclick="closeModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <form id="corporateForm">
            <div class="form-group"><label>Title</label><input type="text" id="corpTitle" value="${program?.title || ''}" required></div>
            <div class="form-group"><label>Description</label><textarea id="corpDesc">${program?.description || ''}</textarea></div>
            <div class="form-group"><label>Program Type</label><select id="corpType"><option value="screening">Screening</option><option value="workshop">Workshop</option><option value="training">Training</option><option value="consultation">Consultation</option></select></div>
            <div class="form-group"><label>Price (USD)</label><input type="number" id="corpPrice" step="0.01" value="${program?.price || ''}"></div>
            <div class="form-group"><label>Duration</label><input type="text" id="corpDuration" value="${program?.duration || 'full-day'}" placeholder="half-day, full-day, weekly"></div>
            <div class="form-group"><label>Features (comma separated)</label><input type="text" id="corpFeatures" value="${program?.features?.join(', ') || ''}"></div>
            <div class="form-group"><label>Image URL</label><input type="text" id="corpImage" value="${program?.image_url || ''}"></div>
            <div class="form-group"><label><input type="checkbox" id="corpActive" ${program?.active !== false ? 'checked' : ''}> Active</label></div>
            <button type="submit" class="btn-add">${program ? 'Update' : 'Create'} Program</button>
        </form>
    `;
    
    if (program?.program_type) {
        document.getElementById('corpType').value = program.program_type;
    }
    
    document.getElementById('corporateForm').onsubmit = async (e) => {
        e.preventDefault();
        const features = document.getElementById('corpFeatures').value.split(',').map(f => f.trim()).filter(f => f);
        const data = {
            title: document.getElementById('corpTitle').value,
            description: document.getElementById('corpDesc').value,
            program_type: document.getElementById('corpType').value,
            price: parseFloat(document.getElementById('corpPrice').value) || 0,
            duration: document.getElementById('corpDuration').value,
            features: features,
            image_url: document.getElementById('corpImage').value,
            active: document.getElementById('corpActive').checked
        };
        
        if (currentEditId) {
            await supabase.from('corporate_wellness').update(data).eq('id', currentEditId);
        } else {
            await supabase.from('corporate_wellness').insert([data]);
        }
        
        closeModal();
        loadCorporatePrograms();
        alert('Program saved!');
    };
    
    document.getElementById('modal').classList.add('active');
}

window.editCorporate = async (id) => {
    const { data: program } = await supabase.from('corporate_wellness').select('*').eq('id', id).single();
    showCorporateModal(program);
};

window.deleteCorporate = async (id) => {
    if (confirm('Are you sure you want to delete this program?')) {
        await supabase.from('corporate_wellness').delete().eq('id', id);
        loadCorporatePrograms();
        alert('Program deleted!');
    }
};

// ============================================
// BLOG POSTS CRUD
// ============================================
async function loadBlogPosts() {
    const { data: posts } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
    
    const tableBody = document.querySelector('#blogTable tbody');
    if (posts && posts.length > 0) {
        tableBody.innerHTML = posts.map(post => `
            <tr>
                <td>${escapeHtml(post.title)}</td>
                <td>${post.slug}</td>
                <td>${post.published ? 'Published' : 'Draft'}</td>
                <td>${post.views || 0}</td>
                <td>
                    <button class="edit-btn" onclick="editBlog(${post.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteBlog(${post.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } else {
        tableBody.innerHTML = '<tr><td colspan="5">No blog posts found</td></tr>';
    }
}

function showBlogModal(post = null) {
    currentEditType = 'blog';
    currentEditId = post?.id || null;
    
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>${post ? 'Edit Blog Post' : 'Add Blog Post'}</h3>
            <button onclick="closeModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <form id="blogForm">
            <div class="form-group"><label>Title</label><input type="text" id="blogTitle" value="${post?.title || ''}" required></div>
            <div class="form-group"><label>Slug (URL-friendly)</label><input type="text" id="blogSlug" value="${post?.slug || ''}" required></div>
            <div class="form-group"><label>Excerpt</label><textarea id="blogExcerpt">${post?.excerpt || ''}</textarea></div>
            <div class="form-group"><label>Content (HTML)</label><textarea id="blogContent" rows="10">${post?.content || ''}</textarea></div>
            <div class="form-group"><label>Author</label><input type="text" id="blogAuthor" value="${post?.author || 'Dr. Zakiyah Arrey'}"></div>
            <div class="form-group"><label>Image URL</label><input type="text" id="blogImage" value="${post?.image_url || ''}"></div>
            <div class="form-group"><label><input type="checkbox" id="blogPublished" ${post?.published ? 'checked' : ''}> Published</label></div>
            <button type="submit" class="btn-add">${post ? 'Update' : 'Create'} Post</button>
        </form>
    `;
    
    document.getElementById('blogForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            title: document.getElementById('blogTitle').value,
            slug: document.getElementById('blogSlug').value.toLowerCase().replace(/ /g, '-'),
            excerpt: document.getElementById('blogExcerpt').value,
            content: document.getElementById('blogContent').value,
            author: document.getElementById('blogAuthor').value,
            image_url: document.getElementById('blogImage').value,
            published: document.getElementById('blogPublished').checked
        };
        
        if (currentEditId) {
            await supabase.from('blog_posts').update(data).eq('id', currentEditId);
        } else {
            await supabase.from('blog_posts').insert([data]);
        }
        
        closeModal();
        loadBlogPosts();
        loadDashboardStats();
        alert('Blog post saved!');
    };
    
    document.getElementById('modal').classList.add('active');
}

window.editBlog = async (id) => {
    const { data: post } = await supabase.from('blog_posts').select('*').eq('id', id).single();
    showBlogModal(post);
};

window.deleteBlog = async (id) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
        await supabase.from('blog_posts').delete().eq('id', id);
        loadBlogPosts();
        loadDashboardStats();
        alert('Blog post deleted!');
    }
};

// ============================================
// AFFILIATES CRUD
// ============================================
async function loadAffiliates() {
    const { data: affiliates } = await supabase
        .from('affiliate_links')
        .select('*')
        .order('created_at', { ascending: false });
    
    const tableBody = document.querySelector('#affiliatesTable tbody');
    if (affiliates && affiliates.length > 0) {
        tableBody.innerHTML = affiliates.map(link => `
            <tr>
                <td>${escapeHtml(link.name)}</td>
                <td><a href="${link.url}" target="_blank">${link.url}</a></td>
                <td>${link.clicks || 0}</td>
                <td>
                    <button class="edit-btn" onclick="editAffiliate(${link.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteAffiliate(${link.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } else {
        tableBody.innerHTML = '<tr><td colspan="4">No affiliate links found</td></tr>';
    }
}

function showAffiliateModal(link = null) {
    currentEditType = 'affiliate';
    currentEditId = link?.id || null;
    
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `
        <div class="modal-header">
            <h3>${link ? 'Edit Affiliate Link' : 'Add Affiliate Link'}</h3>
            <button onclick="closeModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer;">&times;</button>
        </div>
        <form id="affiliateForm">
            <div class="form-group"><label>Name</label><input type="text" id="affName" value="${link?.name || ''}" required></div>
            <div class="form-group"><label>URL</label><input type="url" id="affUrl" value="${link?.url || ''}" required></div>
            <div class="form-group"><label>Description</label><textarea id="affDesc">${link?.description || ''}</textarea></div>
            <div class="form-group"><label>Logo URL</label><input type="text" id="affLogo" value="${link?.logo_url || ''}"></div>
            <button type="submit" class="btn-add">${link ? 'Update' : 'Create'} Link</button>
        </form>
    `;
    
    document.getElementById('affiliateForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('affName').value,
            url: document.getElementById('affUrl').value,
            description: document.getElementById('affDesc').value,
            logo_url: document.getElementById('affLogo').value,
            active: true
        };
        
        if (currentEditId) {
            await supabase.from('affiliate_links').update(data).eq('id', currentEditId);
        } else {
            await supabase.from('affiliate_links').insert([data]);
        }
        
        closeModal();
        loadAffiliates();
        alert('Affiliate link saved!');
    };
    
    document.getElementById('modal').classList.add('active');
}

window.editAffiliate = async (id) => {
    const { data: link } = await supabase.from('affiliate_links').select('*').eq('id', id).single();
    showAffiliateModal(link);
};

window.deleteAffiliate = async (id) => {
    if (confirm('Are you sure you want to delete this affiliate link?')) {
        await supabase.from('affiliate_links').delete().eq('id', id);
        loadAffiliates();
        alert('Affiliate link deleted!');
    }
};

// ============================================
// ORDERS, MESSAGES, SUBSCRIBERS
// ============================================
async function loadOrders() {
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
    
    const tableBody = document.querySelector('#allOrdersTable tbody');
    if (orders && orders.length > 0) {
        tableBody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.order_number}</td>
                <td>${order.customer_name}</td>
                <td>$${order.total.toFixed(2)}</td>
                <td>${order.payment_status}</td>
                <td>${order.order_status}</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } else {
        tableBody.innerHTML = '<tr><td colspan="6">No orders found</td></tr>';
    }
}

async function loadMessages() {
    const { data: messages } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
    
    const tableBody = document.querySelector('#messagesTable tbody');
    if (messages && messages.length > 0) {
        tableBody.innerHTML = messages.map(msg => `
            <tr>
                <td>${escapeHtml(msg.name)}</td>
                <td>${msg.email}</td>
                <td>${escapeHtml(msg.subject || '-')}</td>
                <td>${escapeHtml(msg.message.substring(0, 50))}...</td>
                <td>${new Date(msg.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } else {
        tableBody.innerHTML = '<tr><td colspan="5">No messages found</td></tr>';
    }
}

async function loadSubscribers() {
    const { data: subscribers } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });
    
    const tableBody = document.querySelector('#subscribersTable tbody');
    if (subscribers && subscribers.length > 0) {
        tableBody.innerHTML = subscribers.map(sub => `
            <tr>
                <td>${sub.email}</td>
                <td>${new Date(sub.subscribed_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } else {
        tableBody.innerHTML = '<tr><td colspan="2">No subscribers found</td></tr>';
    }
}

async function loadSettings() {
    const { data: settings } = await supabase.from('site_settings').select('*');
    const settingsMap = {};
    settings?.forEach(s => { settingsMap[s.key] = s.value; });
    
    document.getElementById('siteName').value = settingsMap.site_name || '';
    document.getElementById('contactPhone').value = settingsMap.contact_phone || '';
    document.getElementById('contactEmail').value = settingsMap.contact_email || '';
    document.getElementById('address').value = settingsMap.address || '';
    document.getElementById('exchangeRate').value = settingsMap.exchange_rate || '115';
    document.getElementById('whatsappNumber').value = settingsMap.whatsapp_number || '';
    document.getElementById('primaryColor').value = settingsMap.primary_color || '#2e7d32';
    document.getElementById('secondaryColor').value = settingsMap.secondary_color || '#ff8f00';
    document.getElementById('logoUrl').value = settingsMap.logo_url || '';
    
    document.getElementById('settingsForm').onsubmit = async (e) => {
        e.preventDefault();
        const settingsData = [
            { key: 'site_name', value: document.getElementById('siteName').value },
            { key: 'contact_phone', value: document.getElementById('contactPhone').value },
            { key: 'contact_email', value: document.getElementById('contactEmail').value },
            { key: 'address', value: document.getElementById('address').value },
            { key: 'exchange_rate', value: document.getElementById('exchangeRate').value },
            { key: 'whatsapp_number', value: document.getElementById('whatsappNumber').value },
            { key: 'primary_color', value: document.getElementById('primaryColor').value },
            { key: 'secondary_color', value: document.getElementById('secondaryColor').value },
            { key: 'logo_url', value: document.getElementById('logoUrl').value }
        ];
        
        for (const setting of settingsData) {
            await supabase.from('site_settings').upsert(setting, { onConflict: 'key' });
        }
        
        alert('Settings saved!');
    };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function setupMenuNavigation() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const panel = this.dataset.panel;
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`${panel}Panel`).classList.add('active');
            document.getElementById('pageTitle').textContent = this.querySelector('span')?.textContent || panel;
        });
    });
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    currentEditId = null;
}

window.closeModal = closeModal;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'admin.html';
}

window.logout = logout;