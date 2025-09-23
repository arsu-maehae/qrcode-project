const socket = io({ transports: ["websocket"] });
let participants = {};

function showNotification(message, type="info") {
  const container = document.getElementById("notifications");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  // ✅ อยู่ 5 วิแล้วหาย
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 5000);
}

function updateTable() {
  const tableBody = document.getElementById("participants-table");
  tableBody.innerHTML = "";
  Object.entries(participants).forEach(([uuid, record]) => {
    let statusText = "";
    if (record.status === "checkin") statusText = "<span class='status-checkin'>✅ Check-in</span>";
    else if (record.status === "checkout") statusText = "<span class='status-checkout'>❌ Check-out</span>";

    const row = `
      <tr>
        <td>Cpr.E Booth</td>
        <td>${uuid}</td>
        <td>${statusText}</td>
        <td>${record.checkin_time || "-"}</td>
        <td>${record.checkout_time || "-"}</td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
}

socket.on("scan_event", (data) => {
  if (data.status === "invalid") {
    showNotification(`🚫 UUID ${data.uuid} → Invalid QR Code`, "error");
    return;
  }

  if (data.status === "completed") {
    showNotification(`⚠️ UUID ${data.uuid} → Completed. No re-scanning allowed.`, "error");
    return;
  }

  if (data.status === "global_cooldown") {
    showNotification(`⏳ Please wait ${data.wait_left}s before scanning again`, "warning");
    return;
  }

  if (data.status === "checkout_cooldown") {
    showNotification(`⏳ UUID ${data.uuid} → Please wait ${data.wait_left}s before Check-out`, "warning");
    return;
  }

  // ✅ checkin/checkout ลงตาราง
  participants[data.uuid] = data;
  showNotification(`${data.status === "checkin" ? "✅" : "❌"} UUID ${data.uuid} ${data.status}`);
  updateTable();
});
