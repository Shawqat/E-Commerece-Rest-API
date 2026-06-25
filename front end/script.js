(function() {
            'use strict';

            // ===========================================================
            //  1.  CONFIG & STATE
            // ===========================================================
            const API_BASE = '/api';
            const PRODUCTS_API = API_BASE + '/products';
            const USERS_API = API_BASE + '/users';

            let state = {
                token: localStorage.getItem('token') || null,
                user: null, // will be decoded or fetched
                products: [],
                currentPage: 1,
                limit: 8,
                totalProducts: 0,
                selectedSlug: null,
                categories: [],
                searchTerm: '',
                sortBy: '-createdAt',
                categoryFilter: '',
            };

            // DOM refs
            const $ = (sel) => document.querySelector(sel);
            const $$ = (sel) => document.querySelectorAll(sel);

            // Toast
            const toastEl = $('#toast');
            let toastTimer = null;

            // ===========================================================
            //  2.  TOAST HELPER
            // ===========================================================
            function showToast(message, type = 'info', duration = 4000) {
                if (toastTimer) clearTimeout(toastTimer);
                toastEl.textContent = message;
                toastEl.className = 'toast';
                if (type === 'success') toastEl.classList.add('toast-success');
                else if (type === 'error') toastEl.classList.add('toast-error');
                else toastEl.classList.add('toast-info');
                // force reflow
                void toastEl.offsetWidth;
                toastEl.classList.add('show');
                toastTimer = setTimeout(() => {
                    toastEl.classList.remove('show');
                }, duration);
            }

            // ===========================================================
            //  3.  API HELPERS
            // ===========================================================
            async function apiFetch(url, options = {}) {
                const headers = { 'Content-Type': 'application/json' };
                if (state.token) {
                    headers.Authorization = `Bearer ${state.token}`;
                }
                const config = { ...options, headers };
                const res = await fetch(url, config);
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || 'حدث خطأ غير متوقع');
                }
                return data;
            }

            // ===========================================================
            //  4.  AUTH
            // ===========================================================
            async function handleLogin(email, password) {
                try {
                    const data = await apiFetch(USERS_API + '/login', {
                        method: 'POST',
                        body: JSON.stringify({ email, password }),
                    });
                    state.token = data.token;
                    localStorage.setItem('token', data.token);
                    await fetchMe();
                    showToast('تم تسجيل الدخول بنجاح!', 'success');
                    navigateTo('home');
                    updateUI();
                } catch (err) {
                    showToast(err.message || 'فشل تسجيل الدخول', 'error');
                }
            }

            async function handleSignup(name, email, password, passwordConfirm) {
                try {
                    const data = await apiFetch(USERS_API + '/signup', {
                        method: 'POST',
                        body: JSON.stringify({ name, email, password, passwordConfirm }),
                    });
                    state.token = data.token;
                    localStorage.setItem('token', data.token);
                    await fetchMe();
                    showToast('تم إنشاء الحساب بنجاح!', 'success');
                    navigateTo('home');
                    updateUI();
                } catch (err) {
                    showToast(err.message || 'فشل إنشاء الحساب', 'error');
                }
            }

            async function fetchMe() {
                if (!state.token) {
                    state.user = null;
                    return;
                }
                try {
                    // We'll decode the token locally to get the user ID,
                    // then fetch the user from the DB. But since we don't have a /me endpoint,
                    // we'll use the token payload. Alternatively we can just rely on the token.
                    // For simplicity, we'll just store the token and decode it.
                    const payload = parseJwt(state.token);
                    if (payload && payload.id) {
                        // We'll just store the user info from the token for now.
                        // We can fetch the full user if needed, but we'll keep it simple.
                        state.user = { id: payload.id, role: payload.role, name: payload.name || 'user' };
                        // If we want the full user, we could fetch from /users/:id but we'll skip.
                    } else {
                        state.user = null;
                    }
                } catch (e) {
                    state.user = null;
                }
                // If we have a token but no user, clear it.
                if (!state.user) {
                    localStorage.removeItem('token');
                    state.token = null;
                }
            }

            function parseJwt(token) {
                try {
                    const base64 = token.split('.')[1];
                    return JSON.parse(atob(base64));
                } catch (e) {
                    return null;
                }
            }

            function logout() {
                localStorage.removeItem('token');
                state.token = null;
                state.user = null;
                showToast('تم تسجيل الخروج', 'info');
                navigateTo('home');
                updateUI();
            }

            // ===========================================================
            //  5.  PRODUCTS API
            // ===========================================================
            async function fetchProducts(page = 1, limit = state.limit, search = '', sort = state.sortBy, category = '') {
                let url = PRODUCTS_API + `?page=${page}&limit=${limit}&sort=${sort}`;
                if (search) url += `&name=${encodeURIComponent(search)}`;
                if (category) url += `&category=${encodeURIComponent(category)}`;
                // Note: our backend supports filtering by exact match on fields.
                // We'll use the 'name' field for search and 'category' for filter.
                // The backend also supports gte/lte etc but we keep it simple.
                try {
                    const data = await apiFetch(url);
                    return data;
                } catch (err) {
                    showToast(err.message, 'error');
                    return { data: [], results: 0 };
                }
            }

            async function fetchProductBySlug(slug) {
                try {
                    const data = await apiFetch(PRODUCTS_API + `/${slug}`);
                    return data.data;
                } catch (err) {
                    showToast(err.message, 'error');
                    return null;
                }
            }

            async function createProduct(productData) {
                try {
                    const data = await apiFetch(PRODUCTS_API + '/', {
                        method: 'POST',
                        body: JSON.stringify(productData),
                    });
                    showToast('تم إضافة المنتج بنجاح!', 'success');
                    return data.data;
                } catch (err) {
                    showToast(err.message || 'فشل إضافة المنتج', 'error');
                    return null;
                }
            }

            async function updateProduct(slug, productData) {
                try {
                    const data = await apiFetch(PRODUCTS_API + `/${slug}`, {
                        method: 'PATCH',
                        body: JSON.stringify(productData),
                    });
                    showToast('تم تحديث المنتج بنجاح!', 'success');
                    return data.data;
                } catch (err) {
                    showToast(err.message || 'فشل تحديث المنتج', 'error');
                    return null;
                }
            }

            async function deleteProduct(slug) {
                try {
                    await apiFetch(PRODUCTS_API + `/${slug}`, {
                        method: 'DELETE',
                    });
                    showToast('تم حذف المنتج بنجاح!', 'success');
                    return true;
                } catch (err) {
                    showToast(err.message || 'فشل حذف المنتج', 'error');
                    return false;
                }
            }

            // ===========================================================
            //  6.  VIEW NAVIGATION
            // ===========================================================
            const views = ['home', 'products', 'productDetail', 'admin', 'login', 'signup'];

            function navigateTo(view, data = null) {
                // Hide all views
                views.forEach(v => {
                    const el = document.getElementById('view' + v.charAt(0).toUpperCase() + v.slice(1));
                    if (el) el.classList.remove('active');
                });
                // Show target
                const targetId = 'view' + view.charAt(0).toUpperCase() + view.slice(1);
                const target = document.getElementById(targetId);
                if (target) {
                    target.classList.add('active');
                    // Re-trigger animation
                    target.classList.remove('fade-in');
                    void target.offsetWidth;
                    target.classList.add('fade-in');
                }
                // Scroll top
                window.scrollTo({ top: 0, behavior: 'smooth' });

                // If product detail, render
                if (view === 'productDetail' && data) {
                    renderProductDetail(data);
                }
            }

            // ===========================================================
            //  7.  RENDER FUNCTIONS
            // ===========================================================

            // ---- 7a. Product Card ----
            function productCardHTML(product) {
                const slug = product.slug || product._id;
                const imgPlaceholder = product.name.charAt(0).toUpperCase();
                return `
                    <div class="product-card bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer" data-slug="${slug}">
                        <div class="product-img-placeholder h-44 text-4xl font-bold">${imgPlaceholder}</div>
                        <div class="p-4">
                            <h3 class="font-bold text-gray-800 text-lg truncate">${product.name}</h3>
                            <p class="text-sm text-gray-500 truncate mt-1">${product.description || ''}</p>
                            <div class="flex items-center justify-between mt-3">
                                <span class="price-tag">${product.price} ج.م</span>
                                <span class="stock-badge ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                    ${product.stock > 0 ? 'متوفر' : 'نفد'}
                                </span>
                            </div>
                            <div class="text-xs text-gray-400 mt-2">${product.category || 'غير مصنف'}</div>
                        </div>
                    </div>
                `;
            }

            // ---- 7b. Home Products ----
            function renderHomeProducts(products) {
                const grid = $('#homeProductGrid');
                if (!products || products.length === 0) {
                    grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400"><i class="fas fa-box-open text-4xl mb-3"></i><p>لا توجد منتجات حالياً</p></div>`;
                    return;
                }
                const limited = products.slice(0, 8);
                grid.innerHTML = limited.map(p => productCardHTML(p)).join('');
                // Attach click listeners
                grid.querySelectorAll('.product-card').forEach(el => {
                    el.addEventListener('click', function() {
                        const slug = this.dataset.slug;
                        if (slug) viewProductDetail(slug);
                    });
                });
            }

            // ---- 7c. Products List (with pagination) ----
            function renderProductsList(products, total, page, limit) {
                const grid = $('#productGrid');
                if (!products || products.length === 0) {
                    grid.innerHTML =
                        `<div class="col-span-full text-center py-12 text-gray-400"><i class="fas fa-box-open text-4xl mb-3"></i><p>لا توجد منتجات مطابقة</p></div>`;
                    $('#paginationInfo').textContent = 'عرض 0 منتج';
                    $('#paginationButtons').innerHTML = '';
                    return;
                }
                grid.innerHTML = products.map(p => productCardHTML(p)).join('');
                grid.querySelectorAll('.product-card').forEach(el => {
                    el.addEventListener('click', function() {
                        const slug = this.dataset.slug;
                        if (slug) viewProductDetail(slug);
                    });
                });

                // Pagination info
                const start = (page - 1) * limit + 1;
                const end = Math.min(page * limit, total);
                $('#paginationInfo').textContent = `عرض ${start} - ${end} من ${total} منتج`;

                // Pagination buttons
                const totalPages = Math.ceil(total / limit);
                const btnContainer = $('#paginationButtons');
                btnContainer.innerHTML = '';
                if (totalPages <= 1) return;

                // Previous
                if (page > 1) {
                    const btn = document.createElement('button');
                    btn.className = 'px-3 py-1 border border-gray-300 rounded-full text-sm hover:bg-gray-50 transition';
                    btn.textContent = 'السابق';
                    btn.addEventListener('click', () => loadProductsPage(page - 1));
                    btnContainer.appendChild(btn);
                }

                // Current page indicator
                const span = document.createElement('span');
                span.className = 'px-3 py-1 bg-primary text-white rounded-full text-sm font-semibold';
                span.textContent = page;
                btnContainer.appendChild(span);

                // Next
                if (page < totalPages) {
                    const btn = document.createElement('button');
                    btn.className = 'px-3 py-1 border border-gray-300 rounded-full text-sm hover:bg-gray-50 transition';
                    btn.textContent = 'التالي';
                    btn.addEventListener('click', () => loadProductsPage(page + 1));
                    btnContainer.appendChild(btn);
                }
            }

            // ---- 7d. Product Detail ----
            function renderProductDetail(product) {
                const container = $('#productDetailContainer');
                if (!product) {
                    container.innerHTML = `<div class="text-center py-12 text-gray-400">المنتج غير موجود</div>`;
                    return;
                }
                const imgPlaceholder = product.name.charAt(0).toUpperCase();
                container.innerHTML = `
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="md:w-1/3">
                            <div class="product-img-placeholder h-64 text-6xl font-bold rounded-2xl">${imgPlaceholder}</div>
                        </div>
                        <div class="md:w-2/3 space-y-4">
                            <h1 class="text-3xl font-extrabold text-gray-800">${product.name}</h1>
                            <div class="flex items-center gap-4">
                                <span class="price-tag text-xl px-5 py-2">${product.price} ج.م</span>
                                <span class="stock-badge ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-base px-4 py-1.5">
                                    ${product.stock > 0 ? 'متوفر' : 'نفد من المخزون'}
                                </span>
                            </div>
                            <p class="text-gray-600 text-lg leading-relaxed">${product.description || 'لا يوجد وصف متاح'}</p>
                            <div class="flex flex-wrap gap-3 text-sm">
                                <span class="bg-gray-100 px-4 py-1.5 rounded-full"><i class="far fa-folder-open mr-1"></i> ${product.category || 'غير مصنف'}</span>
                                <span class="bg-gray-100 px-4 py-1.5 rounded-full"><i class="far fa-calendar-alt mr-1"></i> ${product.createdAt ? new Date(product.createdAt).toLocaleDateString('ar-EG') : ''}</span>
                            </div>
                            ${state.user && state.user.role === 'admin' ? `
                                <div class="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                                    <button class="admin-edit-btn bg-yellow-500 text-white px-5 py-2 rounded-full font-semibold hover:bg-yellow-600 transition" data-slug="${product.slug}"><i class="fas fa-edit mr-1"></i> تعديل</button>
                                    <button class="admin-delete-btn bg-red-500 text-white px-5 py-2 rounded-full font-semibold hover:bg-red-600 transition" data-slug="${product.slug}"><i class="fas fa-trash mr-1"></i> حذف</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                // Admin buttons in detail view
                container.querySelectorAll('.admin-edit-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const slug = this.dataset.slug;
                        if (slug) openAdminEdit(slug);
                    });
                });
                container.querySelectorAll('.admin-delete-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const slug = this.dataset.slug;
                        if (slug && confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
                            const ok = await deleteProduct(slug);
                            if (ok) {
                                navigateTo('products');
                                loadProductsPage(state.currentPage);
                            }
                        }
                    });
                });
            }

            // ---- 7e. Admin Table ----
            function renderAdminTable(products) {
                const tbody = $('#adminTableBody');
                const empty = $('#adminEmpty');
                if (!products || products.length === 0) {
                    tbody.innerHTML = '';
                    empty.classList.remove('hidden');
                    return;
                }
                empty.classList.add('hidden');
                tbody.innerHTML = products.map(p => `
                    <tr class="admin-row border-b border-gray-100 hover:bg-gray-50 transition">
                        <td class="px-5 py-3 font-semibold text-gray-800">${p.name}</td>
                        <td class="px-5 py-3 text-primary font-bold">${p.price} ج.م</td>
                        <td class="px-5 py-3">${p.stock}</td>
                        <td class="px-5 py-3 text-gray-600">${p.category || '-'}</td>
                        <td class="px-5 py-3 text-center">
                            <button class="admin-edit-btn text-yellow-600 hover:text-yellow-800 mx-1" data-slug="${p.slug}" title="تعديل"><i class="fas fa-edit"></i></button>
                            <button class="admin-delete-btn text-red-600 hover:text-red-800 mx-1" data-slug="${p.slug}" title="حذف"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('');

                // Attach events
                tbody.querySelectorAll('.admin-edit-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const slug = this.dataset.slug;
                        if (slug) openAdminEdit(slug);
                    });
                });
                tbody.querySelectorAll('.admin-delete-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const slug = this.dataset.slug;
                        if (slug && confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
                            const ok = await deleteProduct(slug);
                            if (ok) {
                                await loadAdminProducts();
                            }
                        }
                    });
                });
            }

            // ===========================================================
            //  8.  LOADING DATA FUNCTIONS
            // ===========================================================

            async function loadHomeProducts() {
                const data = await fetchProducts(1, 8, '', '-createdAt', '');
                if (data && data.data) {
                    renderHomeProducts(data.data);
                }
            }

            async function loadProductsPage(page = 1) {
                state.currentPage = page;
                const data = await fetchProducts(page, state.limit, state.searchTerm, state.sortBy, state.categoryFilter);
                if (data && data.data) {
                    state.products = data.data;
                    state.totalProducts = data.results || data.data.length;
                    renderProductsList(data.data, state.totalProducts, page, state.limit);
                    // Also extract categories for filter
                    extractCategories(data.data);
                }
            }

            async function loadAdminProducts() {
                const data = await fetchProducts(1, 100, '', '-createdAt', '');
                if (data && data.data) {
                    renderAdminTable(data.data);
                }
            }

            function extractCategories(products) {
                const cats = new Set();
                products.forEach(p => { if (p.category) cats.add(p.category); });
                state.categories = Array.from(cats);
                const sel = $('#categoryFilter');
                const currentVal = sel.value;
                sel.innerHTML = '<option value="">كل الأقسام</option>' +
                    state.categories.map(c => `<option value="${c}">${c}</option>`).join('');
                sel.value = currentVal || '';
            }

            // ===========================================================
            //  9.  VIEW PRODUCT DETAIL
            // ===========================================================
            async function viewProductDetail(slug) {
                const product = await fetchProductBySlug(slug);
                if (product) {
                    state.selectedSlug = slug;
                    navigateTo('productDetail', product);
                } else {
                    showToast('المنتج غير موجود', 'error');
                    navigateTo('products');
                }
            }

            // ===========================================================
            //  10. ADMIN MODAL
            // ===========================================================
            const modal = $('#adminModal');
            const modalOverlay = $('#adminModalOverlay');
            const modalClose = $('#adminModalClose');
            const modalTitle = $('#adminModalTitle');
            const modalForm = $('#adminProductForm');
            const editIdField = $('#adminEditId');
            const adminName = $('#adminName');
            const adminPrice = $('#adminPrice');
            const adminDescription = $('#adminDescription');
            const adminCategory = $('#adminCategory');
            const adminStock = $('#adminStock');
            const submitBtn = $('#adminSubmitBtn');

            function openAdminModal(title, product = null) {
                modalTitle.textContent = title;
                if (product) {
                    editIdField.value = product.slug || product._id || '';
                    adminName.value = product.name || '';
                    adminPrice.value = product.price || '';
                    adminDescription.value = product.description || '';
                    adminCategory.value = product.category || '';
                    adminStock.value = product.stock || 0;
                    submitBtn.textContent = 'تحديث المنتج';
                } else {
                    editIdField.value = '';
                    adminName.value = '';
                    adminPrice.value = '';
                    adminDescription.value = '';
                    adminCategory.value = '';
                    adminStock.value = 0;
                    submitBtn.textContent = 'إضافة المنتج';
                }
                modal.classList.remove('hidden');
            }

            function closeAdminModal() {
                modal.classList.add('hidden');
                modalForm.reset();
                editIdField.value = '';
            }

            async function openAdminEdit(slug) {
                const product = await fetchProductBySlug(slug);
                if (product) {
                    openAdminModal('تعديل المنتج', product);
                } else {
                    showToast('لم يتم العثور على المنتج', 'error');
                }
            }

            // ---- Modal events ----
            modalOverlay.addEventListener('click', closeAdminModal);
            modalClose.addEventListener('click', closeAdminModal);

            modalForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const data = {
                    name: adminName.value.trim(),
                    price: parseFloat(adminPrice.value),
                    description: adminDescription.value.trim(),
                    category: adminCategory.value.trim(),
                    stock: parseInt(adminStock.value) || 0,
                };
                const editId = editIdField.value;
                if (editId) {
                    // Update
                    const updated = await updateProduct(editId, data);
                    if (updated) {
                        closeAdminModal();
                        await loadAdminProducts();
                        // Also refresh product list if we're on products view
                        if (document.getElementById('viewProducts').classList.contains('active')) {
                            loadProductsPage(state.currentPage);
                        }
                        // Refresh detail if open
                        if (document.getElementById('viewProductDetail').classList.contains('active') && state.selectedSlug ===
                            editId) {
                            viewProductDetail(editId);
                        }
                    }
                } else {
                    // Create
                    const created = await createProduct(data);
                    if (created) {
                        closeAdminModal();
                        await loadAdminProducts();
                        if (document.getElementById('viewProducts').classList.contains('active')) {
                            loadProductsPage(state.currentPage);
                        }
                        loadHomeProducts();
                    }
                }
            });

            // ===========================================================
            //  11. UI UPDATE (Navbar, Auth state)
            // ===========================================================
            function updateUI() {
                const isLoggedIn = !!state.token && !!state.user;
                const isAdmin = isLoggedIn && state.user && state.user.role === 'admin';

                // Auth buttons
                $('#btnLogin').classList.toggle('hidden', isLoggedIn);
                $('#btnSignup').classList.toggle('hidden', isLoggedIn);
                $('#btnLogout').classList.toggle('hidden', !isLoggedIn);

                // Greeting
                const greeting = $('#userGreeting');
                if (isLoggedIn) {
                    greeting.classList.remove('hidden');
                    console.log(state.user.name)
                    greeting.textContent = `مرحباً، ${state.user.name || 'مستخدم'}`;
                } else {
                    greeting.classList.add('hidden');
                }

                // Admin nav links
                const adminLinks = ['#navAdmin', '#mobileAdminLink'];
                adminLinks.forEach(sel => {
                    const el = document.querySelector(sel);
                    if (el) el.classList.toggle('hidden', !isAdmin);
                });

                // If admin view is active but user is no longer admin, redirect
                if (document.getElementById('viewAdmin').classList.contains('active') && !isAdmin) {
                    navigateTo('home');
                }
            }

            // ===========================================================
            //  12. EVENT BINDING
            // ===========================================================

            // ---- Navigation ----
            $('#navHome').addEventListener('click', () => navigateTo('home'));
            $('#navProducts').addEventListener('click', () => {
                navigateTo('products');
                loadProductsPage(1);
            });
            $('#navAdmin').addEventListener('click', () => {
                navigateTo('admin');
                loadAdminProducts();
            });
            $('#homeViewAllBtn').addEventListener('click', () => {
                navigateTo('products');
                loadProductsPage(1);
            });
            $('#backToProducts').addEventListener('click', () => {
                navigateTo('products');
                loadProductsPage(state.currentPage);
            });
            $('#navLogo').addEventListener('click', () => navigateTo('home'));

            // Mobile menu
            $('#mobileMenuToggle').addEventListener('click', () => {
                const menu = $('#mobileMenu');
                menu.classList.toggle('hidden');
            });
            $('#mobileMenu').querySelectorAll('[data-view]').forEach(btn => {
                btn.addEventListener('click', function() {
                    const view = this.dataset.view;
                    if (view === 'products') {
                        navigateTo('products');
                        loadProductsPage(1);
                    } else if (view === 'admin') {
                        navigateTo('admin');
                        loadAdminProducts();
                    } else {
                        navigateTo(view);
                    }
                    $('#mobileMenu').classList.add('hidden');
                });
            });

            // ---- Auth ----
            $('#btnLogin').addEventListener('click', () => navigateTo('login'));
            $('#btnSignup').addEventListener('click', () => navigateTo('signup'));
            $('#btnLogout').addEventListener('click', logout);

            $('#loginToSignup').addEventListener('click', () => navigateTo('signup'));
            $('#signupToLogin').addEventListener('click', () => navigateTo('login'));

            // ---- Login form ----
            $('#loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const email = $('#loginEmail').value.trim();
                const password = $('#loginPassword').value;
                if (!email || !password) {
                    showToast('برجاء إدخال الإيميل والباسورد', 'error');
                    return;
                }
                await handleLogin(email, password);
            });

            // ---- Signup form ----
            $('#signupForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const name = $('#signupName').value.trim();
                const email = $('#signupEmail').value.trim();
                const password = $('#signupPassword').value;
                const passwordConfirm = $('#signupPasswordConfirm').value;
                if (!name || !email || !password || !passwordConfirm) {
                    showToast('برجاء ملء جميع الحقول', 'error');
                    return;
                }
                if (password !== passwordConfirm) {
                    showToast('كلمات المرور غير متطابقة!', 'error');
                    return;
                }
                if (password.length < 8) {
                    showToast('كلمة المرور يجب أن لا تقل عن 8 أحرف', 'error');
                    return;
                }
                await handleSignup(name, email, password, passwordConfirm);
            });

            // ---- Admin ----
            $('#adminOpenCreate').addEventListener('click', () => openAdminModal('إضافة منتج'));

            // ---- Products filter / sort ----
            $('#searchInput').addEventListener('input', function() {
                state.searchTerm = this.value.trim();
                loadProductsPage(1);
            });
            $('#sortSelect').addEventListener('change', function() {
                state.sortBy = this.value;
                loadProductsPage(1);
            });
            $('#categoryFilter').addEventListener('change', function() {
                state.categoryFilter = this.value;
                loadProductsPage(1);
            });

            // ---- Keyboard: Escape to close modal ----
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (!modal.classList.contains('hidden')) closeAdminModal();
                }
            });

            // ===========================================================
            //  13. INIT
            // ===========================================================
            async function init() {
                // Restore token & user
                if (state.token) {
                    await fetchMe();
                }
                updateUI();

                // Load home products
                await loadHomeProducts();

                // Preload product list in background
                // But we'll load on demand when user navigates to products.

                // If user is admin, preload admin data (optional)
                if (state.user && state.user.role === 'admin') {
                    // We'll load when admin view is opened.
                }

                // Handle hash-based deep linking? Not needed for this MVP.

                // Show home by default
                navigateTo('home');

                console.log('🚀 متجرنا frontend initialized');
            }

            // Start the app
            init();

            // Expose some functions for debugging
            window.__app = {
                state,
                navigateTo,
                loadProductsPage,
                loadAdminProducts,
                viewProductDetail,
                logout,
                showToast,
            };

        })();