import EventDispatcher from "../../@shared/event/event-dispatcher";
import Address from "../value-object/address";
import Customer from "../entity/customer";
import CustomerAddressChangedEvent from "./customer-address-changed.event";
import EnviaConsoleLogHandler from "./handler/envia-console-log.handler";

describe("CustomerAddressChanged event tests", () => {
	it("should trigger CustomerAddressChanged event handler", () => {
		const eventDispatcher = new EventDispatcher();
		const handler = new EnviaConsoleLogHandler();

		const spyHandler = jest.spyOn(handler, "handle");

		eventDispatcher.register("CustomerAddressChangedEvent", handler);

		const customer = new Customer("1", "John Doe", eventDispatcher);
		const address = new Address("Rua A", 123, "12345-678", "São Paulo");

		customer.changeAddress(address);

		expect(spyHandler).toHaveBeenCalled();
	});

	it("should create CustomerAddressChanged event with correct data", () => {
		const address = new Address("Rua A", 123, "12345-678", "São Paulo");
		const eventData = {
			id: "1",
			name: "John Doe",
			address: address
		};

		const event = new CustomerAddressChangedEvent(eventData);

		expect(event.eventData.id).toBe("1");
		expect(event.eventData.name).toBe("John Doe");
		expect(event.eventData.address).toBe(address);
		expect(event.dataTimeOccurred).toBeInstanceOf(Date);
	});

	it("should log correct message when CustomerAddressChanged event is triggered", () => {
		const eventDispatcher = new EventDispatcher();
		const handler = new EnviaConsoleLogHandler();

		const consoleSpy = jest.spyOn(console, "log");

		eventDispatcher.register("CustomerAddressChangedEvent", handler);

		const customer = new Customer("1", "John Doe", eventDispatcher);
		const address = new Address("Rua A", 123, "12345-678", "São Paulo");

		customer.changeAddress(address);

		const expectedMessage = "Endereço do cliente: 1, John Doe alterado para: Rua A, 123, 12345-678, São Paulo";
		expect(consoleSpy).toHaveBeenCalledWith(expectedMessage);

		consoleSpy.mockRestore();
	});

	it("should work correctly when no handlers are registered", () => {
		const customer = new Customer("456", "Jane Smith");
		const address = new Address("Avenida Paulista", 1000, "01310-100", "São Paulo");

		// Não deve gerar erro mesmo sem handlers registrados
		expect(() => {
			customer.changeAddress(address);
		}).not.toThrow();

		// Verificar que o customer foi atualizado corretamente
		expect(customer.id).toBe("456");
		expect(customer.name).toBe("Jane Smith");
		expect(customer.Address.street).toBe("Avenida Paulista");
		expect(customer.Address.number).toBe(1000);
		expect(customer.Address.zip).toBe("01310-100");
		expect(customer.Address.city).toBe("São Paulo");
	});
});
