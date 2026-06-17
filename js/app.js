// ==================== CONFIGURACIÓN ====================
console.log("🚀 POS La Oficina Grupo Mandre - Iniciando...");

let currentTable = null;
let order = [];
let tables = [];

// ==================== MESAS LOCALES (funciona sin Firebase) ====================
function initTables() {
  console.log("📍 Cargando mesas en modo local...");

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

  console.log("✅ Mesas cargadas:", tables.length);
  renderTables();
}

// ==================== RENDER MESAS ====================
function renderTables() {
  const floor = document.getElementById("floor");
  if (!floor) {
    console.error("❌ No se encontró #floor en el HTML");
    return;
  }

  floor.innerHTML = "";

  tables.forEach(table => {
    const div = document.createElement("div");
    div.className = `table ${table.status === "ocupada" ? "ocupada" : ""}`;
    div.textContent = table.id;
    div.style.left = `${table.x}px`;
    div.style.top = `${table.y}px`;
    div.draggable = true;

    div.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text", table.id);
    });

    div.addEventListener("click", () => openOrderModal(table));

    floor.appendChild(div);
  });

  console.log("🖼️ Mesas renderizadas correctamente");
}

// ==================== DRAG & DROP ====================
const floor = document.getElementById("floor");
if (floor) {
  floor.addEventListener("dragover", e => e.preventDefault());
  floor.addEventListener("drop", e => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text");
    const table = tables.find(t => t.id === id);
    if (!table) return;

    const rect = floor.getBoundingClientRect();
    table.x = Math.max(30, Math.min(e.clientX - rect.left - 40, rect.width - 100));
    table.y = Math.max(30, Math.min(e.clientY - rect.top - 40, rect.height - 100));

    renderTables();
  });
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

// Productos (local por ahora)
function renderProductsInModal() {
  const grid = document.getElementById("products-grid");
  grid.innerHTML = `
    <div class="product-card" onclick="agregarAlPedido('1','Cerveza', 4500)">Cerveza<br>$4.500</div>
    <div class="product-card" onclick="agregarAlPedido('2','Agua', 2500)">Agua<br>$2.500</div>
    <div class="product-card" onclick="agregarAlPedido('3','Hamburguesa', 12500)">Hamburguesa<br>$12.500</div>
    <div class="product-card" onclick="agregarAlPedido('4','Papas', 6500)">Papas Fritas<br>$6.500</div>
  `;
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
};

window.limpiarPedido = () => { order = []; renderOrder(); };

function cerrarMesa() {
  if (!currentTable || order.length === 0) return alert("No hay pedido");
  const total = order.reduce((a,b) => a + b.precio*b.cantidad, 0);
  alert(`✅ Mesa ${currentTable.id} cerrada\nTotal: $${total}`);
  closeOrderModal();
}

function toggleAdmin() {
  const panel = document.getElementById("admin-panel");
  panel.classList.toggle("hidden");
}

function guardarProducto() {
  const nombre = document.getElementById("prod-name").value;
  const precio = document.getElementById("prod-price").value;
  if (nombre && precio) {
    alert(`Producto "${nombre}" guardado (modo demo)`);
    document.getElementById("prod-name").value = "";
    document.getElementById("prod-price").value = "";
  }
}

// ==================== INICIO ====================
window.onload = () => {
  console.log("✅ Sistema cargado correctamente");
  initTables();
};
