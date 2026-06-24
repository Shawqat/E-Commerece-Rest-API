const apiRoot = '/api/products';
const state = {
    products: [],
    filteredProducts: [],
    editingSlug: null
};

const elements = {
    productsGrid: document.getElementById('productsGrid'),
    emptyState: document.getElementById('emptyState'),
    searchInput: document.getElementById('searchInput'),
    categorySelect: document.getElementById('categorySelect'),
    sortSelect: document.getElementById('sortSelect'),
    productForm: document.getElementById('productForm'),
    nameInput: document.getElementById('nameInput'),
    priceInput: document.getElementById('priceInput'),
    categoryInput: document.getElementById('categoryInput'),
    stockInput: document.getElementById('stockInput'),
    descriptionInput: document.getElementById('descriptionInput'),
    submitButton: document.getElementById('submitButton'),
    cancelEditButton: document.getElementById('cancelEditButton'),
    formTitle: document.getElementById('formTitle'),
    formSubtitle: document.getElementById('formSubtitle'),
    messageBox: document.getElementById('messageBox')
};

async function fetchProducts() {
    try {
        const response = await fetch(`${apiRoot}?limit=200`);
        if (!response.ok) throw new Error('Failed to load products');
        const json = await response.json();
        state.products = json.data || [];
        refreshFilters();
        renderProducts();
    } catch (error) {
        showMessage(error.message, true);
    }
}

function refreshFilters() {
    const categories = Array.from(new Set(state.products.map(product => product.category.trim().toLowerCase())));
    elements.categorySelect.innerHTML = '<option value="all">All categories</option>' + categories
        .sort()
        .map(category => `<option value="${category}">${capitalize(category)}</option>`)
        .join('');
}

function applyFilters() {
    const searchTerm = elements.searchInput.value.trim().toLowerCase();
    const selectedCategory = elements.categorySelect.value;
    const sortMode = elements.sortSelect.value;

    let filtered = state.products.filter(product => {
        const text = `${product.name} ${product.description}`.toLowerCase();
        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || product.category.trim().toLowerCase() === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (sortMode === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortMode === 'oldest') {
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortMode === 'priceAsc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortMode === 'priceDesc') {
        filtered.sort((a, b) => b.price - a.price);
    }

    state.filteredProducts = filtered;
    renderProducts();
}

function renderProducts() {
    const products = state.filteredProducts.length ? state.filteredProducts : state.products;
    elements.productsGrid.innerHTML = '';

    if (!products.length) {
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');

    products.forEach(product => {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = `
            <header>
                <div>
                    <h3>${escapeHtml(product.name)}</h3>
                    <p>${escapeHtml(product.category)}</p>
                </div>
                <div class="price-tag">${formatCurrency(product.price)}</div>
            </header>
            <p>${escapeHtml(product.description)}</p>
            <div class="product-meta">
                <span>Stock: ${product.stock ?? 0}</span>
                <span>Slug: ${escapeHtml(product.slug)}</span>
            </div>
            <div class="product-actions card-actions">
                <button class="btn btn-secondary" type="button" data-action="edit" data-slug="${product.slug}">Edit</button>
                <button class="btn btn-secondary" type="button" data-action="delete" data-slug="${product.slug}">Delete</button>
            </div>
        `;

        card.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(product));
        card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteProduct(product.slug, product.name));

        elements.productsGrid.appendChild(card);
    });
}

function startEdit(product) {
    state.editingSlug = product.slug;
    elements.formTitle.textContent = 'Edit Product';
    elements.formSubtitle.textContent = 'Update product details and save changes.';
    elements.submitButton.textContent = 'Save Changes';
    elements.cancelEditButton.classList.remove('hidden');
    elements.nameInput.value = product.name;
    elements.priceInput.value = product.price;
    elements.categoryInput.value = product.category;
    elements.stockInput.value = product.stock ?? 0;
    elements.descriptionInput.value = product.description;
    scrollToForm();
}

function resetForm() {
    state.editingSlug = null;
    elements.formTitle.textContent = 'Add New Product';
    elements.formSubtitle.textContent = 'Create a product that can be managed by the backend API.';
    elements.submitButton.textContent = 'Add Product';
    elements.cancelEditButton.classList.add('hidden');
    elements.productForm.reset();
    elements.stockInput.value = 0;
}

async function submitForm(event) {
    event.preventDefault();

    const productData = {
        name: elements.nameInput.value.trim(),
        price: Number(elements.priceInput.value),
        category: elements.categoryInput.value.trim(),
        stock: Number(elements.stockInput.value),
        description: elements.descriptionInput.value.trim()
    };

    if (!productData.name || !productData.category || !productData.description || Number.isNaN(productData.price)) {
        showMessage('Please fill in all required fields correctly.', true);
        return;
    }

    try {
        let response;
        if (state.editingSlug) {
            response = await fetch(`${apiRoot}/${encodeURIComponent(state.editingSlug)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
        } else {
            response = await fetch(apiRoot, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
        }

        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Request failed');

        showMessage(state.editingSlug ? 'Product updated successfully.' : 'Product added successfully.');
        resetForm();
        await fetchProducts();
    } catch (error) {
        showMessage(error.message, true);
    }
}

async function deleteProduct(slug, name) {
    const confirmed = window.confirm(`Delete product "${name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
        const response = await fetch(`${apiRoot}/${encodeURIComponent(slug)}`, {
            method: 'DELETE'
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Failed to delete product');

        showMessage('Product deleted successfully.');
        await fetchProducts();
    } catch (error) {
        showMessage(error.message, true);
    }
}

function showMessage(message, isError = false) {
    elements.messageBox.textContent = message;
    elements.messageBox.className = 'message-box';
    if (isError) {
        elements.messageBox.style.background = 'rgba(248, 113, 113, 0.14)';
        elements.messageBox.style.borderColor = 'rgba(248, 113, 113, 0.25)';
        elements.messageBox.style.color = '#fecaca';
    } else {
        elements.messageBox.style.background = 'rgba(34, 197, 94, 0.12)';
        elements.messageBox.style.borderColor = 'rgba(34, 197, 94, 0.2)';
        elements.messageBox.style.color = '#d1fae5';
    }
    elements.messageBox.classList.remove('hidden');
    window.clearTimeout(window.messageTimeout);
    window.messageTimeout = window.setTimeout(() => {
        elements.messageBox.classList.add('hidden');
    }, 5000);
}

function capitalize(text) {
    return text.replace(/(^|\s)\S/g, char => char.toUpperCase());
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function scrollToForm() {
    elements.productForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function bindEvents() {
    elements.searchInput.addEventListener('input', applyFilters);
    elements.categorySelect.addEventListener('change', applyFilters);
    elements.sortSelect.addEventListener('change', applyFilters);
    elements.productForm.addEventListener('submit', submitForm);
    elements.cancelEditButton.addEventListener('click', resetForm);
}

(async function init() {
    bindEvents();
    await fetchProducts();
})();
