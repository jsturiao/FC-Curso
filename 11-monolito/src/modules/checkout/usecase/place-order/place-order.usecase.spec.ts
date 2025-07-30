import PlaceOrderUseCase from "./place-order.usecase";
import { PlaceOrderInputDto } from "./place-order.dto";
import Product from "../../domain/product.entity";
import Id from "../../../@shared/domain/value-object/id.value-object";

const mockDate = new Date(2023, 10, 1);

describe("PlaceOrderUseCase unit test", () => {

	describe("validateProducts method", () => {

		//@ts-expect-error - no params in constructor
		const placeOrderUseCase = new PlaceOrderUseCase();

		it("should throw an error when no products are selected", async () => {

			const input: PlaceOrderInputDto = { clientId: "0", products: [] }

			await expect(placeOrderUseCase["validateProducts"](input)).rejects.toThrow(new Error("No products selected"));
		});

		it("should throw an error when product is out of stock", async () => {

			const mockProductFacade = {
				checkStock: jest.fn(({ productId }: { productId: string }) => {
					return Promise.resolve({
						productId,
						stock: productId === "1" ? 0 : 1,
					});
				}),
			};

			//@ts-expect-error - force set productFacade
			placeOrderUseCase["_productFacade"] = mockProductFacade;

			let input: PlaceOrderInputDto = {
				clientId: "0",
				products: [{ productId: "1" }],
			};

			await expect(placeOrderUseCase["validateProducts"](input)).rejects.toThrow(new Error("Product 1 is out of stock"));

			input = {
				clientId: "0",
				products: [{ productId: "0" }, { productId: "1" }],
			};

			await expect(placeOrderUseCase["validateProducts"](input)).rejects.toThrow(new Error("Product 1 is out of stock"));
			expect(mockProductFacade.checkStock).toHaveBeenCalledTimes(3);

			input = {
				clientId: "0",
				products: [{ productId: "0" }, { productId: "1" }, { productId: "2" }],
			};

			await expect(placeOrderUseCase["validateProducts"](input)).rejects.toThrow(new Error("Product 1 is out of stock"));
			expect(mockProductFacade.checkStock).toHaveBeenCalledTimes(5);

		});
	});

	describe("getProducts method", () => {

		beforeAll(() => {
			jest.useFakeTimers("modern");
			jest.setSystemTime(mockDate);
		});

		afterAll(() => {
			jest.useRealTimers();
		});

		//@ts-expect-error - no params in constructor
		const placeOrderUseCase = new PlaceOrderUseCase();

		it("should throw an error when product not found", async () => {
			const mockCatalogFacade = {
				find: jest.fn().mockResolvedValue(null),
			};

			//@ts-expect-error - force set productFacade
			placeOrderUseCase["_catalogFacade"] = mockCatalogFacade;

			await expect(placeOrderUseCase["getProduct"]("0")).rejects.toThrow(new Error("Product not found"));

		});

		it("should return a product", async () => {
			const mockCatalogFacade = {
				find: jest.fn().mockResolvedValue({
					id: "0",
					name: "Product 0",
					description: "Product 0 description",
					salesPrice: 0,
				}),
			};

			//@ts-expect-error - force set productFacade
			placeOrderUseCase["_catalogFacade"] = mockCatalogFacade;

			await expect(placeOrderUseCase["getProduct"]("0")).resolves.toEqual(
				new Product({
					id: new Id("0"),
					name: "Product 0",
					description: "Product 0 description",
					salesPrice: 0,
				})

			);
			expect(mockCatalogFacade.find).toHaveBeenCalledTimes(1);

		});

	});

	describe("execute method", () => {

		beforeAll(() => {
			jest.useFakeTimers("modern");
			jest.setSystemTime(mockDate);
		});

		afterAll(() => {
			jest.useRealTimers();
		});

		it("should throw an error when client not found", async () => {

			const mockClientFacade = {
				find: jest.fn().mockResolvedValue(null),
			}

			//@ts-expect-error - no params in constructor
			const placeOrderUseCase = new PlaceOrderUseCase();
			//@ts-expect-error - force set clientfacade
			placeOrderUseCase["_clientFacade"] = mockClientFacade;

			const input: PlaceOrderInputDto = { clientId: "1", products: [] }

			await expect(placeOrderUseCase.execute(input)).rejects.toThrow(new Error("Client not found"));
		});

		it("should throw an error when products are not valid", async () => {

			const mockClientFacade = {
				find: jest.fn().mockResolvedValue(true),
			}

			//@ts-expect-error - no params in constructor
			const placeOrderUseCase = new PlaceOrderUseCase();

			const mockValidateProducts = jest
				//@ts-expect-error - spy on private method
				.spyOn(placeOrderUseCase, "validateProducts")
				//@ts-expect-error - no return never
				.mockRejectedValue(new Error("No products selected"));

			//@ts-expect-error - force set clientFacada
			placeOrderUseCase["_clientFacade"] = mockClientFacade;

			const input: PlaceOrderInputDto = { clientId: "1", products: [] }

			await expect(placeOrderUseCase.execute(input)).rejects.toThrow(new Error("No products selected"));
			expect(mockValidateProducts).toHaveBeenCalledTimes(1);

		});

		describe("place an order", () => {

			const clientProps = {
				id: "1",
				name: "Client 1",
				document: "123456789",
				email: "client1@example.com",
				address: {
					street: "some address",
					number: "123",
					complement: "complement",
					city: "Criciúma",
					state: "SC",
					zipCode: "88888-888",
				},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mockClientFacade = {
				add: jest.fn(),
				find: jest.fn().mockResolvedValue(clientProps),
			}

			const mockPaymentFacade = {
				process: jest.fn(),
			}

			const mockCheckoutRepo = {
				addOrder: jest.fn(),
				findOrder: jest.fn(),
			}

			const mockInvoiceFacade = {
				generate: jest.fn().mockResolvedValue({ id: "1i" }),
				find: jest.fn(),
			}

			const placeOrderUseCase = new PlaceOrderUseCase(
				mockClientFacade,
				null,
				null,
				mockCheckoutRepo,
				mockInvoiceFacade,
				mockPaymentFacade
			);

			const products = {
				"1": new Product({
					id: new Id("1"),
					name: "Product 1",
					description: "Product 1 description",
					salesPrice: 40,
				}),
				"2": new Product({
					id: new Id("2"),
					name: "Product 2",
					description: "Product 2 description",
					salesPrice: 30,
				}),
			}

			const mockValidateProducts = jest
				//@ts-expect-error - spy on private method
				.spyOn(placeOrderUseCase, "validateProducts")
				//@ts-expect-error - spy on private method
				.mockResolvedValue(null);

			const mockGetProduct = jest
				//@ts-expect-error - spy on private method
				.spyOn(placeOrderUseCase, "getProduct")
				//@ts-expect-error - not return never
				.mockImplementation((productId: keyof typeof products) => {
					return products[productId];
				});


			it("should not be aproved", async () => {
				mockPaymentFacade.process = jest.fn().mockResolvedValue({
					transactionId: "1t",
					orderId: "1o",
					amount: 100,
					status: "error",
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				const input: PlaceOrderInputDto = {
					clientId: "1c",
					products: [{ productId: "1" }, { productId: "2" }],
				};

				let output = await placeOrderUseCase.execute(input);

				expect(output.invoiceId).toBeNull();
				expect(output.total).toBe(70);
				expect(output.products).toStrictEqual([
					{ productId: "1" },
					{ productId: "2" },
				]);

				expect(mockClientFacade.find).toHaveBeenCalledTimes(1);
				expect(mockClientFacade.find).toHaveBeenCalledWith({ id: "1c" });
				expect(mockValidateProducts).toHaveBeenCalledTimes(1);
				expect(mockValidateProducts).toHaveBeenCalledWith(input);
				expect(mockGetProduct).toHaveBeenCalledTimes(2);
				expect(mockCheckoutRepo.addOrder).toHaveBeenCalledTimes(1);
				expect(mockPaymentFacade.process).toHaveBeenCalledWith({
					orderId: output.id,
					amount: output.total,
				});

				expect(mockInvoiceFacade.generate).toHaveBeenCalledTimes(0);
			});

		});

	});

});

