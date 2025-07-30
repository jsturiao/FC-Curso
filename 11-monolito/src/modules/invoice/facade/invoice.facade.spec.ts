import { Sequelize } from "sequelize-typescript";
import InvoiceFacadeFactory from "../factory/invoice.facade.factory";
import InvoiceItemsModel from "../repository/invoice-items.model";
import InvoiceModel from "../repository/invoice.model";

describe("Invoice Facade test", () => {
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
		const facade = InvoiceFacadeFactory.create();

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

		const output = await facade.generate(input);

		expect(output.id).toBeDefined();
		expect(output.name).toEqual(input.name);
		expect(output.document).toEqual(input.document);
		expect(output.street).toEqual(input.street);
		expect(output.number).toEqual(input.number);
		expect(output.complement).toEqual(input.complement);
		expect(output.city).toEqual(input.city);
		expect(output.state).toEqual(input.state);
		expect(output.zipCode).toEqual(input.zipCode);
		expect(output.items.length).toBe(2);
		expect(output.items[0].id).toEqual(input.items[0].id);
		expect(output.items[0].name).toEqual(input.items[0].name);
		expect(output.items[0].price).toEqual(input.items[0].price);
		expect(output.items[1].id).toEqual(input.items[1].id);
		expect(output.items[1].name).toEqual(input.items[1].name);
		expect(output.items[1].price).toEqual(input.items[1].price);
		expect(output.total).toBe(300);

		// Verificar se foi salvo no banco
		const invoiceDb = await InvoiceModel.findOne({
			where: { id: output.id },
			include: [{ model: InvoiceItemsModel }],
		});

		expect(invoiceDb).toBeDefined();
		expect(invoiceDb.name).toEqual(input.name);
		expect(invoiceDb.items.length).toBe(2);
	});

	it("should find an invoice", async () => {
		const facade = InvoiceFacadeFactory.create();

		// Primeiro gerar uma invoice
		const inputGenerate = {
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

		const outputGenerate = await facade.generate(inputGenerate);

		// Então buscar a invoice
		const inputFind = {
			id: outputGenerate.id,
		};

		const outputFind = await facade.find(inputFind);

		expect(outputFind.id).toEqual(outputGenerate.id);
		expect(outputFind.name).toEqual(inputGenerate.name);
		expect(outputFind.document).toEqual(inputGenerate.document);
		expect(outputFind.address.street).toEqual(inputGenerate.street);
		expect(outputFind.address.number).toEqual(inputGenerate.number);
		expect(outputFind.address.complement).toEqual(inputGenerate.complement);
		expect(outputFind.address.city).toEqual(inputGenerate.city);
		expect(outputFind.address.state).toEqual(inputGenerate.state);
		expect(outputFind.address.zipCode).toEqual(inputGenerate.zipCode);
		expect(outputFind.items.length).toBe(2);
		expect(outputFind.items[0].id).toEqual(inputGenerate.items[0].id);
		expect(outputFind.items[0].name).toEqual(inputGenerate.items[0].name);
		expect(outputFind.items[0].price).toEqual(inputGenerate.items[0].price);
		expect(outputFind.items[1].id).toEqual(inputGenerate.items[1].id);
		expect(outputFind.items[1].name).toEqual(inputGenerate.items[1].name);
		expect(outputFind.items[1].price).toEqual(inputGenerate.items[1].price);
		expect(outputFind.total).toBe(300);
		expect(outputFind.createdAt).toBeDefined();
	});
});