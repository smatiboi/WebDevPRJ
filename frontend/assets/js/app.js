const API = '/api';
const OWNER_EMAILS = ['therealsmatiboi@gmail.com', 'threalsmatiboi@gmail.com'];
const state = {
  page: 1,
  limit: 10,
  editingBookId: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function token() {
  return localStorage.getItem('flms_token');
}

function currentUser() {
  const raw = localStorage.getItem('flms_user');
  return raw ? normalizeUser(JSON.parse(raw)) : null;
}

function setSession(data) {
  data.user = normalizeUser(data.user);
  localStorage.setItem('flms_token', data.token);
  localStorage.setItem('flms_user', JSON.stringify(data.user));
}

function normalizeUser(user) {
  if (user && OWNER_EMAILS.includes(String(user.email).toLowerCase())) {
    return { ...user, role: 'owner', status: 'active', canManageAdmins: true };
  }
  return user;
}

function clearSession() {
  localStorage.removeItem('flms_token');
  localStorage.removeItem('flms_user');
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

function flash(message, type = 'ok') {
  const box = $('#message');
  if (!box) return;
  box.textContent = message;
  box.className = `message ${type === 'error' ? 'error' : ''}`;
  box.classList.remove('hidden');
}

function fmt(value) {
  return value ? new Date(value).toLocaleDateString() : '-';
}

function requireAuth(roles = []) {
  const user = currentUser();
  if (!user || !token()) {
    window.location.href = '/login.html';
    return null;
  }
  if (roles.length && user.role !== 'owner' && !roles.includes(user.role)) {
    window.location.href = '/catalog.html';
    return null;
  }
  return user;
}

function setupShell(active) {
  let user = currentUser();
  const nav = $('#nav');
  const who = $('#whoami');
  if (!nav) return;
  const renderNav = () => {
    if (who && user) who.textContent = `${user.name} · ${user.role}`;

    const adminLinks = user && ['admin', 'librarian', 'owner'].includes(user.role)
      ? `<a href="/dashboard.html" data-nav="dashboard">Dashboard</a>
         <a href="/manage-books.html" data-nav="manage-books">Catalog Management</a>`
      : '';
    const userLinks = user && ['admin', 'owner'].includes(user.role)
      ? `<a href="/users.html" data-nav="users">User Management</a>`
      : '';
    nav.innerHTML = `
      <a href="/catalog.html" data-nav="catalog">Catalog</a>
      ${user ? '<a href="/loans.html" data-nav="loans">My Loans</a>' : ''}
      ${adminLinks}
      ${userLinks}
      ${user ? '<a href="/profile.html" data-nav="profile">Profile</a><button id="logoutBtn">Logout</button>' : '<a href="/login.html">Login</a>'}
    `;
    const activeLink = nav.querySelector(`[data-nav="${active}"]`);
    if (activeLink) activeLink.classList.add('active');
    $('#logoutBtn')?.addEventListener('click', () => {
      clearSession();
      window.location.href = '/login.html';
    });
  };

  renderNav();
  if (token()) {
    api('/auth/me')
      .then((data) => {
        user = normalizeUser(data.user);
        localStorage.setItem('flms_user', JSON.stringify(user));
        renderNav();
      })
      .catch(() => {});
  }
}

async function fillMeta() {
  const data = await api('/meta');
  $$('[data-departments]').forEach((select) => {
    select.innerHTML = '<option value="">Select department</option>' + data.departments
      .map((d) => `<option value="${d.id}">${d.name}</option>`).join('');
  });
  $$('[data-categories]').forEach((select) => {
    select.innerHTML = '<option value="">All categories</option>' + data.categories
      .map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  });
  return data;
}

async function initAuth(page) {
  await fillMeta().catch(() => {});
  $('#loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.target);
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form))
      });
      setSession(data);
      window.location.href = '/catalog.html';
    } catch (error) {
      flash(error.message, 'error');
    }
  });

  $('#registerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.target);
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
          departmentId: Number(form.get('departmentId'))
        })
      });
      setSession(data);
      window.location.href = '/catalog.html';
    } catch (error) {
      flash(error.message, 'error');
    }
  });

  $('#forgotForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
      });
      flash(`${data.message}${data.resetToken ? ` Token: ${data.resetToken}` : ''}`);
    } catch (error) {
      flash(error.message, 'error');
    }
  });

  $('#resetForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
      });
      flash(data.message);
    } catch (error) {
      flash(error.message, 'error');
    }
  });
}

