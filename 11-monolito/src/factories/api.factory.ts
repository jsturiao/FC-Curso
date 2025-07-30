import ClientAdmFacadeFactory from '../modules/client-adm/factory/client-adm.facade.factory';
import ProductAdmFacadeFactory from '../modules/product-adm/factory/facade.factory';
import StoreCatalogFacadeFactory from '../modules/store-catalog/factory/facade.factory';
import PaymentFacadeFactory from '../modules/payment/factory/payment.facade.factory';
import InvoiceFacadeFactory from '../modules/invoice/factory/invoice.facade.factory';
import PlaceOrderUseCase from '../modules/checkout/usecase/place-order/place-order.usecase';
import CheckoutGateway from '../modules/checkout/gateway/checkout.gateway';

// Implementação real do CheckoutGateway
class CheckoutRepository implements CheckoutGateway {
  private orders: Map<string, any> = new Map();

  async addOrder(order: any): Promise<void> {
    this.orders.set(order.id.id, order);
    console.log(`Order ${order.id.id} saved to repository`);
  }
  
  async findOrder(id: string): Promise<any> {
    return this.orders.get(id) || null;
  }
}

export default class APIFactory {
  private static _clientFacade: any = null;
  private static _productFacade: any = null;
  private static _catalogFacade: any = null;
  private static _paymentFacade: any = null;
  private static _invoiceFacade: any = null;
  private static _checkoutRepository: CheckoutGateway = null;

  // Singleton pattern para as facades
  static getClientFacade() {
    if (!this._clientFacade) {
      this._clientFacade = ClientAdmFacadeFactory.create();
    }
    return this._clientFacade;
  }

  static getProductFacade() {
    if (!this._productFacade) {
      this._productFacade = ProductAdmFacadeFactory.create();
    }
    return this._productFacade;
  }

  static getCatalogFacade() {
    if (!this._catalogFacade) {
      this._catalogFacade = StoreCatalogFacadeFactory.create();
    }
    return this._catalogFacade;
  }

  static getPaymentFacade() {
    if (!this._paymentFacade) {
      this._paymentFacade = PaymentFacadeFactory.create();
    }
    return this._paymentFacade;
  }

  static getInvoiceFacade() {
    if (!this._invoiceFacade) {
      this._invoiceFacade = InvoiceFacadeFactory.create();
    }
    return this._invoiceFacade;
  }

  static getCheckoutRepository(): CheckoutGateway {
    if (!this._checkoutRepository) {
      this._checkoutRepository = new CheckoutRepository();
    }
    return this._checkoutRepository;
  }

  // Factory method para PlaceOrderUseCase
  static createPlaceOrderUseCase(): PlaceOrderUseCase {
    return new PlaceOrderUseCase(
      this.getClientFacade(),
      this.getProductFacade(),
      this.getCatalogFacade(),
      this.getCheckoutRepository(),
      this.getInvoiceFacade(),
      this.getPaymentFacade()
    );
  }

  // Método para limpar cache (útil para testes)
  static clearCache(): void {
    this._clientFacade = null;
    this._productFacade = null;
    this._catalogFacade = null;
    this._paymentFacade = null;
    this._invoiceFacade = null;
    this._checkoutRepository = null;
  }

  // Método para inicializar todas as facades (pre-loading)
  static async initialize(): Promise<void> {
    console.log('🏭 Initializing API Factory...');
    
    try {
      // Pre-load todas as facades
      this.getClientFacade();
      this.getProductFacade();
      this.getCatalogFacade();
      this.getPaymentFacade();
      this.getInvoiceFacade();
      this.getCheckoutRepository();
      
      console.log('✅ API Factory initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing API Factory:', error);
      throw error;
    }
  }

  // Health check para verificar se todas as facades estão funcionando
  static async healthCheck(): Promise<{ status: string; facades: Record<string, boolean> }> {
    const status = {
      clientFacade: false,
      productFacade: false,
      catalogFacade: false,
      paymentFacade: false,
      invoiceFacade: false,
      checkoutRepository: false
    };

    try {
      // Verificar se as facades estão instanciadas corretamente
      status.clientFacade = !!this.getClientFacade();
      status.productFacade = !!this.getProductFacade();
      status.catalogFacade = !!this.getCatalogFacade();
      status.paymentFacade = !!this.getPaymentFacade();
      status.invoiceFacade = !!this.getInvoiceFacade();
      status.checkoutRepository = !!this.getCheckoutRepository();

      const allHealthy = Object.values(status).every(healthy => healthy);
      
      return {
        status: allHealthy ? 'healthy' : 'unhealthy',
        facades: status
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'error',
        facades: status
      };
    }
  }
}
