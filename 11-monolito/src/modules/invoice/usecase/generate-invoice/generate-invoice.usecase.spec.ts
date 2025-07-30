import GenerateInvoiceUseCase from "./generate-invoice.usecase";

const MockRepository = () => {
	return {
		generate: jest.fn().mockImplementation((invoice) => Promise.resolve(invoice)),
		find: jest.fn(),
	};
};

describe("Generate Invoice Use Case unit test", () => {
	it("should generate an invoice", async () => {
		const repository = MockRepository();
		const usecase = new GenerateInvoiceUseCase(repository);

		const input = {
			name: "John Doe",
			document: "123456789",
			street: "Rua 123",
			number: "99",
			complement: "Casa Verde",
			city: "Criciúma",
			state: "SC",
			zipCode: "88888-888",
			items: [
				{
					id: "1",
					name: "Item 1",
					price: 100,
				},
				{
					id: "2",
					name: "Item 2",
					price: 200,
				},
			],
		};

		const result = await usecase.execute(input);

		expect(repository.generate).toHaveBeenCalled();
		expect(result.id).toBeDefined();
		expect(result.name).toEqual(input.name);
		expect(result.document).toEqual(input.document);
		expect(result.street).toEqual(input.street);
		expect(result.number).toEqual(input.number);
		expect(result.complement).toEqual(input.complement);
		expect(result.city).toEqual(input.city);
		expect(result.state).toEqual(input.state);
		expect(result.zipCode).toEqual(input.zipCode);
		expect(result.items.length).toBe(2);
		expect(result.items[0].id).toEqual(input.items[0].id);
		expect(result.items[0].name).toEqual(input.items[0].name);
		expect(result.items[0].price).toEqual(input.items[0].price);
		expect(result.items[1].id).toEqual(input.items[1].id);
		expect(result.items[1].name).toEqual(input.items[1].name);
		expect(result.items[1].price).toEqual(input.items[1].price);
		expect(result.total).toBe(300);
	});

	it("should throw error when name is empty", async () => {
		const repository = MockRepository();
		const usecase = new GenerateInvoiceUseCase(repository);

		const input = {
			name: "",
			document: "123456789",
			street: "Rua 123",
			number: "99",
			complement: "Casa Verde",
			city: "Criciúma",
			state: "SC",
			zipCode: "88888-888",
			items: [
				{
					id: "1",
					name: "Item 1",
					price: 100,
				},
			],
		};

		await expect(usecase.execute(input)).rejects.toThrow("Name is required");
	});

	it("should throw error when items array is empty", async () => {
		const repository = MockRepository();
		const usecase = new GenerateInvoiceUseCase(repository);

		const input = {
			name: "John Doe",
			document: "123456789",
			street: "Rua 123",
			number: "99",
			complement: "Casa Verde",
			city: "Criciúma",
			state: "SC",
			zipCode: "88888-888",
			items: [] as {
				id: string;
				name: string;
				price: number;
			}[],
		};

		await expect(usecase.execute(input)).rejects.toThrow("Invoice must have at least one item");
	});
});