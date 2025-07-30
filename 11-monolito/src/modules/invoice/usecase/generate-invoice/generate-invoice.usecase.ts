import Address from "../../../@shared/domain/value-object/address";
import Id from "../../../@shared/domain/value-object/id.value-object";
import Invoice from "../../domain/invoice.entity";
import InvoiceItems from "../../domain/invoice-items.entity";
import InvoiceGateway from "../../gateway/invoice.gateway";
import { GenerateInvoiceUseCaseInputDto, GenerateInvoiceUseCaseOutputDto } from "./generate-invoice.dto";

export default class GenerateInvoiceUseCase {
	constructor(private invoiceRepository: InvoiceGateway) { }

	async execute(input: GenerateInvoiceUseCaseInputDto): Promise<GenerateInvoiceUseCaseOutputDto> {
		const items = input.items.map(
			(item) =>
				new InvoiceItems({
					id: new Id(item.id),
					name: item.name,
					price: item.price,
				})
		);

		const invoice = new Invoice({
			name: input.name,
			document: input.document,
			address: new Address(
				input.street,
				input.number,
				input.complement,
				input.city,
				input.state,
				input.zipCode
			),
			items: items,
		});

		const result = await this.invoiceRepository.generate(invoice);

		return {
			id: result.id.id,
			name: result.name,
			document: result.document,
			street: result.address.street,
			number: result.address.number,
			complement: result.address.complement,
			city: result.address.city,
			state: result.address.state,
			zipCode: result.address.zipCode,
			items: result.items.map((item) => ({
				id: item.id.id,
				name: item.name,
				price: item.price,
			})),
			total: result.total(),
		};
	}
}