async function loadCatalog() {
  setupShell('catalog');
  await fillMeta();
  const render = async () => {
    const params = new URLSearchParams(new FormData($('#filters')));
    params.set('page', state.page);
    params.set('limit', 12);
    const data = await api(`/books?${params}`);
    $('#books').innerHTML = data.data.map((book) => `
      <article class="card book-card">
        <img class="book-cover" src="${book.coverImage || '/assets/img/book-placeholder.svg'}" alt="">
        <div class="book-body">
          <h2 class="book-title">${book.title}</h2>
          <p class="subtitle">${book.author}</p>
          <p><span class="pill ${book.availableCopies > 0 ? 'ok' : 'bad'}">${book.availableCopies}/${book.totalCopies} available</span></p>
          <div class="actions">
            <a class="button secondary" href="/book.html?id=${book.id}">Details</a>
            <button data-borrow="${book.id}" ${book.availableCopies < 1 || !token() ? 'disabled' : ''}>Borrow</button>
          </div>
        </div>
      </article>
    `).join('');
    $('#pageInfo').textContent = `Page ${data.meta.page} of ${data.meta.totalPages}`;
    $('#prevPage').disabled = data.meta.page <= 1;
    $('#nextPage').disabled = data.meta.page >= data.meta.totalPages;
    $$('[data-borrow]').forEach((button) => button.addEventListener('click', () => borrow(button.dataset.borrow, render)));
  };
  $('#filters').addEventListener('submit', (event) => {
    event.preventDefault();
    state.page = 1;
    render().catch((error) => flash(error.message, 'error'));
  });
  $('#resetFilters').addEventListener('click', () => {
    $('#filters').reset();
    state.page = 1;
    render().catch((error) => flash(error.message, 'error'));
  });
  $('#prevPage').addEventListener('click', () => { state.page -= 1; render(); });
  $('#nextPage').addEventListener('click', () => { state.page += 1; render(); });
  await render();
}

async function borrow(bookId, after) {
  if (!requireAuth()) return;
  try {
    const data = await api(`/loans/borrow/${bookId}`, { method: 'POST', body: '{}' });
    flash(data.message);
    if (after) await after();
  } catch (error) {
    flash(error.message, 'error');
  }
}

async function loadBookDetails() {
  setupShell('catalog');
  const id = new URLSearchParams(location.search).get('id');
  const data = await api(`/books/${id}`);
  const book = data.book;
  $('#bookDetail').innerHTML = `
    <div><img src="${book.coverImage || '/assets/img/book-placeholder.svg'}" alt=""></div>
    <div>
      <h1>${book.title}</h1>
      <p class="subtitle">${book.author} · ${book.publicationYear || 'Unknown year'}</p>
      <p><span class="pill">${book.category || 'Uncategorized'}</span> <span class="pill">${book.format}</span></p>
      <p>${book.description || 'No description available.'}</p>
      <p><strong>ISBN:</strong> ${book.isbn}</p>
      <p><strong>Shelf:</strong> ${book.shelfLocation || '-'}</p>
      <p><strong>Tags:</strong> ${book.tags || '-'}</p>
      <p><span class="pill ${book.availableCopies > 0 ? 'ok' : 'bad'}">${book.availableCopies}/${book.totalCopies} available</span></p>
      <button id="borrowDetail" ${book.availableCopies < 1 || !token() ? 'disabled' : ''}>Borrow Book</button>
    </div>
  `;
  $('#borrowDetail')?.addEventListener('click', () => borrow(book.id, loadBookDetails));
}

