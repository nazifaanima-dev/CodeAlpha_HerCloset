const state = {
  products: [],
  category: "All",
  sort: "featured",
  cart: [],
  wishlist: new Set(),
  search: "",
  user: null
};

try {
  state.cart = JSON.parse(localStorage.getItem("hercloset-cart") || "[]");
  state.wishlist = new Set(JSON.parse(localStorage.getItem("hercloset-wishlist") || "[]"));
} catch (_) {
  state.cart = [];
  state.wishlist = new Set();
}

function persistShoppingState() {
  localStorage.setItem("hercloset-cart", JSON.stringify(state.cart));
  localStorage.setItem("hercloset-wishlist", JSON.stringify([...state.wishlist]));
}

const $ = (selector) => document.querySelector(selector);

const money = (value) =>
  "৳" + Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2
  });

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function productImage(product) {
  const imagePath = String(product.image || "").trim();

  if (!imagePath) {
    return "https://placehold.co/600x750/f0ede4/747c55?text=HerCloset";
  }

  if (/^https:\/\//i.test(imagePath)) {
    return imagePath;
  }

  const cleanPath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = cleanPath.split("/");

  if (
    parts.some(part => part === "." || part === "..") ||
    !parts.every(part => /^[a-zA-Z0-9_\-. ]+$/.test(part)) ||
    !/\.(jpg|jpeg|jfif|png|webp|gif|avif|svg|bmp|tif|tiff)$/i.test(cleanPath)
  ) {
    return "https://placehold.co/600x750/f0ede4/747c55?text=HerCloset";
  }

  return "/" + cleanPath
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/");
}

async function loadProducts() {
  const grid = $("#product-grid");
  grid.innerHTML = '<div class="loading-state">Finding your favourites… ✳</div>';

  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("The product service is not ready yet.");
    }

    const data = await response.json();
    state.products = Array.isArray(data) ? data : data.products || [];

    if (document.body.classList.contains("products-page")) {
      const requestedCategory = new URLSearchParams(window.location.search).get("category");
      const availableCategories = [...new Set(state.products.map(p => p.category))];

      state.category = requestedCategory && availableCategories.includes(requestedCategory)
        ? requestedCategory
        : "All";

      const heading = document.querySelector(".shop-topline h2");

      if (heading) {
        heading.innerHTML = state.category === "All"
          ? "Shop <em>all products.</em>"
          : escapeHTML(state.category) + " <em>collection.</em>";
      }
    }

    renderProducts();
  } catch (error) {
    console.error("Could not load products:", error);

    grid.innerHTML = `
      <div class="empty-state">
        <p>Our edit is getting ready ✳</p>
        <p>We'll have your favourite finds here soon.</p>
      </div>`;
  }
}

