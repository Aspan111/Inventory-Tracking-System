const API_URL = "https://onrender.com";
let currentRole = "User";

// Автоматическая проверка сессии при загрузке страницы
function checkPersistentLogin() {
    const savedRole = localStorage.getItem("userRole");
    if (savedRole === "Admin") {
        currentRole = "Admin";
        document.getElementById("authBtn").style.display = "none";
        document.getElementById("logoutBtn").style.display = "block";
        document.getElementById("userPanel").classList.remove("active");
        document.getElementById("adminPanel").classList.add("active");
        loadAdminTableRecords();
    } else {
        triggerLogout();
    }
}

// Авторизация администратора
function handleAuthAction() {
    const userVal = prompt("Enter Admin Username:", "admin");
    if (!userVal) return;
    const passVal = prompt("Enter Admin Password:", "Admin123");
    if (!passVal) return;

    fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userVal, password: passVal })
    })
    .then(res => {
        if (!res.ok) throw new Error("Unauthorized credentials error");
        return res.json();
    })
    .then(data => {
        alert("Login Successful! Access granted to Admin Dashboard.");
        currentRole = "Admin";
        localStorage.setItem("userRole", "Admin");
        document.getElementById("authBtn").style.display = "none";
        document.getElementById("logoutBtn").style.display = "block";
        document.getElementById("userPanel").classList.remove("active");
        document.getElementById("adminPanel").classList.add("active");
        loadAdminTableRecords();
    })
    .catch(err => alert("Access Denied: Invalid Username or Password."));
}

// Выход из системы (разлогин)
function triggerLogout() {
    currentRole = "User";
    localStorage.removeItem("userRole");
    document.getElementById("authBtn").style.display = "block";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("adminPanel").classList.remove("active");
    document.getElementById("userPanel").classList.add("active");
    document.getElementById("userResultsTable").style.display = "none";
    document.getElementById("userQueryInput").value = "";
}

// Поиск по нажатию клавиши Enter (Интерфейс пользователя)
function handleSearchKeyPress(event) {
    if (event.key === "Enter") {
        const searchVal = document.getElementById("userQueryInput").value.trim();
        if (!searchVal) return;

        fetch(`${API_URL}/search?query=${encodeURIComponent(searchVal)}`)
        .then(res => res.json())
        .then(orders => {
            const tbody = document.querySelector("#userResultsTable tbody");
            tbody.innerHTML = "";
            if(orders.length === 0) {
                alert("No transaction records found matching your input parameters.");
                document.getElementById("userResultsTable").style.display = "none";
                return;
            }
            orders.forEach(order => {
                const deliveryClass = order.delivery_status.toLowerCase().replace(" ", "-");
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td style="color: #0043a4; font-weight: 600;">${order.order_number}</td>
                    <td>${order.customer}</td>
                    <td>$${Number(order.amount).toFixed(2)}</td>
                    <td>${order.deadline || "No Deadline"}</td>
                    <td><div class="status ${deliveryClass}">${order.delivery_status}</div></td>
                `;
                tbody.appendChild(row);
            });
            document.getElementById("userResultsTable").style.display = "table";
        });
    }
}

// Загрузка всех записей из базы для Админ-панели
function loadAdminTableRecords() {
    fetch(`${API_URL}/orders`)
    .then(res => res.json())
    .then(orders => {
        const tbody = document.querySelector("#ordersTable tbody");
        tbody.innerHTML = "";
        orders.forEach(order => {
            const currentStatus = order.delivery_status || "Accepted";
            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="color: #0043a4; font-weight: 600;">${order.order_number}</td>
                <td>${order.customer}</td>
                <td>$${Number(order.amount).toFixed(2)}</td>
                <td>${order.deadline || "No Deadline"}</td>
                <td>
                    <div class="delivery-cell-container">
                        <select class="status-dropdown" onchange="changeOrderDeliveryStatus('${order.order_number}', this.value)">
                            <option value="Accepted" ${currentStatus === "Accepted" ? "selected" : ""}>Accepted</option>
                            <option value="Delivering" ${currentStatus === "Delivering" ? "selected" : ""}>Delivering</option>
                            <option value="Shipped" ${currentStatus === "Shipped" ? "selected" : ""}>Shipped</option>
                        </select>
                        <button class="trash-delete-btn" title="Delete Row" onclick="deleteOrder('${order.order_number}')">
                            <svg width="14" height="16" viewBox="0 0 448 512" fill="currentColor"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

// Изменение статуса доставки через выпадающий список (PUT-запрос)
async function changeOrderDeliveryStatus(orderNumber, newStatus) {
    try {
        await fetch(`${API_URL}/orders/${orderNumber}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ delivery_status: newStatus })
        });
    } catch (err) {
        console.error(err);
    }
}

// Открытие и закрытие модального окна добавления заказа
function openOrderModalWindow() {
    document.getElementById("modalCustomerName").value = "";
    document.getElementById("modalPurchaseAmount").value = "";
    document.getElementById("modalDeliveryDate").value = new Date().toISOString().split('T')[0];
    document.getElementById("orderModalWindow").classList.add("is-visible");
}

function closeOrderModalWindow() {
    document.getElementById("orderModalWindow").classList.remove("is-visible");
}

// Отправка данных формы создания заказа (POST-запрос)
async function submitModalOrderData() {
    const customer = document.getElementById("modalCustomerName").value.trim();
    const amountInput = document.getElementById("modalPurchaseAmount").value;
    const deadline = document.getElementById("modalDeliveryDate").value;

    if (!customer || !amountInput || !deadline) {
        alert("Please fill out all operational input fields correctly.");
        return;
    }
    const amount = parseFloat(amountInput);
    let delivery_status = "Accepted"; 
    let stock_status = "In stock";

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customer, amount, deadline, stock_status, delivery_status })
        });
        if (!response.ok) throw new Error("Transaction rejected.");
        alert("Order logged successfully inside cloud infrastructure database tables.");
        closeOrderModalWindow();
        loadAdminTableRecords();
    } catch (err) { alert("Error saving order: " + err.message); }
}

// Удаление заказа (DELETE-запрос)
async function deleteOrder(orderNumber) {
    if (!confirm(`Are you sure you want to permanently delete order entry ${orderNumber}?`)) return;
    try {
        const response = await fetch(`${API_URL}/orders/${orderNumber}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Deletion request error.");
        alert(`Order ${orderNumber} deleted successfully.`);
        loadAdminTableRecords();
    } catch (err) { alert("Error deleting entry: " + err.message); }
}

// Запуск проверки при полной готовности DOM-дерева
document.addEventListener("DOMContentLoaded", () => {
    checkPersistentLogin();
});
