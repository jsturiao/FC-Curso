// Dashboard JavaScript functionality
class Dashboard {
	constructor() {
		this.socket = null;
		this.messages = [];
		this.isPaused = false;
		this.filters = {
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

		this.init();
	}

	init() {
		this.initSocket();
		this.updateTime();
		this.loadInitialData();

		// Update time every second
		setInterval(() => this.updateTime(), 1000);

		// Update stats every 30 seconds
		setInterval(() => this.updateStats(), 30000);
	}

	initSocket() {
		try {
			this.socket = io();

			this.socket.on('connect', () => {
				console.log('Connected to server');
				this.updateConnectionStatus(true);
				this.updateWebSocketStatus(true);
			});

			this.socket.on('disconnect', () => {
				console.log('Disconnected from server');
				this.updateConnectionStatus(false);
				this.updateWebSocketStatus(false);
			});

			this.socket.on('message', (message) => {
				this.handleNewMessage(message);
			});

			this.socket.on('stats', (stats) => {
				this.updateStatsDisplay(stats);
			});

			this.socket.on('system-status', (status) => {
				this.updateSystemStatus(status);
			});

		} catch (error) {
			console.error('Socket initialization error:', error);
			this.updateConnectionStatus(false);
		}
	}

	updateTime() {
		const now = new Date();
		const timeString = now.toLocaleTimeString('pt-BR');
		document.getElementById('currentTime').textContent = timeString;
	}

	updateConnectionStatus(connected) {
		const statusElement = document.getElementById('connectionStatus');
		if (connected) {
			statusElement.innerHTML = '<i class="bi bi-wifi"></i> Conectado';
			statusElement.className = 'badge bg-success';
		} else {
			statusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Desconectado';
			statusElement.className = 'badge bg-danger pulse';
		}
	}

	updateWebSocketStatus(connected) {
		const statusElement = document.getElementById('websocketStatus');
		if (connected) {
			statusElement.innerHTML = '<i class="bi bi-wifi"></i> Conectado';
			statusElement.className = 'badge bg-success';
		} else {
			statusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Desconectado';
			statusElement.className = 'badge bg-secondary';
		}
	}

	updateSystemStatus(status) {
		// Update RabbitMQ status
		const rabbitmqElement = document.getElementById('rabbitmqStatus');
		if (status.rabbitmq) {
			rabbitmqElement.innerHTML = '<i class="bi bi-check-circle"></i> Online';
			rabbitmqElement.className = 'badge bg-success';
		} else {
			rabbitmqElement.innerHTML = '<i class="bi bi-x-circle"></i> Offline';
			rabbitmqElement.className = 'badge bg-danger';
		}

		// Update MongoDB status
		const mongoElement = document.getElementById('mongoStatus');
		if (status.mongodb) {
			mongoElement.innerHTML = '<i class="bi bi-check-circle"></i> Online';
			mongoElement.className = 'badge bg-success';
		} else {
			mongoElement.innerHTML = '<i class="bi bi-x-circle"></i> Offline';
			mongoElement.className = 'badge bg-danger';
		}

		// Update Orders Module status
		const ordersElement = document.getElementById('ordersStatus');
		if (status.orders) {
			ordersElement.innerHTML = '<i class="bi bi-check-circle"></i> Ativo';
			ordersElement.className = 'badge bg-success';
		} else {
			ordersElement.innerHTML = '<i class="bi bi-x-circle"></i> Inativo';
			ordersElement.className = 'badge bg-danger';
		}
	}

	handleNewMessage(message) {
		if (this.isPaused) return;

		this.messages.unshift(message);
		this.stats.totalMessages++;

		// Update message type stats
		if (message.eventType.includes('order')) {
			this.stats.activeOrders = Math.max(0, this.stats.activeOrders + (message.eventType.includes('created') ? 1 : 0));
		} else if (message.eventType.includes('payment')) {
			this.stats.totalPayments++;
		} else if (message.eventType.includes('notification')) {
			this.stats.totalNotifications++;
		}

		this.updateStatsDisplay();
		this.renderMessages();
		this.updateRecentOrders();

		// Keep only last 100 messages
		if (this.messages.length > 100) {
			this.messages = this.messages.slice(0, 100);
		}
	}

	renderMessages() {
		const container = document.getElementById('messageFlow');
		container.innerHTML = '';

		const filteredMessages = this.messages.filter(msg => this.shouldShowMessage(msg));

		if (filteredMessages.length === 0) {
			container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-funnel"></i>
                    <p>Nenhuma mensagem corresponde aos filtros selecionados</p>
                </div>
            `;
			return;
		}

		filteredMessages.forEach(message => {
			const messageElement = this.createMessageElement(message);
			container.appendChild(messageElement);
		});
	}

	createMessageElement(message) {
		const div = document.createElement('div');
		div.className = `message-item card mb-2 ${this.getMessageClass(message.eventType)}`;

		const timeString = new Date(message.timestamp).toLocaleTimeString('pt-BR');
		const eventIcon = this.getEventIcon(message.eventType);

		div.innerHTML = `
            <div class="card-body py-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-1">
                            <i class="bi ${eventIcon} me-2"></i>
                            <strong class="me-2">${message.eventType}</strong>
                            <span class="badge ${this.getEventBadgeClass(message.eventType)} status-badge">${this.getEventCategory(message.eventType)}</span>
                        </div>
                        <div class="text-muted small">
                            <i class="bi bi-clock me-1"></i> ${timeString}
                            ${message.correlationId ? `<i class="bi bi-link-45deg ms-2 me-1"></i> ${message.correlationId.substring(0, 8)}...` : ''}
                        </div>
                        ${message.data && message.data.orderId ? `<div class="text-muted small"><i class="bi bi-tag me-1"></i> Pedido: ${message.data.orderId}</div>` : ''}
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="dashboard.showMessageDetails('${message.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </div>
        `;

		// Add click animation
		div.addEventListener('click', () => {
			div.style.transform = 'scale(0.98)';
			setTimeout(() => {
				div.style.transform = 'scale(1)';
			}, 100);
		});

		return div;
	}

	getMessageClass(eventType) {
		if (eventType.includes('order')) return 'order-event';
		if (eventType.includes('payment')) return 'payment-event';
		if (eventType.includes('inventory')) return 'inventory-event';
		if (eventType.includes('notification')) return 'notification-event';
		return '';
	}

	getEventIcon(eventType) {
		if (eventType.includes('order')) return 'bi-cart';
		if (eventType.includes('payment')) return 'bi-credit-card';
		if (eventType.includes('inventory')) return 'bi-box';
		if (eventType.includes('notification')) return 'bi-bell';
		return 'bi-envelope';
	}

	getEventBadgeClass(eventType) {
		if (eventType.includes('order')) return 'bg-success';
		if (eventType.includes('payment')) return 'bg-warning';
		if (eventType.includes('inventory')) return 'bg-danger';
		if (eventType.includes('notification')) return 'bg-info';
		return 'bg-secondary';
	}

	getEventCategory(eventType) {
		if (eventType.includes('order')) return 'Pedido';
		if (eventType.includes('payment')) return 'Pagamento';
		if (eventType.includes('inventory')) return 'Estoque';
		if (eventType.includes('notification')) return 'Notificação';
		return 'Sistema';
	}

	shouldShowMessage(message) {
		const type = message.eventType.toLowerCase();
		if (type.includes('order') && !this.filters.order) return false;
		if (type.includes('payment') && !this.filters.payment) return false;
		if (type.includes('inventory') && !this.filters.inventory) return false;
		if (type.includes('notification') && !this.filters.notification) return false;
		return true;
	}

	updateStatsDisplay(stats = null) {
		const currentStats = stats || this.stats;

		document.getElementById('totalMessages').textContent = currentStats.totalMessages || 0;
		document.getElementById('activeOrders').textContent = currentStats.activeOrders || 0;
		document.getElementById('totalPayments').textContent = currentStats.totalPayments || 0;
		document.getElementById('totalNotifications').textContent = currentStats.totalNotifications || 0;
	}

	updateRecentOrders() {
		const orderMessages = this.messages.filter(msg =>
			msg.eventType.includes('order') && msg.data && msg.data.orderId
		).slice(0, 5);

		const container = document.getElementById('recentOrders');

		if (orderMessages.length === 0) {
			container.innerHTML = `
                <div class="text-center text-muted">
                    <p class="mb-0">Nenhum pedido ainda</p>
                </div>
            `;
			return;
		}

		container.innerHTML = orderMessages.map(msg => `
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                <div>
                    <div class="fw-bold small">${msg.data.orderId}</div>
                    <div class="text-muted" style="font-size: 0.75rem;">
                        ${new Date(msg.timestamp).toLocaleTimeString('pt-BR')}
                    </div>
                </div>
                <span class="badge ${this.getEventBadgeClass(msg.eventType)} status-badge">
                    ${msg.eventType.split('.')[1]}
                </span>
            </div>
        `).join('');
	}

	showMessageDetails(messageId) {
		const message = this.messages.find(m => m.id === messageId);
		if (!message) return;

		// Populate basic info
		const basicInfo = document.getElementById('messageBasicInfo');
		basicInfo.innerHTML = `
            <tr><td><strong>ID:</strong></td><td>${message.id}</td></tr>
            <tr><td><strong>Tipo:</strong></td><td>${message.eventType}</td></tr>
            <tr><td><strong>Timestamp:</strong></td><td>${new Date(message.timestamp).toLocaleString('pt-BR')}</td></tr>
            <tr><td><strong>Exchange:</strong></td><td>${message.exchange || 'N/A'}</td></tr>
            <tr><td><strong>Routing Key:</strong></td><td>${message.routingKey || 'N/A'}</td></tr>
            ${message.correlationId ? `<tr><td><strong>Correlation ID:</strong></td><td>${message.correlationId}</td></tr>` : ''}
        `;

		// Populate message data
		const messageData = document.getElementById('messageData');
		messageData.textContent = JSON.stringify(message.data || {}, null, 2);

		// Show modal
		const modal = new bootstrap.Modal(document.getElementById('messageModal'));
		modal.show();
	}

	async loadInitialData() {
		try {
			// Load system status
			const statusResponse = await fetch('/api/health');
			if (statusResponse.ok) {
				const status = await statusResponse.json();
				this.updateSystemStatus(status);
			}

			// Load initial stats
			const statsResponse = await fetch('/api/stats');
			if (statsResponse.ok) {
				const stats = await statsResponse.json();
				this.updateStatsDisplay(stats);
			}
		} catch (error) {
			console.error('Error loading initial data:', error);
		}
	}

	async updateStats() {
		try {
			const response = await fetch('/api/stats');
			if (response.ok) {
				const stats = await response.json();
				this.updateStatsDisplay(stats);
			}
		} catch (error) {
			console.error('Error updating stats:', error);
		}
	}

	// Test actions
	async createTestOrder() {
		try {
			const response = await fetch('/api/orders', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					customerId: 'CUST_' + Math.random().toString(36).substr(2, 9),
					customerEmail: 'test@example.com',
					items: [
						{
							productId: 'PROD_' + Math.random().toString(36).substr(2, 5),
							productName: 'Produto de Teste',
							quantity: Math.floor(Math.random() * 3) + 1,
							price: Math.floor(Math.random() * 100) + 10
						}
					],
					shippingAddress: {
						street: 'Rua Teste, 123',
						city: 'São Paulo',
						state: 'SP',
						zipCode: '01234-567',
						country: 'Brasil'
					}
				})
			});

			if (response.ok) {
				const result = await response.json();
				this.showSuccessAlert(`Pedido ${result.data.orderId} criado com sucesso!`);
			} else {
				throw new Error('Falha ao criar pedido');
			}
		} catch (error) {
			this.showErrorAlert('Erro ao criar pedido de teste: ' + error.message);
		}
	}

	async processTestPayment() {
		const orders = this.messages.filter(m => m.eventType === 'order.created' && m.data?.orderId);
		if (orders.length === 0) {
			this.showWarningAlert('Nenhum pedido disponível para processar pagamento');
			return;
		}

		const lastOrder = orders[0];
		// Simulate payment processing
		this.showSuccessAlert(`Processando pagamento para pedido ${lastOrder.data.orderId}`);
	}

	async createTestPayment() {
		try {
			const response = await fetch('/api/payments', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					orderId: 'ORDER_' + Math.random().toString(36).substr(2, 9),
					amount: Math.floor(Math.random() * 1000) + 50,
					currency: 'BRL',
					paymentMethod: ['credit_card', 'debit_card', 'pix'][Math.floor(Math.random() * 3)],
					gatewayProvider: 'mock',
					customerInfo: {
						customerId: 'CUST_' + Math.random().toString(36).substr(2, 9),
						email: 'test@example.com',
						name: 'Cliente Teste'
					},
					paymentDetails: {
						installments: Math.floor(Math.random() * 12) + 1
					}
				})
			});

			if (response.ok) {
				const result = await response.json();
				this.showSuccessAlert(`Pagamento ${result.payment.paymentId} criado com sucesso!`);

				// Auto-processar após 3 segundos
				setTimeout(async () => {
					await this.processPayment(result.payment.paymentId);
				}, 3000);
			} else {
				throw new Error('Falha ao criar pagamento');
			}
		} catch (error) {
			this.showErrorAlert('Erro ao criar pagamento de teste: ' + error.message);
		}
	}

	async processPayment(paymentId) {
		try {
			const response = await fetch(`/api/payments/${paymentId}/process`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({})
			});

			if (response.ok) {
				const result = await response.json();
				this.showSuccessAlert(`Pagamento processado: ${result.payment.status}`);
			} else {
				throw new Error('Falha ao processar pagamento');
			}
		} catch (error) {
			this.showErrorAlert('Erro ao processar pagamento: ' + error.message);
		}
	}

	async refundTestPayment() {
		try {
			// Buscar pagamentos aprovados
			const response = await fetch('/api/payments?status=approved&limit=1');
			const data = await response.json();

			if (!data.success || data.payments.length === 0) {
				this.showWarningAlert('Nenhum pagamento aprovado disponível para reembolso');
				return;
			}

			const payment = data.payments[0];
			const refundResponse = await fetch(`/api/payments/${payment.paymentId}/refund`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					reason: 'Teste de reembolso pelo dashboard'
				})
			});

			if (refundResponse.ok) {
				this.showSuccessAlert(`Reembolso processado para pagamento ${payment.paymentId}`);
			} else {
				throw new Error('Falha ao processar reembolso');
			}
		} catch (error) {
			this.showErrorAlert('Erro ao processar reembolso: ' + error.message);
		}
	}

	async checkTestInventory() {
		this.showSuccessAlert('Verificação de estoque simulada');
	}

	async sendTestNotification() {
		try {
			// Test Email Notification
			const emailResponse = await fetch('/api/notifications/email/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: 'customer@example.com',
					template: 'order-confirmation',
					data: {
						customerName: 'Test Customer',
						orderId: 'TEST-' + Date.now(),
						total: 99.99,
						currency: 'USD',
						items: [
							{ name: 'Test Product', quantity: 1, price: 99.99 }
						]
					}
				})
			});

			// Test SMS Notification
			const smsResponse = await fetch('/api/notifications/sms/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: '+1234567890',
					type: 'order-alert',
					data: {
						orderId: 'TEST-' + Date.now(),
						status: 'confirmed'
					}
				})
			});

			// Test Push Notification
			const pushResponse = await fetch('/api/notifications/push/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: 'test-user-123',
					type: 'order-update',
					data: {
						orderId: 'TEST-' + Date.now(),
						title: 'Test Order Update',
						message: 'This is a test notification!'
					}
				})
			});

			if (emailResponse.ok && smsResponse.ok && pushResponse.ok) {
				this.showSuccessAlert('Notificações de teste enviadas com sucesso! (Email, SMS e Push)');
			} else {
				this.showWarningAlert('Algumas notificações de teste falharam. Verifique os logs.');
			}

		} catch (error) {
			console.error('Error sending test notifications:', error);
			this.showErrorAlert('Erro ao enviar notificações de teste');
		}
	}

	// Utility methods
	showSuccessAlert(message) {
		this.showAlert(message, 'success');
	}

	showErrorAlert(message) {
		this.showAlert(message, 'danger');
	}

	showWarningAlert(message) {
		this.showAlert(message, 'warning');
	}

	showAlert(message, type) {
		const alertDiv = document.createElement('div');
		alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
		alertDiv.style.top = '100px';
		alertDiv.style.right = '20px';
		alertDiv.style.zIndex = '1050';
		alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

		document.body.appendChild(alertDiv);

		// Auto remove after 5 seconds
		setTimeout(() => {
			if (alertDiv.parentNode) {
				alertDiv.parentNode.removeChild(alertDiv);
			}
		}, 5000);
	}

	// Notification module functions
	async showNotificationStats() {
		try {
			const response = await fetch('/api/notifications/stats');
			const data = await response.json();

			if (data.success) {
				const stats = data.data;
				const modal = document.createElement('div');
				modal.className = 'modal fade';
				modal.innerHTML = `
					<div class="modal-dialog modal-lg">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title">📊 Estatísticas de Notificações</h5>
								<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
							</div>
							<div class="modal-body">
								<div class="row">
									<div class="col-md-4">
										<div class="card bg-primary text-white">
											<div class="card-body">
												<h6>📧 Email Service</h6>
												<p>Provider: ${stats.email.provider}</p>
												<p>Status: ${stats.email.status}</p>
											</div>
										</div>
									</div>
									<div class="col-md-4">
										<div class="card bg-success text-white">
											<div class="card-body">
												<h6>📱 SMS Service</h6>
												<p>Provider: ${stats.sms.provider}</p>
												<p>Status: ${stats.sms.status}</p>
											</div>
										</div>
									</div>
									<div class="col-md-4">
										<div class="card bg-info text-white">
											<div class="card-body">
												<h6>🔔 Push Service</h6>
												<p>Provider: ${stats.push.provider}</p>
												<p>Subscribers: ${stats.push.subscriberCount}</p>
											</div>
										</div>
									</div>
								</div>
								<div class="mt-3">
									<h6>Module Status</h6>
									<p><strong>Status:</strong> ${stats.module.status}</p>
									<p><strong>Uptime:</strong> ${Math.floor(stats.module.uptime / 60)} minutes</p>
									<p><strong>Last Check:</strong> ${new Date(stats.module.lastCheck).toLocaleString()}</p>
								</div>
							</div>
							<div class="modal-footer">
								<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
							</div>
						</div>
					</div>
				`;

				document.body.appendChild(modal);
				const bsModal = new bootstrap.Modal(modal);
				bsModal.show();

				modal.addEventListener('hidden.bs.modal', () => {
					document.body.removeChild(modal);
				});
			} else {
				this.showErrorAlert('Erro ao carregar estatísticas de notificação');
			}

		} catch (error) {
			console.error('Error loading notification stats:', error);
			this.showErrorAlert('Erro ao carregar estatísticas de notificação');
		}
	}

	// Inventory test functions
	async showInventoryStats() {
		try {
			const response = await fetch('/api/inventory/stats');
			const data = await response.json();

			if (data.success) {
				const stats = data.data;
				const modal = document.createElement('div');
				modal.className = 'modal fade';
				modal.innerHTML = `
					<div class="modal-dialog modal-lg">
						<div class="modal-content">
							<div class="modal-header">
								<h5 class="modal-title">📦 Estatísticas de Estoque</h5>
								<button type="button" class="btn-close" data-bs-dismiss="modal"></button>
							</div>
							<div class="modal-body">
								<div class="row">
									<div class="col-md-3">
										<div class="card bg-primary text-white">
											<div class="card-body text-center">
												<h4>${stats.totalProducts}</h4>
												<p>Total de Produtos</p>
											</div>
										</div>
									</div>
									<div class="col-md-3">
										<div class="card bg-warning text-white">
											<div class="card-body text-center">
												<h4>${stats.lowStockCount}</h4>
												<p>Estoque Baixo</p>
											</div>
										</div>
									</div>
									<div class="col-md-3">
										<div class="card bg-danger text-white">
											<div class="card-body text-center">
												<h4>${stats.outOfStockCount}</h4>
												<p>Sem Estoque</p>
											</div>
										</div>
									</div>
									<div class="col-md-3">
										<div class="card bg-success text-white">
											<div class="card-body text-center">
												<h4>$${stats.totalInventoryValue.toFixed(2)}</h4>
												<p>Valor Total</p>
											</div>
										</div>
									</div>
								</div>
								${stats.lowStockProducts && stats.lowStockProducts.length > 0 ? `
								<div class="mt-3">
									<h6>⚠️ Produtos com Estoque Baixo</h6>
									<div class="list-group">
										${stats.lowStockProducts.map(product => `
											<div class="list-group-item">
												<div class="d-flex justify-content-between">
													<span><strong>${product.name}</strong></span>
													<span class="badge bg-warning">Disponível: ${product.available}</span>
												</div>
												<small class="text-muted">Estoque mínimo: ${product.minStock}</small>
											</div>
										`).join('')}
									</div>
								</div>
								` : ''}
							</div>
							<div class="modal-footer">
								<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
							</div>
						</div>
					</div>
				`;

				document.body.appendChild(modal);
				const bsModal = new bootstrap.Modal(modal);
				bsModal.show();

				modal.addEventListener('hidden.bs.modal', () => {
					document.body.removeChild(modal);
				});
			} else {
				this.showErrorAlert('Erro ao carregar estatísticas de estoque');
			}

		} catch (error) {
			console.error('Error loading inventory stats:', error);
			this.showErrorAlert('Erro ao carregar estatísticas de estoque');
		}
	}

	async addTestStock() {
		try {
			// Get products first
			const productsResponse = await fetch('/api/products');
			const productsData = await productsResponse.json();

			if (!productsData.success || productsData.data.length === 0) {
				this.showWarningAlert('Nenhum produto disponível para adicionar estoque');
				return;
			}

			// Get random product
			const products = productsData.data;
			const randomProduct = products[Math.floor(Math.random() * products.length)];
			const quantityToAdd = Math.floor(Math.random() * 50) + 10; // 10-59 units

			const response = await fetch(`/api/products/${randomProduct.id}/add-stock`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					quantity: quantityToAdd,
					reason: 'test_restock'
				})
			});

			if (response.ok) {
				const result = await response.json();
				this.showSuccessAlert(`Adicionadas ${quantityToAdd} unidades ao produto ${randomProduct.name}`);
			} else {
				throw new Error('Falha ao adicionar estoque');
			}
		} catch (error) {
			this.showErrorAlert('Erro ao adicionar estoque de teste: ' + error.message);
		}
	}

	async reserveTestStock() {
		try {
			// Get products first
			const productsResponse = await fetch('/api/products');
			const productsData = await productsResponse.json();

			if (!productsData.success || productsData.data.length === 0) {
				this.showWarningAlert('Nenhum produto disponível para reservar estoque');
				return;
			}

			// Find product with available stock
			const products = productsData.data.filter(p => p.available > 0);
			if (products.length === 0) {
				this.showWarningAlert('Nenhum produto com estoque disponível');
				return;
			}

			const randomProduct = products[Math.floor(Math.random() * products.length)];
			const quantityToReserve = Math.min(
				Math.floor(Math.random() * 5) + 1, // 1-5 units
				randomProduct.available
			);
			const testOrderId = 'TEST_ORDER_' + Date.now();

			const response = await fetch(`/api/products/${randomProduct.id}/reserve`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					quantity: quantityToReserve,
					orderId: testOrderId
				})
			});

			if (response.ok) {
				const result = await response.json();
				this.showSuccessAlert(`Reservadas ${quantityToReserve} unidades do produto ${randomProduct.name} para o pedido ${testOrderId}`);
			} else {
				throw new Error('Falha ao reservar estoque');
			}
		} catch (error) {
			this.showErrorAlert('Erro ao reservar estoque de teste: ' + error.message);
		}
	}

	async createTestProduct() {
		try {
			const productId = 'PROD_TEST_' + Date.now();
			const productNames = [
				'Smartphone Galaxy',
				'Notebook Gamer',
				'Fone Bluetooth',
				'Mouse RGB',
				'Teclado Mecânico',
				'Monitor 4K',
				'SSD NVMe',
				'Webcam HD',
				'Tablet Pro',
				'Smartwatch'
			];

			const randomName = productNames[Math.floor(Math.random() * productNames.length)];
			const randomPrice = Math.floor(Math.random() * 1000) + 50;
			const randomStock = Math.floor(Math.random() * 100) + 10;

			const response = await fetch('/api/products', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					id: productId,
					name: randomName + ' Test',
					description: `Produto de teste criado automaticamente - ${randomName}`,
					price: randomPrice,
					stock: randomStock,
					category: 'test',
					sku: `TEST-${Date.now()}`,
					minStock: 5
				})
			});

			if (response.ok) {
				const result = await response.json();
				this.showSuccessAlert(`Produto de teste criado: ${result.data.name} (${randomStock} unidades)`);
			} else {
				throw new Error('Falha ao criar produto');
			}
		} catch (error) {
			this.showErrorAlert('Erro ao criar produto de teste: ' + error.message);
		}
	}
}

// Global functions
function clearMessages() {
	dashboard.messages = [];
	dashboard.renderMessages();
	dashboard.showSuccessAlert('Mensagens limpas');
}

function pauseMessages() {
	dashboard.isPaused = !dashboard.isPaused;
	const btn = document.getElementById('pauseBtn');

	if (dashboard.isPaused) {
		btn.innerHTML = '<i class="bi bi-play"></i> Retomar';
		btn.className = 'btn btn-sm btn-outline-success';
	} else {
		btn.innerHTML = '<i class="bi bi-pause"></i> Pausar';
		btn.className = 'btn btn-sm btn-outline-primary';
	}
}

function updateFilter() {
	dashboard.filters.order = document.getElementById('filterOrder').checked;
	dashboard.filters.payment = document.getElementById('filterPayment').checked;
	dashboard.filters.inventory = document.getElementById('filterInventory').checked;
	dashboard.filters.notification = document.getElementById('filterNotification').checked;

	dashboard.renderMessages();
}

// Test functions
function createTestOrder() {
	dashboard.createTestOrder();
}

function createTestPayment() {
	dashboard.createTestPayment();
}

function processTestPayment() {
	dashboard.processTestPayment();
}

function refundTestPayment() {
	dashboard.refundTestPayment();
}

function checkTestInventory() {
	dashboard.checkTestInventory();
}

function sendTestNotification() {
	dashboard.sendTestNotification();
}

function showNotificationStats() {
	dashboard.showNotificationStats();
}

function showInventoryStats() {
	dashboard.showInventoryStats();
}

function addTestStock() {
	dashboard.addTestStock();
}

function reserveTestStock() {
	dashboard.reserveTestStock();
}

function createTestProduct() {
	dashboard.createTestProduct();
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', function () {
	dashboard = new Dashboard();
});
