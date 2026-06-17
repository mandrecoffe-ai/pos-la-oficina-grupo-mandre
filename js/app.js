// ==================== CONFIGURACIÓN FIREBASE ====================
const firebaseConfig = {
  apiKey: "AIzaSyBzsRQKBh-_P_S8s-4n5qTPYFGbiM_T6OY",
  authDomain: "la-oficina-grupo-mandre.firebaseapp.com",
  projectId: "la-oficina-grupo-mandre",
  storageBucket: "la-oficina-grupo-mandre.firebasestorage.app",
  messagingSenderId: "839406353836",
  appId: "1:839406353836:web:c7df84a66f37ab28e7ce09"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==================== VARIABLES GLOBALES ====================
let currentTable = null;
let order = [];
let tables = [];

// ==================== INICIALIZAR MESAS ====================
async function initTables() {
  const snapshot = await db.collection("mesas").get();
  
  if (snapshot.empty) {
    // Crear mesas iniciales
    tables = [
      { id: "T1", section: "terraza", x: 100, y: 100, status: "libre" },
      { id: "T2", section: "terraza", x: 220, y: 100, status: "libre" },
      { id: "T3", section: "terraza", x: 340, y: 100, status: "libre" },
      { id: "T4", section: "terraza", x: 100, y: 230, status: "libre" },
      { id: "T5", section: "terraza", x: 220, y: 230, status: "libre" },
      { id: "T6", section: "terraza", x: 340, y: 230, status: "libre" },
      { id: "I1", section: "interior", x: 500, y: 150, status: "libre" },
      { id: "I2", section: "interior", x: 500, y: 280, status: "libre" },
      { id: "I3", section: "interior", x: 500, y: 410, status: "libre" },
      { id: "B1", section: "barra",   x: 700, y: 150, status: "libre" },
      { id: "B2", section: "barra",   x: 700, y: 280, status: "libre" },
      { id: "B3", section: "barra",   x: 700, y: 410, status: "libre" }
    ];
    tables.forEach(table => saveTablePosition(table));
  } else {
    tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  renderTables();
}

// Guardar posición de una mesa
async function saveTablePosition(table) {
  await db.collection("mesas").doc(table.id).set(table, { merge: true });
}

// ==================== RENDER MESAS CON DRAG & DROP ====================
function renderTables() {
  const floor = document.getElementById("floor");
  floor.innerHTML = '';

  tables.forEach(table => {
    const div = document.createElement("div");
    div.className = `table ${table.status === 'ocupada' ? 'ocupada' : ''}`;
    div.textContent = table.id;
    div.style.left = `${table.x}px`;
    div.style.top = `${table.y}px`;
    div.draggable = true;

    // Drag & Drop
    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", table.id);
    });

    // Click para abrir pedido
    div.addEventListener("click", () => openOrderModal(table));

    floor.appendChild(div);
  });

  // Drop zone
  floor.addEventListener("dragover", (e) => e.preventDefault());
  floor.addEventListener("drop", (e) => {
    e.preventDefault();
    const tableId = e.dataTransfer.getData("text/plain");
    const table = tables.find(t => t.id === tableId);
    
    if (table) {
      const rect = floor.getBoundingClientRect();
      table.x = e.clientX - rect.left - 40;
      table.y = e.clientY - rect.top - 40;
      
      // Limitar dentro del área
      table.x = Math.max(20, Math.min(table.x, rect.width - 100));
      table.y = Math.max(20, Math.min(table.y, rect.height - 100));
      
      saveTablePosition(table);
      renderTables();
    }
  });
}

// ==================== MODAL DE PEDIDO ====================
function openOrderModal(table) {
  currentTable = table;
  document.getElementById("modal-table-name").textContent = table.id;
  document.getElementById("order-modal").classList.remove("hidden");
  
  order = []; // Aquí luego cargarías pedido guardado
  renderProductsInModal();
  renderOrder();
}

function closeOrderModal() {
  document.getElementById("order-modal").classList.add("hidden");
  currentTable = null;
}

// ==================== PRODUCTOS EN MODAL ====================
async function renderProductsInModal() {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = '';

  const snapshot = await db.collection("productos").get();
  
  snapshot.forEach(doc => {
    const p = doc.data();
    const div = document.createElement("div");
    div.className = "product-card";
    div.innerHTML = `
      <strong>${p.nombre}</strong><br>
      <span>$${p.precio}</span>
    `;
    div.onclick = () => agregarAlPedido(doc.id, p.nombre, p.precio);
    grid.appendChild(div);
  });
}

function agregarAlPedido(id, nombre, precio) {
  const existing = order.find(item => item.id === id);
  if (existing) {
    existing.cantidad++;
  } else {
    order.push({ id, nombre, precio, cantidad: 1 });
  }
  renderOrder();
}

function renderOrder() {
  const ul = document.getElementById("order-list");
  ul.innerHTML = '';
  let total = 0;

  order.forEach((item, index) => {
    total += item.precio * item.cantidad;
    const li = document.createElement("li");
    li.innerHTML = `
      ${item.nombre} ×${item.cantidad} 
      <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
      <button onclick="cambiarCantidad(${index}, 1)">+</button>
      <button onclick="cambiarCantidad(${index}, -1)">-</button>
    `;
    ul.appendChild(li);
  });

  document.getElementById("total-amount").textContent = total.toFixed(2);
}

window.cambiarCantidad = (index, delta) => {
  order[index].cantidad += delta;
  if (order[index].cantidad < 1) order.splice(index, 1);
  renderOrder();
};

// ==================== ACCIONES DE PEDIDO ====================
window.limpiarPedido = () => {
  order = [];
  renderOrder();
};

async function cerrarMesa() {
  if (!currentTable || order.length === 0) {
    alert("No hay pedido para cerrar");
    return;
  }

  const total = order.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  await db.collection("ventas").add({
    mesa: currentTable.id,
    fecha: firebase.firestore.Timestamp.now(),
    total: total,
    items: order,
    estado: "cerrada"
  });

  // Marcar mesa como libre
  currentTable.status = "libre";
  await saveTablePosition(currentTable);

  alert(`✅ Mesa ${currentTable.id} cerrada correctamente.\nTotal: $${total.toFixed(2)}`);
  
  closeOrderModal();
  renderTables();
}

// ==================== PANEL ADMIN ====================
function toggleAdmin() {
  const panel = document.getElementById("admin-panel");
  panel.classList.toggle("hidden");
}

async function guardarProducto() {
  const nombre = document.getElementById("prod-name").value.trim();
  const precio = parseFloat(document.getElementById("prod-price").value);
  const stock = parseInt(document.getElementById("prod-stock").value) || 50;

  if (!nombre || !precio) {
    alert("Por favor completa nombre y precio");
    return;
  }

  await db.collection("productos").add({ nombre, precio, stock });
  
  alert("Producto guardado correctamente");
  document.getElementById("prod-name").value = '';
  document.getElementById("prod-price").value = '';
}

// ==================== INICIO ====================
window.onload = () => {
  initTables();
};
