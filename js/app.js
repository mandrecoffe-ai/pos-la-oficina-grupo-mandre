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

// ==================== INICIALIZAR ====================
async function initTables() {
  try {
    const snapshot = await db.collection("mesas").get();
    if (snapshot.empty) {
      const initial = [
        { id: "T1", x: 120, y: 100, status: "libre", total: 0, items: [] },
        { id: "T2", x: 250, y: 100, status: "libre", total: 0, items: [] },
        { id: "T3", x: 380, y: 100, status: "libre", total: 0, items: [] },
        { id: "T4", x: 120, y: 250, status: "libre", total: 0, items: [] },
        { id: "T5", x: 250, y: 250, status: "libre", total: 0, items: [] },
        { id: "T6", x: 380, y: 250, status: "libre", total: 0, items: [] },
        { id: "I1", x: 550, y: 150, status: "libre", total: 0, items: [] },
        { id: "I2", x: 550, y: 280, status: "libre", total: 0, items: [] },
        { id: "I3", x: 550, y: 410, status: "libre", total: 0, items: [] },
        { id: "B1", x: 720, y: 150, status: "libre", total: 0, items: [] },
        { id: "B2", x: 720, y: 280, status: "libre", total: 0, items: [] },
        { id: "B3", x: 720, y: 410, status: "libre", total: 0, items: [] }
      ];
      for (let t of initial) {
        await db.collection("mesas").doc(t.id).set(t);
      }
      tables = initial;
    } else {
      tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (e) {
    console.error(e);
    alert("Error conectando con Firebase. Revisa las reglas.");
  }
  renderTables();
}

function renderTables() {
  const floor = document.getElementById("floor");
  floor.innerHTML = "";

  tables.forEach(table => {
    const div = document.createElement("div");
    div.className = `table ${table.status}`;
    div.style.left = `${table.x}px`;
    div.style.top = `${table.y}px`;
    div.draggable = true;

    div.innerHTML = `
      <strong>${table.id}</strong>
      ${table.total > 0 ? `<br><small>$${table.total}</small>` : ''}
    `;

    div.addEventListener("dragstart", e => e.dataTransfer.setData("text", table.id));
    div.addEventListener("click", () => openOrderModal(table));

    floor.appendChild(div);
  });
}

// Drag & Drop
document.getElementById("floor").addEventListener("dragover", e => e.preventDefault());
document.getElementById("floor").addEventListener("drop", async e => {
  e.preventDefault();
  const id = e.dataTransfer.getData("text");
  const table = tables.find(t => t.id === id);
  if (!table) return;

  const rect = e.currentTarget.getBoundingClientRect();
  table.x = Math.max(30, Math.min(e.clientX - rect.left - 45, rect.width - 110));
  table.y = Math.max(30, Math.min(e.clientY - rect.top - 45, rect.height - 110));

  await db.collection("mesas").doc(table.id).update({x: table.x, y: table.y});
  renderTables();
});

async function openOrderModal(table) {
  currentTable = table;
  document.getElementById("modal-table-name").textContent = table.id;
  document.getElementById("order-modal").classList.remove("hidden");

  order = table.items || [];
  renderProductsInModal();
  renderOrder();
}

function closeOrderModal() {
  document.getElementById("order-modal").classList.add("hidden");
  currentTable = null;
}

async function renderProductsInModal() {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = "";

  const snap = await db.collection("productos").get();
  snap.forEach(doc => {
    const p = doc.data();
    const d = document.createElement("div");
    d.className = "product-card";
    d.innerHTML = `<strong>${p.nombre}</strong><br>$${p.precio}`;
    d.onclick = () => agregarAlPedido(doc.id, p.nombre, p.precio);
    grid.appendChild(d);
  });
}

function agregarAlPedido(id, nombre, precio) {
  const exist = order.find(i => i.id === id);
  if (exist) exist.cantidad++;
  else order.push({id, nombre, precio, cantidad: 1});
  renderOrder();
  saveCurrentOrder();
}

function renderOrder() {
  const ul = document.getElementById("order-list");
  ul.innerHTML = "";
  let total = 0;

  order.forEach((item, i) => {
    total += item.precio * item.cantidad;
    const li = document.createElement("li");
    li.innerHTML = `${item.nombre} ×${item.cantidad} <span>$${(item.precio*item.cantidad).toFixed(0)}</span>
      <button onclick="cambiarCantidad(${i},1)">+</button>
      <button onclick="cambiarCantidad(${i},-1)">-</button>`;
    ul.appendChild(li);
  });
  document.getElementById("total-amount").textContent = total.toFixed(0);
}

window.cambiarCantidad = (i, d) => {
  order[i].cantidad += d;
  if (order[i].cantidad < 1) order.splice(i,1);
  renderOrder();
  saveCurrentOrder();
};

function saveCurrentOrder() {
  if (!currentTable) return;
  const total = order.reduce((a,b) => a + b.precio * b.cantidad, 0);
  db.collection("mesas").doc(currentTable.id).update({
    items: order,
    total: total,
    status: order.length > 0 ? "ocupada" : "libre"
  });
}

window.limpiarPedido = () => {
  order = [];
  renderOrder();
  saveCurrentOrder();
};

async function cerrarMesa(metodo) {
  if (!currentTable || order.length === 0) return alert("No hay pedido");

  const total = order.reduce((a,b) => a + b.precio*b.cantidad, 0);

  await db.collection("ventas").add({
    mesa: currentTable.id,
    fecha: firebase.firestore.Timestamp.now(),
    total: total,
    metodo: metodo,
    items: order
  });

  await db.collection("mesas").doc(currentTable.id).update({
    status: "libre",
    total: 0,
    items: []
  });

  alert(`✅ Mesa ${currentTable.id} cerrada\nMétodo: ${metodo}\nTotal: $${total}`);
  closeOrderModal();
  initTables();
}

function toggleAdmin() {
  document.getElementById("admin-panel").classList.toggle("hidden");
}

async function guardarProducto() {
  const nombre = document.getElementById("prod-name").value.trim();
  const precio = parseFloat(document.getElementById("prod-price").value);
  if (!nombre || !precio) return alert("Completa todos los campos");

  await db.collection("productos").add({ nombre, precio, stock: 100 });
  alert("Producto guardado correctamente");
  document.getElementById("prod-name").value = "";
  document.getElementById("prod-price").value = "";
}

// ==================== INICIO ====================
window.onload = initTables;
