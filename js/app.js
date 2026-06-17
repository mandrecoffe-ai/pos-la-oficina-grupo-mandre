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

// ==================== INICIALIZAR MESAS (con fallback) ====================
async function initTables() {
  console.log("🚀 Iniciando sistema...");

  try {
    const snapshot = await db.collection("mesas").get();
    console.log("📊 Mesas en Firebase:", snapshot.size);

    if (snapshot.empty) {
      console.log("Creando mesas iniciales...");
      tables = [
        { id: "T1", x: 120, y: 100, status: "libre" },
        { id: "T2", x: 250, y: 100, status: "libre" },
        { id: "T3", x: 380, y: 100, status: "libre" },
        { id: "T4", x: 120, y: 250, status: "libre" },
        { id: "T5", x: 250, y: 250, status: "libre" },
        { id: "T6", x: 380, y: 250, status: "libre" },
        { id: "I1", x: 550, y: 150, status: "libre" },
        { id: "I2", x: 550, y: 280, status: "libre" },
        { id: "I3", x: 550, y: 410, status: "libre" },
        { id: "B1", x: 720, y: 150, status: "libre" },
        { id: "B2", x: 720, y: 280, status: "libre" },
        { id: "B3", x: 720, y: 410, status: "libre" }
      ];

      for (let table of tables) {
        await db.collection("mesas").doc(table.id).set(table);
      }
    } else {
      tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (error) {
    console.error("❌ Error Firebase:", error);
    alert("⚠️ Error con Firebase. Usando modo local (las mesas no se guardarán al recargar).");
    
    // Fallback local
    tables = [
      { id: "T1", x: 120, y: 100, status: "libre" },
      { id: "T2", x: 250, y: 100, status: "libre" },
      { id: "T3", x: 380, y: 100, status: "libre" },
      { id: "T4", x: 120, y: 250, status: "libre" },
      { id: "T5", x: 250, y: 250, status: "libre" },
      { id: "T6", x: 380, y: 250, status: "libre" },
      { id: "I1", x: 550, y: 150, status: "libre" },
      { id: "I2", x: 550, y: 280, status: "libre" },
      { id: "I3", x: 550, y: 410, status: "libre" },
      { id: "B1", x: 720, y: 150, status: "libre" },
      { id: "B2", x: 720, y: 280, status: "libre" },
      { id: "B3", x: 720, y: 410, status: "libre" }
    ];
  }

  renderTables();
}

// ==================== RENDER MESAS ====================
function renderTables() {
  const floor = document.getElementById("floor");
  floor.innerHTML = "";

  tables.forEach(table => {
    const div = document.createElement("div");
    div.className = `table ${table.status === "ocupada" ? "ocupada" : ""}`;
    div.textContent = table.id;
    div.style.left = `${table.x}px`;
    div.style.top = `${table.y}px`;
    div.draggable = true;

    div.addEventListener("dragstart", e => e.dataTransfer.setData("text", table.id));
    div.addEventListener("click", () => openOrderModal(table));

    floor.appendChild(div);
  });
}

// ==================== DRAG & DROP ====================
document.getElementById("floor").addEventListener("dragover", e => e.preventDefault());
document.getElementById("floor").addEventListener("drop", e => {
  e.preventDefault();
  const id = e.dataTransfer.getData("text");
  const table = tables.find(t => t.id === id);
  if (!table) return;

  const rect = e.currentTarget.getBoundingClientRect();
  table.x = Math.max(30, Math.min(e.clientX - rect.left - 40, rect.width - 100));
  table.y = Math.max(30, Math.min(e.clientY - rect.top - 40, rect.height - 100));

  renderTables();
});

// ==================== MODAL Y FUNCIONES (mismo que antes) ====================
function openOrderModal(table) {
  currentTable = table;
  document.getElementById("modal-table-name").textContent = table.id;
  document.getElementById("order-modal").classList.remove("hidden");
  renderProductsInModal();
  renderOrder();
}

function closeOrderModal() {
  document.getElementById("order-modal").classList.add("hidden");
}

async function renderProductsInModal() {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = "<p>Cargando...</p>";

  try {
    const snap = await db.collection("productos").get();
    grid.innerHTML = "";
    if (snap.empty) {
      grid.innerHTML = "<p style='grid-column:1/-1;text-align:center'>No hay productos.<br>Usa el botón Admin</p>";
      return;
    }
    snap.forEach(doc => {
      const p = doc.data();
      const d = document.createElement("div");
      d.className = "product-card";
      d.innerHTML = `<strong>${p.nombre}</strong><br>$${p.precio}`;
      d.onclick = () => agregarAlPedido(doc.id, p.nombre, p.precio);
      grid.appendChild(d);
    });
  } catch(e) {
    grid.innerHTML = "<p>Error cargando productos</p>";
  }
}

function agregarAlPedido(id, nombre, precio) {
  const exist = order.find(i => i.id === id);
  if (exist) exist.cantidad++;
  else order.push({id, nombre, precio, cantidad: 1});
  renderOrder();
}

function renderOrder() {
  const ul = document.getElementById("order-list");
  ul.innerHTML = "";
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

window.cambiarCantidad = (i, d) => {
  order[i].cantidad += d;
  if (order[i].cantidad < 1) order.splice(i,1);
  renderOrder();
};

window.limpiarPedido = () => { order = []; renderOrder(); };

async function cerrarMesa() {
  if (!currentTable || order.length === 0) return alert("Selecciona productos");
  const total = order.reduce((a,b) => a + b.precio*b.cantidad, 0);
  alert(`✅ Mesa ${currentTable.id} cerrada\nTotal: $${total.toFixed(2)}`);
  closeOrderModal();
}

function toggleAdmin() {
  document.getElementById("admin-panel").classList.toggle("hidden");
}

async function guardarProducto() {
  const nombre = document.getElementById("prod-name").value.trim();
  const precio = parseFloat(document.getElementById("prod-price").value);
  if (!nombre || !precio) return alert("Completa nombre y precio");
  await db.collection("productos").add({nombre, precio, stock: 100});
  alert("Producto agregado");
  document.getElementById("prod-name").value = "";
  document.getElementById("prod-price").value = "";
}

// ==================== INICIO ====================
window.onload = () => {
  initTables();
};
