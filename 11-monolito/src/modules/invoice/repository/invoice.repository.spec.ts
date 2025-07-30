import { Sequelize } from "sequelize-typescript";
import Address from "../../@shared/domain/value-object/address";
import Id from "../../@shared/domain/value-object/id.value-object";
import Invoice from "../domain/invoice.entity";
import InvoiceItems from "../domain/invoice-items.entity";
import InvoiceItemsModel from "./invoice-items.model";
import InvoiceModel from "./invoice.model";
import InvoiceRepository from "./invoice.repository";

describe("Invoice Repository test", () => {
	let sequelize: Sequelize;

	beforeEach(async () => {
		sequelize = new Sequelize({
			dialect: "sqlite",
			storage: ":memory:",
			logging: false,
			sync: { force: true },
		});

		await sequelize.addModels([InvoiceModel, InvoiceItemsModel]);
		await sequelize.sync();
	});

	afterEach(async () => {
		await sequelize.close();
	});

	it("should generate an invoice", async () => {
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

		const repository = new InvoiceRepository();
		const result = await repository.generate(invoice);

		expect(result.id.id).toEqual(invoice.id.id);
		expect(result.name).toEqual(invoice.name);
		expect(result.document).toEqual(invoice.document);

		// Verificar no banco de dados
		const invoiceDb = await InvoiceModel.findOne({
			where: { id: invoice.id.id },
			include: [{ model: InvoiceItemsModel }],
		});

		expect(invoiceDb).toBeDefined();
		expect(invoiceDb.id).toEqual(invoice.id.id);
		expect(invoiceDb.name).toEqual(invoice.name);
		expect(invoiceDb.document).toEqual(invoice.document);
		expect(invoiceDb.street).toEqual(invoice.address.street);
		expect(invoiceDb.number).toEqual(invoice.address.number);
		expect(invoiceDb.complement).toEqual(invoice.address.complement);
		expect(invoiceDb.city).toEqual(invoice.address.city);
		expect(invoiceDb.state).toEqual(invoice.address.state);
		expect(invoiceDb.zipCode).toEqual(invoice.address.zipCode);
		expect(invoiceDb.items.length).toBe(2);
		expect(invoiceDb.items[0].name).toEqual("Item 1");
		expect(invoiceDb.items[0].price).toBe(100);
		expect(invoiceDb.items[1].name).toEqual("Item 2");
		expect(invoiceDb.items[1].price).toBe(200);
	});

	it("should find an invoice", async () => {
		// Criar invoice no banco
		const invoiceDb = await InvoiceModel.create(
			{
				id: "1",
				name: "John Doe",
				document: "123456789",
				street: "Rua 123",
				number: "99",
				complement: "Casa Verde",
				city: "Criciúma",
				state: "SC",
				zipCode: "88888-888",
				createdAt: new Date(),
				updatedAt: new Date(),
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
			},
			{
				include: [{ model: InvoiceItemsModel }],
			}
		);

		const repository = new InvoiceRepository();
		const result = await repository.find("1");

		expect(result.id.id).toEqual("1");
		expect(result.name).toEqual("John Doe");
		expect(result.document).toEqual("123456789");
		expect(result.address.street).toEqual("Rua 123");
		expect(result.address.number).toEqual("99");
		expect(result.address.complement).toEqual("Casa Verde");
		expect(result.address.city).toEqual("Criciúma");
		expect(result.address.state).toEqual("SC");
		expect(result.address.zipCode).toEqual("88888-888");
		expect(result.items.length).toBe(2);
		expect(result.items[0].name).toEqual("Item 1");
		expect(result.items[0].price).toBe(100);
		expect(result.items[1].name).toEqual("Item 2");
		expect(result.items[1].price).toBe(200);
		expect(result.total()).toBe(300);
	});

	it("should throw error when invoice not found", async () => {
		const repository = new InvoiceRepository();

		await expect(repository.find("non-existent-id")).rejects.toThrow(
			"Invoice with id non-existent-id not found"
		);
	});
});