function getVisibleProducts() {
  let products = [...state.products];

  if (state.category !== "All") {
    products = products.filter(product => product.category === state.category);
  }

  if (state.search.trim()) {
    const term = state.search.trim().toLowerCase();

    products = products.filter(product =>
      [product.name, product.category, product.description]
        .some(value => String(value || "").toLowerCase().includes(term))
    );
  }

  switch (state.sort) {
    case "low":
      products.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case "high":
      products.sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case "name":
      products.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return products;
}

function renderProducts() {
  const grid = $("#product-grid");
  const products = getVisibleProducts();
  const isProductsPage = document.body.classList.contains("products-page");

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>No finds here just yet.</p>
        <p>Try another category or search.</p>
      </div>`;
    return;
  }

  const cardHTML = (product) => {
    const id = Number(product.id);
    const liked = state.wishlist.has(id);

    return `
      <article class="product-card" data-product-id="${id}">
        <div class="product-image">
          <img src="${escapeHTML(productImage(product))}"
            alt="${escapeHTML(product.name)}" loading="lazy">

          <span class="product-tag">${escapeHTML(product.category)}</span>

          <button class="wishlist-button ${liked ? "liked" : ""}"
            data-action="wishlist" data-id="${id}"
            aria-label="${liked ? "Remove from" : "Add to"} wishlist"
            aria-pressed="${liked}">
            ${liked ? "♥" : "♡"}
          </button>

          <button class="quick-add" data-action="add" data-id="${id}"
            ${Number(product.stock) <= 0 ? "disabled" : ""}>
            ${Number(product.stock) <= 0 ? "Sold out" : "Add to bag +"}
          </button>
        </div>

        <div class="product-info">
          <div class="product-category">${escapeHTML(product.category)}</div>
          <h3 class="product-name">${escapeHTML(product.name)}</h3>
          <div class="product-price">${money(product.price)}</div>
        </div>
      </article>`;
  };

  if (isProductsPage) {
    grid.classList.remove("category-row-container");
    grid.innerHTML = products.map(cardHTML).join("");

    document.querySelectorAll("[data-filter]").forEach(button => {
      button.classList.toggle("active", button.dataset.filter === state.category);
    });

    return;
  }

  const groups = {};

  products.forEach(product => {
    const category = product.category || "Other";
    if (!groups[category]) groups[category] = [];
    groups[category].push(product);
  });

  grid.classList.add("category-row-container");

  grid.innerHTML = Object.entries(groups).map(([category, items]) => `
    <section class="category-row-section">
      <div class="category-row-heading">
        <div>
          <div class="eyebrow">THE COLLECTION</div>
          <h3>${escapeHTML(category)}</h3>
        </div>

        <a class="text-link category-see-all"
          href="/products.html?category=${encodeURIComponent(category)}">
          See all <span aria-hidden="true">↗</span>
        </a>
      </div>

      <div class="category-product-row">
        ${items.map(cardHTML).join("")}
      </div>
    </section>
  `).join("");
}

function setCategory(category) {
  state.category = category;

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === category);
  });

  renderProducts();
}

function requiresSize(product) {
  return ["Clothing", "Footwear"].includes(product.category);
}

function getProductSizes(product) {
  if (product.category === "Clothing") {
    return ["XS", "S", "M", "L", "XL", "XXL"];
  }

  if (product.category === "Footwear") {
    return ["36", "37", "38", "39", "40", "41", "42"];
  }

  return [];
}

function addToCart(id, size = null) {
  const product = state.products.find(item => Number(item.id) === id);
  if (!product) return;

  const inBag = state.cart.find(
    item => Number(item.id) === id && (item.size || null) === size
  );

  if (
    Number(product.stock) <= 0 ||
    (inBag && inBag.quantity >= Number(product.stock))
  ) {
    alert("Sorry, the available stock limit has been reached.");
    return;
  }

  if (requiresSize(product) && !size) {
    alert("Please select your size first.");
    return;
  }

  const existing = state.cart.find(
    item => Number(item.id) === id && (item.size || null) === size
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ ...product, size, quantity: 1 });
  }

  persistShoppingState();
  renderCart();
  openBag();
}

function changeQuantity(id, amount, size = null) {
  const item = state.cart.find(
    product => Number(product.id) === id &&
      (product.size || null) === size
  );

  if (!item) return;

  const product = state.products.find(p => Number(p.id) === id);

  if (
    amount > 0 &&
    product &&
    item.quantity >= Number(product.stock)
  ) {
    alert("Only the available stock can be added to your bag.");
    return;
  }

  item.quantity += amount;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(
      product => !(Number(product.id) === id &&
        (product.size || null) === size)
    );
  }

  persistShoppingState();
  renderCart();
}

function renderCart() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  $("#bag-count").textContent = count;

  const container = $("#bag-items");

  if (!state.cart.length) {
    container.innerHTML = `
      <div class="bag-empty">
        Your bag is waiting for something lovely ♡
      </div>`;
  } else {
    container.innerHTML = state.cart.map(item => `
      <div class="bag-item">
        <img src="${escapeHTML(productImage(item))}" alt="">

        <div>
          <h3>${escapeHTML(item.name)}</h3>

          ${item.size
            ? `<p>Size: ${escapeHTML(item.size)}${item.category === "Footwear" ? " (EU)" : ""}</p>`
            : ""}

          <p>${money(item.price)}</p>

          <div class="quantity-control">
            <button data-action="quantity" data-id="${Number(item.id)}"
              data-size="${escapeHTML(item.size || "")}"
              data-change="-1" aria-label="Decrease quantity">−</button>

            <span>${item.quantity}</span>

            <button data-action="quantity" data-id="${Number(item.id)}"
              data-size="${escapeHTML(item.size || "")}"
              data-change="1" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <button class="remove-item" data-action="remove"
          data-id="${Number(item.id)}"
          data-size="${escapeHTML(item.size || "")}"
          aria-label="Remove item">×</button>
      </div>
    `).join("");
  }

  const total = state.cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity, 0
  );

  $("#bag-total").textContent = money(total);
  persistShoppingState();
}

function openBag() {
  $("#bag-panel").classList.add("open");
  $("#bag-panel").setAttribute("aria-hidden", "false");
  $("#overlay").hidden = false;
  document.body.classList.add("panel-open");
}

function closeBag() {
  $("#bag-panel").classList.remove("open");
  $("#bag-panel").setAttribute("aria-hidden", "true");
  $("#overlay").hidden = true;
  document.body.classList.remove("panel-open");
}

function openProduct(id) {
  const product = state.products.find(item => Number(item.id) === id);
  if (!product) return;

  const sizes = getProductSizes(product);

  const sizeSelector = sizes.length ? `
    <div class="size-picker">
      <span class="size-label">Choose your size</span>

      <div class="size-options" role="radiogroup" aria-label="Choose your size">
        ${sizes.map(size => `
          <label class="size-option">
            <input type="radio" name="product-size" value="${size}">
            <span>${product.category === "Footwear" ? "EU " : ""}${size}</span>
          </label>
        `).join("")}
      </div>

      <p class="size-error" id="size-error" hidden>
        Please choose your size first.
      </p>
    </div>
  ` : "";

  $("#product-detail").innerHTML = `
    <div class="product-detail-layout">
      <div class="product-detail-image">
        <img src="${escapeHTML(productImage(product))}"
          alt="${escapeHTML(product.name)}">
      </div>

      <div class="product-detail-copy">
        <div class="eyebrow">${escapeHTML(product.category)}</div>
        <h2>${escapeHTML(product.name)}</h2>
        <strong>${money(product.price)}</strong>

        <p>${escapeHTML(product.description || "A lovely find from HerCloset.")}</p>

        <p class="product-stock-note">
          ${Number(product.stock) > 0
            ? `${Number(product.stock)} available`
            : "Currently sold out"}
        </p>

        ${sizeSelector}

        <button class="primary-button" data-action="add"
          data-id="${Number(product.id)}"
          ${Number(product.stock) <= 0 ? "disabled" : ""}>
          ${Number(product.stock) <= 0 ? "Sold out" : "Add to bag +"}
        </button>
      </div>
    </div>`;

  $("#product-dialog").showModal();
}

// Category filters
$("#category-filters").addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (button) setCategory(button.dataset.filter);
});

document.querySelector(".category-list").addEventListener("click", event => {
  const link = event.target.closest("[data-category]");
  if (!link) return;

  event.preventDefault();

  window.location.href =
    "/products.html?category=" + encodeURIComponent(link.dataset.category);
});

// Sorting
$("#sort-products").addEventListener("change", event => {
  state.sort = event.target.value;
  renderProducts();
});

// Search
$("#search-toggle").addEventListener("click", () => {
  const term = prompt("What are you looking for?");
  if (term === null) return;

  state.search = term;
  renderProducts();
  $("#shop").scrollIntoView({ behavior: "smooth" });
});

// Product actions
$("#product-grid").addEventListener("click", event => {
  const button = event.target.closest("[data-action]");

  if (button) {
    const id = Number(button.dataset.id);

    if (button.dataset.action === "add") {
      const product = state.products.find(item => Number(item.id) === id);

      if (product && requiresSize(product)) {
        openProduct(id);
      } else {
        addToCart(id);
      }
    }

    if (button.dataset.action === "wishlist") {
      if (state.wishlist.has(id)) {
        state.wishlist.delete(id);
      } else {
        state.wishlist.add(id);
      }

      persistShoppingState();
      renderProducts();
    }

    return;
  }

  const card = event.target.closest(".product-card");

  if (card) {
    openProduct(Number(card.dataset.productId));
  }
});

// Cart events
$("#bag-toggle").addEventListener("click", openBag);
$("#overlay").addEventListener("click", closeBag);

document.querySelectorAll("[data-close-panel]").forEach(button => {
  button.addEventListener("click", closeBag);
});

$("#bag-items").addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);

  if (button.dataset.action === "quantity") {
    changeQuantity(
      id,
      Number(button.dataset.change),
      button.dataset.size || null
    );
  }

  if (button.dataset.action === "remove") {
    const size = button.dataset.size || null;

    state.cart = state.cart.filter(
      item => !(Number(item.id) === id && (item.size || null) === size)
    );

    persistShoppingState();
    renderCart();
  }
});

// Profile UI
function ensureAccountProfileUI() {
  if (document.getElementById("account-profile")) return;

  const style = document.createElement("style");
  style.id = "account-profile-styles";

  style.textContent = `
    .account-profile-card {
      margin: 20px 0 18px;
      padding: 22px;
      border: 1px solid #e5e0d5;
      border-radius: 20px;
      background: #fffefa;
    }

    .account-profile-heading {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }

    .account-profile-avatar {
      width: 54px;
      height: 54px;
      flex: 0 0 54px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #777f58;
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 23px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .account-profile-title {
      margin: 0;
      color: #292820;
      font-size: 18px;
      font-weight: 650;
    }

    .account-profile-subtitle {
      margin: 5px 0 0;
      color: #858276;
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .account-profile-details {
      display: grid;
      gap: 12px;
      margin: 0;
    }

    .account-profile-details div {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      padding-top: 13px;
      border-top: 1px solid #e5e0d5;
    }

    .account-profile-details dt {
      color: #858276;
      font-size: 13px;
    }

    .account-profile-details dd {
      margin: 0;
      color: #292820;
      font-size: 13px;
      font-weight: 600;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .account-profile-actions {
      display: grid;
      gap: 11px;
      margin-top: 20px;
    }

    .account-profile-actions button {
      width: 100%;
    }

    .account-profile-orders-button {
      min-height: 49px;
      border: none;
      border-radius: 30px;
      background: #777f58;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background .2s ease, transform .2s ease;
    }

    .account-profile-orders-button:hover {
      background: #626b45;
      transform: translateY(-1px);
    }

    .profile-logout-button {
      min-height: 49px;
      border: 1px solid #b96e59;
      border-radius: 30px;
      background: transparent;
      color: #a45f4b;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background .2s ease, color .2s ease;
    }

    .profile-logout-button:hover {
      background: #a45f4b;
      color: #fff;
    }

    #account-form[hidden],
    #account-profile[hidden] {
      display: none !important;
    }

    @media (max-width: 480px) {
      .account-profile-card {
        padding: 17px;
      }

      .account-profile-details div {
        align-items: flex-start;
      }
    }
  `;

  document.head.appendChild(style);

  const profile = document.createElement("section");
  profile.id = "account-profile";
  profile.className = "account-profile-card";
  profile.hidden = true;

  profile.innerHTML = `
    <div class="account-profile-heading">
      <div class="account-profile-avatar"
        id="profile-user-avatar"
        aria-hidden="true">C</div>

      <div>
        <h3 class="account-profile-title" id="profile-user-name">
          My account
        </h3>

        <p class="account-profile-subtitle" id="profile-user-email"></p>
      </div>
    </div>

    <dl class="account-profile-details">
      <div>
        <dt>Account type</dt>
        <dd id="profile-user-role">Customer</dd>
      </div>
    </dl>

    <div class="account-profile-actions">
      <button class="account-profile-orders-button"
        id="profile-orders-button"
        type="button">
        View my orders
      </button>

      <button class="profile-logout-button"
        id="profile-logout-button"
        type="button">
        Log out
      </button>
    </div>
  `;

  const ordersPanel = document.getElementById('my-orders-list');
  if (ordersPanel) profile.appendChild(ordersPanel);
  const status = document.getElementById("account-status");

  if (status) {
    status.insertAdjacentElement("afterend", profile);
  }

  profile.querySelector("#profile-orders-button").addEventListener("click", () => {
    $("#my-orders-button").click();
  });

  profile.querySelector("#profile-logout-button").addEventListener("click", logoutUser);
}

function renderAccountView() {
  ensureAccountProfileUI();

  const profile = $("#account-profile");
  const form = $("#account-form");
  const status = $("#account-status");

  const ordersButton = $("#my-orders-button");

  if (state.user) {
    form.hidden = true;
    profile.hidden = false;

    status.textContent = "You are signed in to your HerCloset account.";

    $("#profile-user-name").textContent =
      state.user.name || "HerCloset customer";

    $("#profile-user-email").textContent =
      state.user.email || "";

    $("#profile-user-avatar").textContent =
      (state.user.name || "C").trim().charAt(0).toUpperCase();

    $("#profile-user-role").textContent =
      state.user.role === "admin" ? "Administrator" : "Customer";

    // Hide original duplicate orders button.
    ordersButton.hidden = true;

  } else {
    profile.hidden = true;
    form.hidden = false;

    status.textContent =
      "Sign in or create an account to place an order.";

    ordersButton.hidden = true;

    $("#auth-name").hidden =
      $("#auth-mode").value !== "register";

    $("#account-submit").textContent =
      $("#auth-mode").value === "register"
        ? "Create account"
        : "Log in";
  }
}

// Check logged-in user
async function refreshAccount() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      throw new Error("Could not check your account session.");
    }

    const data = await response.json();
    state.user = data.user || null;

    const adminLink = document.getElementById("admin-studio-link");

    if (state.user?.role === "admin" && !adminLink) {
      const link = document.createElement("a");

      link.id = "admin-studio-link";
      link.href = "/admin.html";
      link.className = "admin-studio-link";
      link.textContent = "Admin Studio";

      document.querySelector(".header-actions").prepend(link);
    }

    if (state.user?.role !== "admin" && adminLink) {
      adminLink.remove();
    }

    $("#account-button").innerHTML = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.5 3.3-5.5 7-5.5s6.4 2 7 5.5"/></svg>';

    $("#account-button").setAttribute(
      "aria-label",
      state.user
        ? "My profile"
        : "Log in or create an account"
    );

    renderAccountView();

  } catch (error) {
    console.error("Account check failed:", error);
  }
}

// Logout
async function logoutUser() {
  const button = $("#profile-logout-button");

  if (button) {
    button.disabled = true;
    button.textContent = "Logging out…";
  }

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Could not log out. Please try again.");
    }

    state.user = null;

    document.getElementById("admin-studio-link")?.remove();

    $("#my-orders-list").hidden = true;
    $("#my-orders-list").innerHTML = "";

    $("#account-form").reset();
    $("#auth-mode").value = "login";

    renderAccountView();

    $("#auth-message").textContent = "You have been logged out.";

  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent = "Log out";
    }

    alert(error.message);
  }
}

// Checkout
$("#checkout-button").addEventListener("click", async () => {
  if (!state.cart.length) {
    return alert("Your bag is empty.");
  }

  closeBag();
  await refreshAccount();

  if (!state.user) {
    $("#account-dialog").showModal();

    $("#auth-message").textContent =
      "Please log in or create an account before checkout.";

    return;
  }

  $("#checkout-total").textContent = money(
    state.cart.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    )
  );

  $("#checkout-dialog").showModal();
});

// Profile button
$("#account-button").addEventListener("click", async () => {
  await refreshAccount();
  $("#account-dialog").showModal();
});

// Close account dialog
$("#account-close").addEventListener("click", () => {
  $("#account-dialog").close();
});

// Login / Register selector
$("#auth-mode").addEventListener("change", () => {
  const register = $("#auth-mode").value === "register";

  $("#auth-name").hidden = !register;

  $("#account-submit").textContent =
    register ? "Create account" : "Log in";
});

// Login and registration
$("#account-form").addEventListener("submit", async event => {
  event.preventDefault();

  const mode = $("#auth-mode").value;

  if (state.user) {
    await logoutUser();
    return;
  }

  const payload = {
    name: $("#auth-name").value,
    email: $("#auth-email").value,
    password: $("#auth-password").value
  };

  try {
    const response = await fetch(
      `/api/auth/${mode === "register" ? "register" : "login"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not sign in.");
    }

    state.user = data.user;

    await refreshAccount();

    // Admin goes to admin dashboard.
    if (state.user?.role === "admin") {
      $("#account-dialog").close();
      window.location.href = "/admin.html";
      return;
    }

    // Customer login: close popup and return to homepage.
    $("#account-dialog").close();

    // Continue checkout only when cart contains products.
    if (state.cart.length) {
      $("#checkout-total").textContent = money(
        state.cart.reduce(
          (sum, item) => sum + Number(item.price) * item.quantity,
          0
        )
      );

      $("#checkout-dialog").showModal();
    }

  } catch (error) {
    $("#auth-message").textContent = error.message;
  }
});

// Customer orders
$("#my-orders-button").addEventListener("click", async () => {
  const panel = $("#my-orders-list");

  panel.hidden = false;
  panel.innerHTML = "<p>Loading your orders…</p>";

  try {
    const response = await fetch("/api/orders", {
      credentials: "same-origin"
    });

    const orders = await response.json();

    if (!response.ok) {
      throw new Error(orders.error || "Could not load orders.");
    }

    panel.innerHTML = orders.length
      ? orders.map(order => `
          <article class="customer-order">
            <div>
              <strong>Order #${order.id}</strong>
              <span>${new Date(order.created_at).toLocaleDateString()}</span>
            </div>

            <p>
              ${order.items.map(item =>
                `${escapeHTML(item.name)} × ${item.quantity}${item.size ? ` (${escapeHTML(item.size)})` : ""}`
              ).join(", ")}
            </p>

            <div>
              <strong>${money(order.total)}</strong>
              <span class="order-status">${escapeHTML(order.status)}</span>
            </div>
          </article>
        `).join("")
      : "<p>You have not placed an order yet.</p>";

  } catch (error) {
    panel.textContent = error.message;
  }
});

// Checkout dialog
$("#checkout-close").addEventListener("click", () => {
  $("#checkout-dialog").close();
});

// Place order
$("#checkout-form").addEventListener("submit", async event => {
  event.preventDefault();

  const submit = $("#place-order");

  submit.disabled = true;
  submit.textContent = "Placing order…";

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",

      body: JSON.stringify({
        shippingAddress: $("#shipping-address").value,
        phone: $("#shipping-phone").value,

        items: state.cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          size: item.size || null
        }))
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Order could not be placed.");
    }

    state.cart = [];

    persistShoppingState();
    renderCart();

    $("#checkout-dialog").close();

    alert(
      `Thank you! Your order #${data.orderId} has been placed. Total: ${money(data.total)}. Payment: Cash on Delivery.`
    );

    loadProducts();

  } catch (error) {
    $("#checkout-message").textContent = error.message;

  } finally {
    submit.disabled = false;
    submit.textContent = "Place order · Cash on Delivery";
  }
});

