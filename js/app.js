async function initTables() {
  console.log("🚀 Iniciando sistema...");

  try {
    console.log("🔄 Intentando leer mesas de Firebase...");
    
    // Timeout de 8 segundos
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout Firebase")), 8000)
    );

    const snapshotPromise = db.collection("mesas").get();
    const snapshot = await Promise.race([snapshotPromise, timeout]);

    console.log("✅ Conexión a Firebase OK. Mesas encontradas:", snapshot.size);

    if (snapshot.empty) {
      console.log("🆕 Creando mesas por primera vez...");
      tables = [ /* mismo array de mesas de antes */ ];
      
      for (let table of tables) {
        await db.collection("mesas").doc(table.id).set(table);
      }
    } else {
      tables = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    alert("Error con Firebase.\n\n1. Revisa que hayas cambiado las reglas\n2. Intenta recargar");
    
    // Fallback local para que funcione aunque sea
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
