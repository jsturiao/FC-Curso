class Dashboard {
	constructor() {
		this.socket = null;
		this.messageCount = 0;
		this.isPaused = false;
		this.eventFilters = {
			order: true,
			payment: true,
			inventory: true,
			notification: true
		};
		this.stats = {
			totalMessages: 0,
			activeOrders: 0,
			totalPayments: 0,
			totalNotifications: 0
		};
		this.recentOrders = [];
		this.messageHistory = [];

		this.init();
	}

	init() {
		this.updateTime();
		setInterval(() => this.updateTime(), 1000);

		this.connectWebSocket();
		this.setupEventListeners();
		this.loadInitialData();
	}

	updateTime() {
		const now = new Date();
		document.getElementById('currentTime').textContent = now.toLocaleTimeString('pt-BR');
	}

	connectWebSocket() {
		try {
			this.socket = io();

			this.socket.on('connect', () => {
				console.log('✅ WebSocket conectado');
				this.updateConnectionStatus('connected');
				this.updateWebSocketStatus('online');
			});

			this.socket.on('disconnect', () => {
				console.log('❌ WebSocket desconectado');
				this.updateConnectionStatus('disconnected');
				this.updateWebSocketStatus('offline');
			});

			this.socket.on('reconnect', () => {
				console.log('🔄 WebSocket reconectado');
				this.updateConnectionStatus('connected');
				this.updateWebSocketStatus('online');
			});

			// Eventos de sistema
			this.socket.on('system_status', (data) => {
				this.updateSystemStatus(data);
			});

			// Eventos de mensagens
			this.socket.on('message_received', (data) => {
				if (!this.isPaused) {
					this.handleNewMessage(data);
				}
			});

			// Eventos específicos de módulos
			this.socket.on('order_created', (data) => this.handleOrderEvent(data, 'created'));
			this.socket.on('order_updated', (data) => this.handleOrderEvent(data, 'updated'));
			this.socket.on('payment_processed', (data) => this.handlePaymentEvent(data));
			this.socket.on('notification_sent', (data) => this.handleNotificationEvent(data));
			this.socket.on('inventory_updated', (data) => this.handleInventoryEvent(data));

		} catch (error) {
			console.error('Erro ao conectar WebSocket:', error);
			this.updateConnectionStatus('error');
		}
	}

	updateConnectionStatus(status) {
		const statusElement = document.getElementById('connectionStatus');
		const statusMap = {
			connected: { class: 'bg-success', icon: 'bi-wifi', text: 'Conectado' },
			disconnected: { class: 'bg-danger', icon: 'bi-wifi-off', text: 'Desconectado' },
			error: { class: 'bg-warning', icon: 'bi-exclamation-triangle', text: 'Erro' }
		};

		const config = statusMap[status] || statusMap.disconnected;
		statusElement.className = `badge ${config.class} pulse`;
		statusElement.innerHTML = `<i class="bi ${config.icon}"></i> ${config.text}`;
	}

	updateWebSocketStatus(status) {
		const element = document.getElementById('websocketStatus');
		if (status === 'online') {
			element.className = 'badge bg-success';
			element.innerHTML = '<i class="bi bi-wifi"></i> Conectado';
		} else {
			element.className = 'badge bg-danger';
			element.innerHTML = '<i class="bi bi-wifi-off"></i> Desconectado';
		}
	}

	updateSystemStatus(data) {
		const statusElements = {
			rabbitmq: document.getElementById('rabbitmqStatus'),
			mongo: document.getElementById('mongoStatus'),
			orders: document.getElementById('ordersStatus')
		};

		// O health check retorna dados em data.services
		const services = data.services || {};

		Object.keys(statusElements).forEach(service => {
			const element = statusElements[service];
			if (!element) return;

			// Mapear os nomes dos serviços corretamente
			let serviceKey = service;
			if (service === 'mongo') serviceKey = 'mongodb';

			const isOnline = services[serviceKey] === true || services[serviceKey] === 'online';

			if (isOnline) {
				element.className = 'badge bg-success';
				element.innerHTML = '<i class="bi bi-check-circle"></i> Online';
			} else {
				element.className = 'badge bg-danger';
				element.innerHTML = '<i class="bi bi-x-circle"></i> Offline';
			}
		});
	}

	handleNewMessage(data) {
		if (!this.shouldShowMessage(data.type)) return;

		this.messageCount++;
		this.stats.totalMessages++;
		this.updateStats();

		this.addMessageToFlow(data);
		this.messageHistory.unshift(data);

		// Manter apenas as últimas 100 mensagens
		if (this.messageHistory.length > 100) {
			this.messageHistory = this.messageHistory.slice(0, 100);
		}
	}

	shouldShowMessage(type) {
		const typeMap = {
			'order': 'order',
			'payment': 'payment',
			'inventory': 'inventory',
			'notification': 'notification'
		};

		const filterKey = typeMap[type] || type;
		return this.eventFilters[filterKey] !== false;
	}

	addMessageToFlow(data) {
		const messageFlow = document.getElementById('messageFlow');

		// Remover mensagem de "aguardando" se existir
		const waitingMessage = messageFlow.querySelector('.text-center.text-muted');
		if (waitingMessage) {
			waitingMessage.remove();
		}

		const messageElement = this.createMessageElement(data);
		messageFlow.insertBefore(messageElement, messageFlow.firstChild);

		// Manter apenas as últimas 50 mensagens na tela
		const messages = messageFlow.querySelectorAll('.message-item');
		if (messages.length > 50) {
			messages[messages.length - 1].remove();
		}
	}

	createMessageElement(data) {
		const div = document.createElement('div');
		div.className = 'message-item mb-3 p-3 border rounded';
		div.style.cursor = 'pointer';

		const typeColors = {
			order: 'success',
			payment: 'warning',
			inventory: 'danger',
			notification: 'info'
		};

		const color = typeColors[data.type] || 'secondary';
		const timestamp = new Date(data.timestamp || Date.now()).toLocaleTimeString('pt-BR');

		div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-2">
                        <span class="badge bg-${color} me-2">${data.type.toUpperCase()}</span>
                        <strong>${data.event || 'Evento'}</strong>
                        <small class="text-muted ms-auto">${timestamp}</small>
                    </div>
                    <div class="message-summary">
                        ${this.formatMessageSummary(data)}
                    </div>
                    ${data.data && Object.keys(data.data).length > 0 ?
				`<small class="text-muted">Clique para ver detalhes</small>` : ''
			}
                </div>
            </div>
        `;

		// Adicionar evento de clique para mostrar detalhes
		if (data.data && Object.keys(data.data).length > 0) {
			div.addEventListener('click', () => this.showMessageDetails(data));
		}

		return div;
	}

	formatMessageSummary(data) {
		if (data.data) {
			const summary = [];

			if (data.data.orderId) summary.push(`Pedido: ${data.data.orderId}`);
			if (data.data.paymentId) summary.push(`Pagamento: ${data.data.paymentId}`);
			if (data.data.productId) summary.push(`Produto: ${data.data.productId}`);
			if (data.data.userId) summary.push(`Usuário: ${data.data.userId}`);
			if (data.data.amount) summary.push(`Valor: R$ ${data.data.amount}`);
			if (data.data.quantity) summary.push(`Quantidade: ${data.data.quantity}`);
			if (data.data.status) summary.push(`Status: ${data.data.status}`);

			return summary.length > 0 ? summary.join(' • ') : 'Mensagem recebida';
		}

		return data.message || 'Evento do sistema';
	}

	showMessageDetails(data) {
		// Preencher informações básicas
		const basicInfo = document.getElementById('messageBasicInfo');
		basicInfo.innerHTML = `
            <tr><td><strong>Tipo:</strong></td><td>${data.type}</td></tr>
            <tr><td><strong>Evento:</strong></td><td>${data.event || 'N/A'}</td></tr>
            <tr><td><strong>Timestamp:</strong></td><td>${new Date(data.timestamp || Date.now()).toLocaleString('pt-BR')}</td></tr>
            <tr><td><strong>Queue:</strong></td><td>${data.queue || 'N/A'}</td></tr>
        `;

		// Preencher dados da mensagem
		const messageData = document.getElementById('messageData');
		messageData.textContent = JSON.stringify(data.data || {}, null, 2);

		// Mostrar modal
		const modal = new bootstrap.Modal(document.getElementById('messageModal'));
		modal.show();
	}

	handleOrderEvent(data, action) {
		this.stats.activeOrders++;
		this.updateStats();

		if (action === 'created') {
			this.addRecentOrder(data);
		}
	}

	handlePaymentEvent(data) {
		this.stats.totalPayments++;
		this.updateStats();
	}

	handleNotificationEvent(data) {
		this.stats.totalNotifications++;
		this.updateStats();
	}

	handleInventoryEvent(data) {
		console.log('Evento de estoque:', data);
	}

	addRecentOrder(data) {
		this.recentOrders.unshift(data);

		if (this.recentOrders.length > 10) {
			this.recentOrders = this.recentOrders.slice(0, 10);
		}

		this.updateRecentOrders();
	}

	updateRecentOrders() {
		const container = document.getElementById('recentOrders');

		if (this.recentOrders.length === 0) {
			container.innerHTML = `
                <div class="text-center text-muted">
                    <p class="mb-0">Nenhum pedido ainda</p>
                </div>
            `;
			return;
		}

		container.innerHTML = this.recentOrders.map(order => `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                    <small class="text-muted">Pedido ${order.orderId || order.id}</small><br>
                    <strong>R$ ${order.amount || '0,00'}</strong>
                </div>
                <span class="badge bg-${this.getOrderStatusColor(order.status)}">${order.status || 'Novo'}</span>
            </div>
        `).join('');
	}

	getOrderStatusColor(status) {
		const colorMap = {
			'pending': 'warning',
			'processing': 'info',
			'confirmed': 'success',
			'cancelled': 'danger',
			'completed': 'success'
		};
		return colorMap[status] || 'secondary';
	}

	updateStats() {
		document.getElementById('totalMessages').textContent = this.stats.totalMessages;
		document.getElementById('activeOrders').textContent = this.stats.activeOrders;
		document.getElementById('totalPayments').textContent = this.stats.totalPayments;
		document.getElementById('totalNotifications').textContent = this.stats.totalNotifications;
	}

	setupEventListeners() {
		// Event listeners configurados via HTML onclick
	}

	loadInitialData() {
		this.fetchSystemStatus();
	}

	fetchSystemStatus() {
		fetch('/api/health')
			.then(response => response.json())
			.then(data => {
				console.log('Status do sistema:', data);
				this.updateSystemStatus(data);
			})
			.catch(error => {
				console.error('Erro ao buscar status do sistema:', error);
			});
	}
}

// Funções globais para os botões da interface
function clearMessages() {
	const messageFlow = document.getElementById('messageFlow');
	messageFlow.innerHTML = `
        <div class="text-center text-muted">
            <i class="bi bi-hourglass-split"></i>
            <p>Aguardando mensagens...</p>
        </div>
    `;
	dashboard.messageHistory = [];
	console.log('📝 Mensagens limpas');
}

function pauseMessages() {
	const button = document.getElementById('pauseBtn');

	if (dashboard.isPaused) {
		dashboard.isPaused = false;
		button.innerHTML = '<i class="bi bi-pause"></i> Pausar';
		button.className = 'btn btn-sm btn-outline-primary';
		console.log('▶️ Mensagens retomadas');
	} else {
		dashboard.isPaused = true;
		button.innerHTML = '<i class="bi bi-play"></i> Retomar';
		button.className = 'btn btn-sm btn-outline-warning';
		console.log('⏸️ Mensagens pausadas');
	}
}

function updateFilter() {
	dashboard.eventFilters = {
		order: document.getElementById('filterOrder').checked,
		payment: document.getElementById('filterPayment').checked,
		inventory: document.getElementById('filterInventory').checked,
		notification: document.getElementById('filterNotification').checked
	};
	console.log('🔍 Filtros atualizados:', dashboard.eventFilters);
}

// Funções de teste
function createTestOrder() {
	fetch('/api/orders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			customerId: `customer_${Date.now()}`,
			customerEmail: `test${Date.now()}@example.com`,
			items: [
				{ 
					productId: 'prod_laptop_001', 
					productName: 'Gaming Laptop Pro',
					quantity: 1, 
					unitPrice: 1299.99 
				},
				{ 
					productId: 'prod_phone_001', 
					productName: 'Smartphone X',
					quantity: 1, 
					unitPrice: 899.99 
				}
			]
		})
	})
		.then(response => response.json())
		.then(data => {
			console.log('✅ Pedido de teste criado:', data);
			showNotification('Pedido de teste criado com sucesso!', 'success');
		})
		.catch(error => {
			console.error('❌ Erro ao criar pedido:', error);
			showNotification('Erro ao criar pedido de teste', 'error');
		});
}

function createTestPayment() {
	fetch('/api/payments', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			orderId: `order_${Date.now()}`,
			amount: 99.99,
			method: 'credit_card',
			status: 'pending'
		})
	})
		.then(response => response.json())
		.then(data => {
			console.log('✅ Pagamento de teste criado:', data);
			showNotification('Pagamento de teste criado!', 'success');
		})
		.catch(error => {
			console.error('❌ Erro ao criar pagamento:', error);
			showNotification('Erro ao criar pagamento', 'error');
		});
}

function processTestPayment() {
	fetch('/api/payments/process', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			paymentId: `payment_${Date.now()}`,
			status: 'approved'
		})
	})
		.then(response => response.json())
		.then(data => {
			console.log('✅ Pagamento processado:', data);
			showNotification('Pagamento processado com sucesso!', 'success');
		})
		.catch(error => {
			console.error('❌ Erro ao processar pagamento:', error);
			showNotification('Erro ao processar pagamento', 'error');
		});
}

function sendTestNotification() {
	fetch('/api/notifications', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			userId: `user_${Date.now()}`,
			type: 'order_confirmation',
			title: 'Pedido Confirmado',
			message: 'Seu pedido foi confirmado e está sendo processado.',
			channel: 'email'
		})
	})
		.then(response => response.json())
		.then(data => {
			console.log('✅ Notificação enviada:', data);
			showNotification('Notificação de teste enviada!', 'success');
		})
		.catch(error => {
			console.error('❌ Erro ao enviar notificação:', error);
			showNotification('Erro ao enviar notificação', 'error');
		});
}

function createTestProduct() {
	fetch('/api/inventory/products', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name: `Produto Teste ${Date.now()}`,
			sku: `SKU_${Date.now()}`,
			price: 49.99,
			category: 'Eletrônicos',
			stock: 10
		})
	})
		.then(response => response.json())
		.then(data => {
			console.log('✅ Produto criado:', data);
			showNotification('Produto de teste criado!', 'success');
		})
		.catch(error => {
			console.error('❌ Erro ao criar produto:', error);
			showNotification('Erro ao criar produto', 'error');
		});
}

function addTestStock() {
	fetch('/api/inventory/stock/add', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			productId: 'product_001',
			quantity: 5,
			reason: 'Reposição de teste'
		})
	})
		.then(response => response.json())
		.then(data => {
			console.log('✅ Estoque adicionado:', data);
			showNotification('Estoque adicionado com sucesso!', 'success');
		})
		.catch(error => {
			console.error('❌ Erro ao adicionar estoque:', error);
			showNotification('Erro ao adicionar estoque', 'error');
		});
}

function reserveTestStock() {
	fetch('/api/inventory/stock/reserve', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			productId: 'product_001',
			quantity: 2,
			orderId: `order_${Date.now()}`
		})
	})
		.then(response => response.json())
		.then(data => {
			console.log('✅ Estoque reservado:', data);
			showNotification('Estoque reservado com sucesso!', 'success');
		})
		.catch(error => {
			console.error('❌ Erro ao reservar estoque:', error);
			showNotification('Erro ao reservar estoque', 'error');
		});
}

function refundTestPayment() {
	fetch('/api/payments/refund', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			paymentId: `payment_${Date.now()}`,
			amount: 99.99,
			reason: 'Teste de reembolso'
		})
	})
		.then(response => response.json())
		.then(data => {
			console.log('✅ Reembolso processado:', data);
			showNotification('Reembolso processado!', 'success');
		})
		.catch(error => {
			console.error('❌ Erro ao processar reembolso:', error);
			showNotification('Erro ao processar reembolso', 'error');
		});
}

function showNotificationStats() {
	console.log('📊 Exibindo estatísticas de notificações');
}

function showInventoryStats() {
	console.log('📊 Exibindo estatísticas de estoque');
}

function showNotification(message, type = 'info') {
	const toastContainer = document.getElementById('toastContainer') || createToastContainer();

	const toast = document.createElement('div');
	toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0`;
	toast.setAttribute('role', 'alert');
	toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

	toastContainer.appendChild(toast);

	const bsToast = new bootstrap.Toast(toast);
	bsToast.show();

	toast.addEventListener('hidden.bs.toast', () => {
		toast.remove();
	});
}

function createToastContainer() {
	const container = document.createElement('div');
	container.id = 'toastContainer';
	container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
	container.style.zIndex = '1055';
	document.body.appendChild(container);
	return container;
}

// Inicializar dashboard quando a página carregar
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
	dashboard = new Dashboard();
	console.log('🚀 Dashboard inicializado');
});