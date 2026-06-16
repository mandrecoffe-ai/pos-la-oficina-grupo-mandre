// ==================== CONFIGURACIÓN FIREBASE ====================
const firebaseConfig = {
  apiKey: "AIzaSyBzsRQKBh-_P_S8s-4n5qTPYFGbiM_T6OY",
  authDomain: "la-oficina-grupo-mandre.firebaseapp.com",
  projectId: "la-oficina-grupo-mandre",
  storageBucket: "la-oficina-grupo-mandre.firebasestorage.app",
  messagingSenderId: "839406353836",
  appId: "1:839406353836:web:c7df84a66f37ab28e7ce09",
  measurementId: "G-WF5JCX8KKC"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==================== VARIABLES GLOBALES ====================
let currentTable = null;
let order = [];

// Mesas
const tables = {
  terraza: Array.from({length: 6}, (_, i) => ({id: `T${i+1}`, section: 'terraza', status: 'libre'})),
  interior: Array.from({length: 3}, (_, i) => ({id: `I${i+1}`, section: 'interior', status: 'libre'})),
  barra: Array.from({length: 3}, (_, i) => ({id: `B${i+1}`, section: 'barra', status: 'libre'}))
};

// ==================== RENDER MESAS ====================
function renderTables() {
  Object.keys(tables).forEach(section => {
    const container = document.querySelector(`#${section} .row`) || document.createElement('div');
    if (!container.classList.contains('row')) {
      container.className = 'row';
      document.getElementById(section).appendChild(container);
    }
    container.innerHTML = '';

    tables[section].forEach(table => {
      const div = document.createElement('div');
      div.className = `table ${table.status === 'ocupada' ? 'ocupada' : ''}`;
      div.textContent = table.id;
      div.onclick = () => seleccionarMesa(table.id, section);
      container.appendChild(div);
    });
  });
}

// ==================== SELECCIONAR MESA ====================
function seleccionarMesa(tableId, section) {
  currentTable = tableId;
  document.getElementById('current-table').textContent = tableId;
  order = []; // En producción cargarías el pedido guardado de Firestore
  renderOrder();
}

// ==================== PRODUCTOS ====================
async function loadProducts() {
  const snapshot = await db.collection("productos").get();
  const list = document.getElementById('products-list');
  list.innerHTML = '';

  if (snapshot.empty) {
    list.innerHTML = '<p>No hay productos. Agrega algunos.</p>';
    return;
  }

  snapshot.forEach(doc => {
    const p = doc.data();
    const div = document.createElement('div');
    div.className = 'product-card';
    div.innerHTML = `<strong>${p.nombre}</strong><br>$${p.precio}`;
    div.onclick = () => agregarAlPedido(doc.id, p.nombre, p.precio);
    list.appendChild(div);
  });
}

async function guardarProducto() {
  const nombre = document.getElementById('prod-name').value;
  const precio = parseFloat(document.getElementById('prod-price').value);
  const stock = parseInt(document.getElementById('prod-stock').value);

  if (!nombre || !precio) return alert("Completa nombre y precio");

  await db.collection("productos").add({ nombre, precio, stock });
  closeModal();
  loadProducts();
}

function openProductModal() {
  document.getElementById('product-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('product-modal').style.display = 'none';
}

// ==================== PEDIDO ====================
function agregarAlPedido(id, nombre, precio) {
  if (!currentTable) return alert("Selecciona una mesa primero");
  order.push({id, nombre, precio, cantidad: 1});
  renderOrder();
}

function renderOrder() {
  const ul = document.getElementById('order-list');
  ul.innerHTML = '';
  let total = 0;

  order.forEach((item, index) => {
    total += item.precio * item.cantidad;
    const li = document.createElement('li');
    li.innerHTML = `${item.nombre} x${item.cantidad} - $${(item.precio * item.cantidad).toFixed(2)}
      <button onclick="cambiarCantidad(${index}, 1)">+</button>
      <button onclick="cambiarCantidad(${index}, -1)">-</button>`;
    ul.appendChild(li);
  });

  document.getElementById('total-amount').textContent = total.toFixed(2);
}

function cambiarCantidad(index, delta) {
  order[index].cantidad += delta;
  if (order[index].cantidad < 1) order.splice(index, 1);
  renderOrder();
}

function limpiarPedido() {
  order = [];
  renderOrder();
}

async function cerrarMesa() {
  if (!currentTable || order.length === 0) return alert("No hay pedido");

  const total = order.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  await db.collection("ventas").add({
    mesa: currentTable,
    fecha: new Date(),
    total: total,
    items: order
  });

  // Marcar mesa como libre
  Object.keys(tables).forEach(sec => {
    tables[sec].forEach(t => {
      if (t.id === currentTable) t.status = 'libre';
    });
  });

  alert(`Mesa ${currentTable} cerrada. Total: $${total.toFixed(2)}`);
  renderTables();
  limpiarPedido();
  currentTable = null;
  document.getElementById('current-table').textContent = '---';
}

// ==================== INICIO ====================
window.onload = () => {
  renderTables();
  loadProducts();
};