import InvoiceFacade from "../facade/invoice.facade";
import InvoiceRepository from "../repository/invoice.repository";
import FindInvoiceUseCase from "../usecase/find-invoice/find-invoice.usecase";
import GenerateInvoiceUseCase from "../usecase/generate-invoice/generate-invoice.usecase";

export default class InvoiceFacadeFactory {
	static create(): InvoiceFacade {
		const repository = new InvoiceRepository();
		const generateUseCase = new GenerateInvoiceUseCase(repository);
		const findUseCase = new FindInvoiceUseCase(repository);

		const facade = new InvoiceFacade({
			generateUseCase: generateUseCase,
			findUseCase: findUseCase,
		});

		return facade;
	}
}