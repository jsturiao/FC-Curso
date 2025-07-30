import Address from "../../@shared/domain/value-object/address";
import Id from "../../@shared/domain/value-object/id.value-object";
import Invoice from "./invoice.entity";
import InvoiceItems from "./invoice-items.entity";

describe("Invoice Entity unit test", () => {
	it("should create an invoice", () => {
		const item1 = new InvoiceItems({
			id: new Id("1"),
			name: "Item 1",
			price: 100,
		});

		const item2 = new InvoiceItems({
			id: new Id("2"),
			name: "Item 2",
			price: 200,
		});

		const invoice = new Invoice({
			id: new Id("1"),
			name: "John Doe",
			document: "123456789",
			address: new Address(
				"Rua 123",
				"99",
				"Casa Verde",
				"Criciúma",
				"SC",
				"88888-888"
			),
			items: [item1, item2],
		});

		expect(invoice.id.id).toEqual("1");
		expect(invoice.name).toEqual("John Doe");
		expect(invoice.document).toEqual("123456789");
		expect(invoice.address.street).toEqual("Rua 123");
		expect(invoice.items.length).toBe(2);
		expect(invoice.total()).toBe(300);
	});

	it("should throw error when name is empty", () => {
		const item = new InvoiceItems({
			id: new Id("1"),
			name: "Item 1",
			price: 100,
		});

		expect(() => {
			new Invoice({
				id: new Id("1"),
				name: "",
				document: "123456789",
				address: new Address(
					"Rua 123",
					"99",
					"Casa Verde",
					"Criciúma",
					"SC",
					"88888-888"
				),
				items: [item],
			});
		}).toThrow("Name is required");
	});

	it("should throw error when document is empty", () => {
		const item = new InvoiceItems({
			id: new Id("1"),
			name: "Item 1",
			price: 100,
		});

		expect(() => {
			new Invoice({
				id: new Id("1"),
				name: "John Doe",
				document: "",
				address: new Address(
					"Rua 123",
					"99",
					"Casa Verde",
					"Criciúma",
					"SC",
					"88888-888"
				),
				items: [item],
			});
		}).toThrow("Document is required");
	});

	it("should throw error when items array is empty", () => {
		expect(() => {
			new Invoice({
				id: new Id("1"),
				name: "John Doe",
				document: "123456789",
				address: new Address(
					"Rua 123",
					"99",
					"Casa Verde",
					"Criciúma",
					"SC",
					"88888-888"
				),
				items: [],
			});
		}).toThrow("Invoice must have at least one item");
	});
});