async function loadLoans() {
  requireAuth();
  setupShell('loans');
  const render = async () => {
    const data = await api('/loans/mine?limit=30');
    $('#loansTable').innerHTML = data.data.map((loan) => `
      <tr>
        <td>${loan.title}<br><span class="subtitle">${loan.author}</span></td>
        <td>${fmt(loan.borrowedAt)}</td>
        <td>${fmt(loan.dueAt)}</td>
        <td><span class="pill ${loan.status === 'overdue' ? 'bad' : 'ok'}">${loan.status}</span></td>
        <td>${loan.renewalCount}/2</td>
        <td class="actions">
          ${loan.returnedAt ? '-' : `<button data-renew="${loan.id}" class="secondary">Renew</button><button data-return="${loan.id}">Return</button>`}
        </td>
      </tr>
    `).join('');
    $$('[data-renew]').forEach((b) => b.addEventListener('click', () => loanAction(b.dataset.renew, 'renew', render)));
    $$('[data-return]').forEach((b) => b.addEventListener('click', () => loanAction(b.dataset.return, 'return', render)));
  };
  await render();
}

async function loanAction(id, action, after) {
  try {
    const data = await api(`/loans/${id}/${action}`, { method: 'POST', body: '{}' });
    flash(data.message);
    await after();
  } catch (error) {
    flash(error.message, 'error');
  }
}

async function loadDashboard() {
  requireAuth(['admin', 'librarian']);
  setupShell('dashboard');
  const data = await api('/dashboard');
  $('#stats').innerHTML = Object.entries(data.totals).map(([key, value]) => `
    <div class="card stat"><span>${key.replace(/([A-Z])/g, ' $1')}</span><strong>${value}</strong></div>
  `).join('');
  $('#recentLoans').innerHTML = data.recentLoans.map((loan) => `
    <tr><td>${loan.userName}</td><td>${loan.title}</td><td>${fmt(loan.borrowedAt)}</td><td>${fmt(loan.dueAt)}</td><td>${loan.status}</td></tr>
  `).join('');
}

async function loadManageBooks() {
  requireAuth(['admin', 'librarian']);
  setupShell('manage-books');
  await fillMeta();
  const render = async () => {
    const data = await api('/books?limit=50');
    $('#manageBooksTable').innerHTML = data.data.map((book) => `
      <tr>
        <td>${book.title}<br><span class="subtitle">${book.isbn}</span></td>
        <td>${book.author}</td>
        <td>${book.format}</td>
        <td>${book.availableCopies}/${book.totalCopies}</td>
        <td class="actions"><button class="secondary" data-edit="${book.id}">Edit</button><button class="danger" data-delete="${book.id}">Delete</button></td>
      </tr>
    `).join('');
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => editBook(b.dataset.edit)));
    $$('[data-delete]').forEach((b) => b.addEventListener('click', () => deleteBook(b.dataset.delete, render)));
  };
  $('#bookForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target));
    payload.categoryId = payload.categoryId ? Number(payload.categoryId) : null;
    payload.totalCopies = Number(payload.totalCopies);
    payload.availableCopies = Number(payload.availableCopies);
    const path = state.editingBookId ? `/books/${state.editingBookId}` : '/books';
    const method = state.editingBookId ? 'PUT' : 'POST';
    try {
      const data = await api(path, { method, body: JSON.stringify(payload) });
      flash(data.message);
      state.editingBookId = null;
      event.target.reset();
      await render();
    } catch (error) {
      flash(error.message, 'error');
    }
  });
  $('#importForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const data = await api('/books/bulk/import', { method: 'POST', body: form });
      flash(`${data.message} Imported: ${data.imported}`);
      await render();
    } catch (error) {
      flash(error.message, 'error');
    }
  });
  await render();
}

