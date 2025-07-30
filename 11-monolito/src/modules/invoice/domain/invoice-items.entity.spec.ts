import Id from "../../@shared/domain/value-object/id.value-object";
import InvoiceItems from "./invoice-items.entity";

describe("InvoiceItems Entity unit test", () => {
	it("should create an invoice item", () => {
		const item = new InvoiceItems({
			id: new Id("1"),
			name: "Item 1",
			price: 100,
		});

		expect(item.id.id).toEqual("1");
		expect(item.name).toEqual("Item 1");
		expect(item.price).toBe(100);
	});

	it("should throw error when name is empty", () => {
		expect(() => {
			new InvoiceItems({
				id: new Id("1"),
				name: "",
				price: 100,
			});
		}).toThrow("Name is required");
	});

	it("should throw error when price is zero or negative", () => {
		expect(() => {
			new InvoiceItems({
				id: new Id("1"),
				name: "Item 1",
				price: 0,
			});
		}).toThrow("Price must be greater than 0");

		expect(() => {
			new InvoiceItems({
				id: new Id("1"),
				name: "Item 1",
				price: -100,
			});
		}).toThrow("Price must be greater than 0");
	});
});