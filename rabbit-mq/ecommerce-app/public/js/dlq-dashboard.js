// 🚨 DLQ Dashboard JavaScript
class DLQDashboard {
    constructor() {
        this.selectedMessages = new Set();
        this.currentMessages = [];
        this.currentMessageId = null;
        this.refreshInterval = null;
        
        this.initializeEventListeners();
        this.loadData();
        this.startAutoRefresh();
    }

    initializeEventListeners() {
        // Auto-refresh every 30 seconds
        this.startAutoRefresh();
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
                if (modal) modal.hide();
            }
        });
    }

    async loadData() {
        try {
            await Promise.all([
                this.loadStatistics(),
                this.loadMessages()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/dlq/stats');
            const stats = await response.json();
            
            document.getElementById('total-failed').textContent = stats.totalMessages || 0;
            document.getElementById('active-retries').textContent = stats.activeRetries || 0;
            document.getElementById('recent-errors').textContent = stats.recentErrors || 0;
            document.getElementById('reprocessed').textContent = stats.reprocessedCount || 0;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    async loadMessages() {
        const container = document.getElementById('messages-container');
        
        try {
            const filters = this.getFilters();
            const queryString = new URLSearchParams(filters).toString();
            const response = await fetch(`/api/dlq/messages?${queryString}`);
            const data = await response.json();
            
            this.currentMessages = data.messages || [];
            this.renderMessages(this.currentMessages);
            
            document.getElementById('message-count').textContent = 
                `${this.currentMessages.length} messages`;
                
        } catch (error) {
            console.error('Error loading messages:', error);
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error loading messages: ${error.message}
                </div>
            `;
        }
    }

    getFilters() {
        return {
            status: document.getElementById('filter-status').value,
            originalQueue: document.getElementById('filter-queue').value,
            limit: document.getElementById('filter-limit').value
        };
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="text-center p-4">
                    <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
                    <h4 class="mt-3">No Failed Messages! 🎉</h4>
                    <p class="text-muted">All messages are being processed successfully.</p>
                </div>
            `;
            return;
        }

        const messagesHtml = messages.map(message => this.renderMessageCard(message)).join('');
        container.innerHTML = messagesHtml;
        
        // Clear selections
        this.selectedMessages.clear();
    }

    renderMessageCard(message) {
        const statusBadge = this.getStatusBadge(message.status);
        const timeAgo = this.formatTimeAgo(message.timestamp);
        const retryInfo = message.retryCount > 0 ? 
            `<small class="text-muted">Retry ${message.retryCount}/${message.maxRetries}</small>` : '';
        
        return `
            <div class="card mb-3 error-card" data-message-id="${message.id}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" 
                               onchange="dlqDashboard.toggleSelection('${message.id}')"
                               id="check-${message.id}">
                        <label class="form-check-label fw-bold" for="check-${message.id}">
                            <i class="fas fa-envelope"></i> ${message.originalQueue || 'Unknown Queue'}
                        </label>
                    </div>
                    <div>
                        ${statusBadge}
                        <small class="text-muted ms-2">${timeAgo}</small>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="card-title">
                                <i class="fas fa-bug text-danger"></i> 
                                ${this.truncateText(message.error || 'Unknown Error', 80)}
                            </h6>
                            ${retryInfo}
                            <div class="error-detail mt-2">
                                <strong>Event:</strong> ${message.eventType || 'Unknown'}<br>
                                <strong>Error:</strong> ${this.truncateText(message.error, 120)}
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="btn-group" role="group">
                                <button class="btn btn-outline-info btn-sm" 
                                        onclick="dlqDashboard.viewMessage('${message.id}')">
                                    <i class="fas fa-eye"></i> View
                                </button>
                                <button class="btn btn-outline-warning btn-sm" 
                                        onclick="dlqDashboard.reprocessSingle('${message.id}')"
                                        ${message.status === 'reprocessing' ? 'disabled' : ''}>
                                    <i class="fas fa-redo"></i> Retry
                                </button>
                                <button class="btn btn-outline-danger btn-sm" 
                                        onclick="dlqDashboard.deleteSingle('${message.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getStatusBadge(status) {
        const badges = {
            'failed': '<span class="badge bg-danger status-badge">Failed</span>',
            'reprocessing': '<span class="badge bg-warning status-badge">Reprocessing</span>',
            'reprocessed': '<span class="badge bg-success status-badge">Reprocessed</span>',
            'reprocess_failed': '<span class="badge bg-dark status-badge">Retry Failed</span>'
        };
        return badges[status] || '<span class="badge bg-secondary status-badge">Unknown</span>';
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffInSeconds = Math.floor((now - messageTime) / 1000);
        
        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    toggleSelection(messageId) {
        if (this.selectedMessages.has(messageId)) {
            this.selectedMessages.delete(messageId);
        } else {
            this.selectedMessages.add(messageId);
        }
    }

    async viewMessage(messageId) {
        const message = this.currentMessages.find(m => m.id === messageId);
        if (!message) return;
        
        this.currentMessageId = messageId;
        
        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-info-circle"></i> Message Info</h6>
                    <table class="table table-sm">
                        <tr><td><strong>ID:</strong></td><td>${message.id}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>${this.getStatusBadge(message.status)}</td></tr>
                        <tr><td><strong>Queue:</strong></td><td>${message.originalQueue}</td></tr>
                        <tr><td><strong>Event:</strong></td><td>${message.eventType}</td></tr>
                        <tr><td><strong>Retries:</strong></td><td>${message.retryCount}/${message.maxRetries}</td></tr>
                        <tr><td><strong>Timestamp:</strong></td><td>${new Date(message.timestamp).toLocaleString()}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-exclamation-triangle text-danger"></i> Error Details</h6>
                    <div class="error-detail">
                        ${message.error || 'No error details available'}
                    </div>
                </div>
            </div>
            <hr>
            <h6><i class="fas fa-code"></i> Original Message Data</h6>
            <pre class="error-detail" style="max-height: 300px; overflow-y: auto;">${JSON.stringify(message.originalMessage, null, 2)}</pre>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('messageModal'));
        modal.show();
    }

    async reprocessMessage() {
        if (!this.currentMessageId) return;
        
        try {
            const response = await fetch(`/api/dlq/reprocess/${this.currentMessageId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showSuccess('Message sent for reprocessing');
                const modal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
                modal.hide();
                await this.loadData();
            } else {
                const error = await response.text();
                this.showError(`Failed to reprocess: ${error}`);
            }
        } catch (error) {
            this.showError(`Error reprocessing message: ${error.message}`);
        }
    }

    async deleteMessage() {
        if (!this.currentMessageId) return;
        
        if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/dlq/messages/${this.currentMessageId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showSuccess('Message deleted successfully');
                const modal = bootstrap.Modal.getInstance(document.getElementById('messageModal'));
                modal.hide();
                await this.loadData();
            } else {
                const error = await response.text();
                this.showError(`Failed to delete: ${error}`);
            }
        } catch (error) {
            this.showError(`Error deleting message: ${error.message}`);
        }
    }

    async reprocessSingle(messageId) {
        try {
            const response = await fetch(`/api/dlq/reprocess/${messageId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showSuccess('Message sent for reprocessing');
                await this.loadData();
            } else {
                const error = await response.text();
                this.showError(`Failed to reprocess: ${error}`);
            }
        } catch (error) {
            this.showError(`Error reprocessing message: ${error.message}`);
        }
    }

    async deleteSingle(messageId) {
        if (!confirm('Delete this message permanently?')) return;
        
        try {
            const response = await fetch(`/api/dlq/messages/${messageId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showSuccess('Message deleted');
                await this.loadData();
            } else {
                const error = await response.text();
                this.showError(`Failed to delete: ${error}`);
            }
        } catch (error) {
            this.showError(`Error deleting message: ${error.message}`);
        }
    }

    async bulkReprocess() {
        if (this.selectedMessages.size === 0) {
            this.showWarning('Please select messages to reprocess');
            return;
        }
        
        try {
            const response = await fetch('/api/dlq/bulk/reprocess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: Array.from(this.selectedMessages) })
            });
            
            if (response.ok) {
                this.showSuccess(`${this.selectedMessages.size} messages sent for reprocessing`);
                await this.loadData();
            } else {
                const error = await response.text();
                this.showError(`Bulk reprocess failed: ${error}`);
            }
        } catch (error) {
            this.showError(`Error in bulk reprocess: ${error.message}`);
        }
    }

    async bulkDelete() {
        if (this.selectedMessages.size === 0) {
            this.showWarning('Please select messages to delete');
            return;
        }
        
        if (!confirm(`Delete ${this.selectedMessages.size} messages permanently?`)) return;
        
        try {
            const response = await fetch('/api/dlq/bulk/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageIds: Array.from(this.selectedMessages) })
            });
            
            if (response.ok) {
                this.showSuccess(`${this.selectedMessages.size} messages deleted`);
                await this.loadData();
            } else {
                const error = await response.text();
                this.showError(`Bulk delete failed: ${error}`);
            }
        } catch (error) {
            this.showError(`Error in bulk delete: ${error.message}`);
        }
    }

    applyFilters() {
        this.loadMessages();
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            this.loadData();
        }, 30000); // Refresh every 30 seconds
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'danger');
    }

    showWarning(message) {
        this.showToast(message, 'warning');
    }

    showToast(message, type) {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1100';
            document.body.appendChild(container);
        }

        const toastHtml = `
            <div class="toast" role="alert">
                <div class="toast-header">
                    <i class="fas fa-${type === 'success' ? 'check-circle text-success' : 
                                      type === 'danger' ? 'exclamation-circle text-danger' : 
                                      'exclamation-triangle text-warning'}"></i>
                    <strong class="me-auto ms-2">DLQ Dashboard</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toast = new bootstrap.Toast(container.lastElementChild);
        toast.show();

        // Remove toast element after it's hidden
        container.lastElementChild.addEventListener('hidden.bs.toast', function() {
            this.remove();
        });
    }
}

// Global functions for HTML onclick handlers
async function refreshData() {
    const icon = document.getElementById('refresh-icon');
    icon.classList.add('refresh-btn');
    
    await dlqDashboard.loadData();
    
    setTimeout(() => {
        icon.classList.remove('refresh-btn');
    }, 1000);
}

async function applyFilters() {
    await dlqDashboard.applyFilters();
}

async function bulkReprocess() {
    await dlqDashboard.bulkReprocess();
}

async function bulkDelete() {
    await dlqDashboard.bulkDelete();
}

async function reprocessMessage() {
    await dlqDashboard.reprocessMessage();
}

async function deleteMessage() {
    await dlqDashboard.deleteMessage();
}

// Initialize dashboard when page loads
let dlqDashboard;
document.addEventListener('DOMContentLoaded', () => {
    dlqDashboard = new DLQDashboard();
});