async function editBook(id) {
  const { book } = await api(`/books/${id}`);
  state.editingBookId = id;
  const form = $('#bookForm');
  Object.entries({
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    publisher: book.publisher,
    publicationYear: book.publicationYear,
    categoryId: book.categoryId,
    format: book.format,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
    shelfLocation: book.shelfLocation,
    coverImage: book.coverImage,
    tags: book.tags,
    description: book.description
  }).forEach(([name, value]) => {
    if (form.elements[name]) form.elements[name].value = value || '';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteBook(id, after) {
  if (!confirm('Delete this book from the catalog?')) return;
  try {
    const data = await api(`/books/${id}`, { method: 'DELETE' });
    flash(data.message);
    await after();
  } catch (error) {
    flash(error.message, 'error');
  }
}

async function loadUsers() {
  requireAuth(['admin']);
  setupShell('users');
  await fillMeta();
  $('#createRole').innerHTML = roleOptions()
    .map((role) => `<option value="${role}">${role}</option>`)
    .join('');
  const render = async () => {
    const data = await api('/users?limit=50');
    $('#usersTable').innerHTML = data.data.map((user) => `
      <tr>
        <td>${user.name}<br><span class="subtitle">${user.email}</span></td>
        <td>
          <select data-role="${user.id}">
            ${roleOptions().map((role) => `<option ${role === user.role ? 'selected' : ''}>${role}</option>`).join('')}
          </select>
        </td>
        <td>${user.department || '-'}</td>
        <td>
          <select data-status="${user.id}">
            ${['active', 'inactive'].map((status) => `<option ${status === user.status ? 'selected' : ''}>${status}</option>`).join('')}
          </select>
        </td>
        <td><button data-save-user="${user.id}">Save</button></td>
      </tr>
    `).join('');
    $$('[data-save-user]').forEach((b) => b.addEventListener('click', () => saveUser(b.dataset.saveUser, render)));
  };
  $('#createUserForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const data = await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
          role: form.get('role'),
          departmentId: form.get('departmentId') ? Number(form.get('departmentId')) : null,
          status: form.get('status')
        })
      });
      flash(data.message);
      event.target.reset();
      await render();
    } catch (error) {
      flash(error.message, 'error');
    }
  });
  await render();
}

function roleOptions() {
  const user = currentUser();
  const roles = ['student', 'faculty', 'librarian', 'admin'];
  if (user?.role === 'owner') roles.push('owner');
  return roles;
}

async function saveUser(id, after) {
  try {
    const data = await api(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        role: $(`[data-role="${id}"]`).value,
        status: $(`[data-status="${id}"]`).value
      })
    });
    flash(data.message);
    await after();
  } catch (error) {
    flash(error.message, 'error');
  }
}

async function loadProfile() {
  let user = requireAuth();
  setupShell('profile');
  await fillMeta();
  try {
    const fresh = await api('/auth/me');
    user = normalizeUser(fresh.user);
    localStorage.setItem('flms_user', JSON.stringify(user));
    setupShell('profile');
  } catch (error) {
    flash(error.message, 'error');
  }
  $('#profileName').value = user.name;
  $('#profileEmail').value = user.email;
  $('#profileRole').value = user.role;
  $('#profileDepartment').value = user.departmentId || '';
  $('#profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = new FormData(event.target);
      const data = await api('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.get('name'),
          departmentId: Number(form.get('departmentId'))
        })
      });
      const fresh = await api('/auth/me');
      localStorage.setItem('flms_user', JSON.stringify(fresh.user));
      flash(data.message);
    } catch (error) {
      flash(error.message, 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  const handlers = {
    login: initAuth,
    register: initAuth,
    forgot: initAuth,
    catalog: loadCatalog,
    book: loadBookDetails,
    loans: loadLoans,
    dashboard: loadDashboard,
    manageBooks: loadManageBooks,
    users: loadUsers,
    profile: loadProfile
  };
  handlers[page]?.(page).catch((error) => flash(error.message, 'error'));
});
