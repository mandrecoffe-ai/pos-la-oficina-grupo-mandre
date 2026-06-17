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

let currentTable = null;
let order = [];
let tables = [];

// ==================== INICIALIZAR MESAS ====================
async function initTables() {
  console.log("🔄 Intentando cargar mesas...");

  try {
    const snapshot = await db.collection("mesas").get();
    console.log("📊 Documentos encontrados:", snapshot.size);

    if (snapshot.empty) {
      console.log("🆕 No hay mesas guardadas, creando iniciales...");
      tables = [
        { id: "T1", x: 100, y: 100, status: "libre" },
        { id: "T2", x: 220, y: 100, status: "libre" },
        { id: "T3", x: 340, y: 100, status: "libre" },
        { id: "T4", x: 100, y: 230, status: "libre" },
        { id: "T5", x: 220, y: 230, status: "libre" },
        { id: "T6", x: 340, y: 230, status: "libre" },
        { id: "I1", x: 500, y: 150, status: "libre" },
        { id: "I2", x: 500, y: 280, status: "libre" },
        { id: "I3", x: 500, y: 410, status: "libre" },
        { id: "B1", x: 700, y: 150, status: "libre" },
        { id: "B2", x: 700, y: 280, status: "libre" },
        { id: "B3", x: 700, y: 410, status: "libre" }
      ];

      for (const table of tables) {
        await db.collection("mesas").doc(table.id).set(table);
      }
    } else {
      tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    console.log("✅ Mesas cargadas:", tables.length);
    renderTables();
  } catch (error) {
    console.error("❌ Error al cargar mesas:", error);
    alert("Error de Firebase: " + error.message + "\n\nRevisa la consola (F12)");
    
    // Fallback local si Firebase falla
    tables = [
      { id: "T1", x: 100, y: 100, status: "libre" },
      { id: "T2", x: 220, y: 100, status: "libre" },
      // ... (puedes agregar más)
    ];
    renderTables();
  }
}

// ==================== RENDER MESAS ====================
function renderTables() {
  const floor = document.getElementById("floor");
  if (!floor) {
    console.error("❌ No se encontró el elemento #floor");
    return;
  }

  floor.innerHTML = '';

  tables.forEach(table => {
    const div = document.createElement("div");
    div.className = `table ${table.status === 'ocupada' ? 'ocupada' : ''}`;
    div.textContent = table.id;
    div.style.left = `${table.x}px`;
    div.style.top = `${table.y}px`;
    div.draggable = true;

    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", table.id);
    });

    div.addEventListener("click", () => openOrderModal(table));

    floor.appendChild(div);
  });

  // Drop
  floor.ondragover = (e) => e.preventDefault();
  floor.ondrop = (e) => {
    e.preventDefault();
    const tableId = e.dataTransfer.getData("text/plain");
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const rect = floor.getBoundingClientRect();
    table.x = Math.max(20, Math.min(e.clientX - rect.left - 40, rect.width - 100));
    table.y = Math.max(20, Math.min(e.clientY - rect.top - 40, rect.height - 100));

    db.collection("mesas").doc(table.id).update({ x: table.x, y: table.y });
    renderTables();
  };
}

// ==================== MODAL ====================
function openOrderModal(table) {
  currentTable = table;
  document.getElementById("modal-table-name").textContent = table.id;
  document.getElementById("order-modal").classList.remove("hidden");
  renderProductsInModal();
  renderOrder();
}

function closeOrderModal() {
  document.getElementById("order-modal").classList.add("hidden");
  currentTable = null;
}

// ==================== PRODUCTOS ====================
async function renderProductsInModal() {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = '<p>Cargando productos...</p>';

  try {
    const snapshot = await db.collection("productos").get();
    grid.innerHTML = '';

    if (snapshot.empty) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">No hay productos. Agrega desde Admin.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const p = doc.data();
      const div = document.createElement("div");
      div.className = "product-card";
      div.innerHTML = `<strong>${p.nombre}</strong><br>$${p.precio}`;
      div.onclick = () => agregarAlPedido(doc.id, p.nombre, p.precio);
      grid.appendChild(div);
    });
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<p>Error al cargar productos</p>';
  }
}

// Resto de funciones (agregarAlPedido, renderOrder, etc.)
function agregarAlPedido(id, nombre, precio) {
  const existing = order.find(item => item.id === id);
  if (existing) existing.cantidad++;
  else order.push({ id, nombre, precio, cantidad: 1 });
  renderOrder();
}

function renderOrder() {
  const ul = document.getElementById("order-list");
  ul.innerHTML = '';
  let total = 0;

  order.forEach((item, i) => {
    total += item.precio * item.cantidad;
    const li = document.createElement("li");
    li.innerHTML = `${item.nombre} ×${item.cantidad} <span>$${(item.precio*item.cantidad).toFixed(2)}</span>
      <button onclick="cambiarCantidad(${i},1)">+</button>
      <button onclick="cambiarCantidad(${i},-1)">-</button>`;
    ul.appendChild(li);
  });

  document.getElementById("total-amount").textContent = total.toFixed(2);
}

window.cambiarCantidad = (index, delta) => {
  order[index].cantidad += delta;
  if (order[index].cantidad < 1) order.splice(index,1);
  renderOrder();
};

window.limpiarPedido = () => { order = []; renderOrder(); };

async function cerrarMesa() {
  if (!currentTable || order.length === 0) return alert("No hay pedido");
  
  const total = order.reduce((a, b) => a + b.precio * b.cantidad, 0);
  
  await db.collection("ventas").add({
    mesa: currentTable.id,
    fecha: firebase.firestore.Timestamp.now(),
    total,
    items: order
  });

  alert(`Mesa ${currentTable.id} cerrada - Total: $${total.toFixed(2)}`);
  closeOrderModal();
  renderTables();
}

function toggleAdmin() {
  document.getElementById("admin-panel").classList.toggle("hidden");
}

async function guardarProducto() {
  const nombre = document.getElementById("prod-name").value.trim();
  const precio = parseFloat(document.getElementById("prod-price").value);

  if (!nombre || !precio) return alert("Nombre y precio son obligatorios");

  await db.collection("productos").add({ nombre, precio, stock: 50 });
  alert("Producto guardado");
  document.getElementById("prod-name").value = "";
  document.getElementById("prod-price").value = "";
}

// ==================== INICIO ====================
window.onload = () => {
  console.log("🚀 POS La Oficina Grupo Mandre iniciado");
  initTables();
};
