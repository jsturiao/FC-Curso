import EventDispatcher from "../../@shared/event/event-dispatcher";
import Address from "../value-object/address";
import Customer from "../entity/customer";
import CustomerCreatedEvent from "./customer-created.event";
import EnviaConsoleLog1Handler from "./handler/envia-console-log1.handler";
import EnviaConsoleLog2Handler from "./handler/envia-console-log2.handler";

describe("CustomerCreated event tests", () => {
  it("should trigger CustomerCreated event handlers", () => {
    const eventDispatcher = new EventDispatcher();
    const handler1 = new EnviaConsoleLog1Handler();
    const handler2 = new EnviaConsoleLog2Handler();
    
    const spyHandler1 = jest.spyOn(handler1, "handle");
    const spyHandler2 = jest.spyOn(handler2, "handle");
    
    eventDispatcher.register("CustomerCreatedEvent", handler1);
    eventDispatcher.register("CustomerCreatedEvent", handler2);
    
    const customer = new Customer("1", "John Doe", eventDispatcher);
    
    expect(spyHandler1).toHaveBeenCalled();
    expect(spyHandler2).toHaveBeenCalled();
  });

  it("should create CustomerCreated event with correct data", () => {
    const eventData = {
      id: "1",
      name: "John Doe"
    };
    
    const event = new CustomerCreatedEvent(eventData);
    
    expect(event.eventData.id).toBe("1");
    expect(event.eventData.name).toBe("John Doe");
    expect(event.dataTimeOccurred).toBeInstanceOf(Date);
  });

  it("should log correct messages when CustomerCreated event is triggered", () => {
    const eventDispatcher = new EventDispatcher();
    const handler1 = new EnviaConsoleLog1Handler();
    const handler2 = new EnviaConsoleLog2Handler();
    
    const consoleSpy = jest.spyOn(console, "log");
    
    eventDispatcher.register("CustomerCreatedEvent", handler1);
    eventDispatcher.register("CustomerCreatedEvent", handler2);
    
    const customer = new Customer("1", "John Doe", eventDispatcher);
    
    expect(consoleSpy).toHaveBeenCalledWith("Esse é o primeiro console.log do evento: CustomerCreated");
    expect(consoleSpy).toHaveBeenCalledWith("Esse é o segundo console.log do evento: CustomerCreated");
    
    consoleSpy.mockRestore();
  });
});