// Close product dialog
$("#product-close").addEventListener("click", () => {
  $("#product-dialog").close();
});

// Product size and add to cart
$("#product-dialog").addEventListener("click", event => {
  const button = event.target.closest('[data-action="add"]');

  if (!button) return;

  const id = Number(button.dataset.id);

  const product = state.products.find(
    item => Number(item.id) === id
  );

  if (!product) return;

  let size = null;

  if (requiresSize(product)) {
    const checkedSize =
      document.querySelector('input[name="product-size"]:checked');

    size = checkedSize ? checkedSize.value : null;

    if (!size) {
      const error = $("#size-error");
      if (error) error.hidden = false;

      return;
    }
  }

  $("#product-dialog").close();
  addToCart(id, size);
});

// Newsletter
$("#newsletter-form").addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("#newsletter-email").value;

  try {
    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Subscription failed.");
    }

    $("#newsletter-message").textContent = data.message;
    $("#newsletter-form").reset();

  } catch (error) {
    $("#newsletter-message").textContent = error.message;
  }
});

// Initialize website
$("#year").textContent = new Date().getFullYear();

renderCart();
ensureAccountProfileUI();

refreshAccount().then(() => {
  if (new URLSearchParams(location.search).get("admin") === "login") {
    $("#account-dialog").showModal();
  }
});

loadProducts();
