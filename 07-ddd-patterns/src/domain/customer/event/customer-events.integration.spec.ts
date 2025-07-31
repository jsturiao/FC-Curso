import EventDispatcher from "../../@shared/event/event-dispatcher";
import Address from "../value-object/address";
import Customer from "../entity/customer";
import CustomerCreatedEvent from "./customer-created.event";
import CustomerAddressChangedEvent from "./customer-address-changed.event";
import EnviaConsoleLog1Handler from "./handler/envia-console-log1.handler";
import EnviaConsoleLog2Handler from "./handler/envia-console-log2.handler";
import EnviaConsoleLogHandler from "./handler/envia-console-log.handler";

describe("Customer Domain Events Integration Tests", () => {
  it("should trigger all customer events with correct handlers", () => {
    const eventDispatcher = new EventDispatcher();
    
    // Handlers para CustomerCreated
    const createdHandler1 = new EnviaConsoleLog1Handler();
    const createdHandler2 = new EnviaConsoleLog2Handler();
    
    // Handler para CustomerAddressChanged
    const addressChangedHandler = new EnviaConsoleLogHandler();
    
    // Spies para verificar chamadas
    const spyHandler1 = jest.spyOn(createdHandler1, "handle");
    const spyHandler2 = jest.spyOn(createdHandler2, "handle");
    const spyAddressHandler = jest.spyOn(addressChangedHandler, "handle");
    
    // Registrar handlers
    eventDispatcher.register("CustomerCreatedEvent", createdHandler1);
    eventDispatcher.register("CustomerCreatedEvent", createdHandler2);
    eventDispatcher.register("CustomerAddressChangedEvent", addressChangedHandler);
    
    // Criar customer (deve disparar CustomerCreated)
    const customer = new Customer("123", "John Doe", eventDispatcher);
    
    // Alterar endereço (deve disparar CustomerAddressChanged)
    const address = new Address("Rua das Flores", 100, "01234-567", "São Paulo");
    customer.changeAddress(address);
    
    // Verificar se todos os handlers foram chamados
    expect(spyHandler1).toHaveBeenCalled();
    expect(spyHandler2).toHaveBeenCalled();
    expect(spyAddressHandler).toHaveBeenCalled();
    
    // Verificar se foram chamados exatamente uma vez
    expect(spyHandler1).toHaveBeenCalledTimes(1);
    expect(spyHandler2).toHaveBeenCalledTimes(1);
    expect(spyAddressHandler).toHaveBeenCalledTimes(1);
  });

  it("should display correct console messages", () => {
    const eventDispatcher = new EventDispatcher();
    
    // Handlers
    const createdHandler1 = new EnviaConsoleLog1Handler();
    const createdHandler2 = new EnviaConsoleLog2Handler();
    const addressChangedHandler = new EnviaConsoleLogHandler();
    
    // Spy no console.log
    const consoleSpy = jest.spyOn(console, "log");
    
    // Registrar handlers
    eventDispatcher.register("CustomerCreatedEvent", createdHandler1);
    eventDispatcher.register("CustomerCreatedEvent", createdHandler2);
    eventDispatcher.register("CustomerAddressChangedEvent", addressChangedHandler);
    
    // Criar customer
    const customer = new Customer("123", "John Doe", eventDispatcher);
    
    // Alterar endereço
    const address = new Address("Rua das Flores", 100, "01234-567", "São Paulo");
    customer.changeAddress(address);
    
    // Verificar mensagens do console
    expect(consoleSpy).toHaveBeenCalledWith("Esse é o primeiro console.log do evento: CustomerCreated");
    expect(consoleSpy).toHaveBeenCalledWith("Esse é o segundo console.log do evento: CustomerCreated");
    expect(consoleSpy).toHaveBeenCalledWith("Endereço do cliente: 123, John Doe alterado para: Rua das Flores, 100, 01234-567, São Paulo");
    
    consoleSpy.mockRestore();
  });

  it("should work with default event dispatcher when none is provided", () => {
    const consoleSpy = jest.spyOn(console, "log");
    
    // Criar customer sem eventDispatcher (deve usar o padrão)
    const customer = new Customer("456", "Jane Smith");
    
    // Alterar endereço
    const address = new Address("Avenida Paulista", 1000, "01310-100", "São Paulo");
    customer.changeAddress(address);
    
    // Como não registramos handlers no dispatcher padrão, não deve ter logs
    // Mas o evento é criado e processado
    expect(customer.id).toBe("456");
    expect(customer.name).toBe("Jane Smith");
    expect(customer.Address.street).toBe("Avenida Paulista");
    
    consoleSpy.mockRestore();
  });
});
