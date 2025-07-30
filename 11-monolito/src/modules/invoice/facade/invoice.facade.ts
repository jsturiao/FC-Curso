import UseCaseInterface from "../../@shared/usecase/use-case.interface";
import InvoiceFacadeInterface, {
  FindInvoiceFacadeInputDto,
  FindInvoiceFacadeOutputDto,
  GenerateInvoiceFacadeInputDto,
  GenerateInvoiceFacadeOutputDto,
} from "./invoice.facade.interface";

export interface UseCaseProps {
  generateUseCase: UseCaseInterface;
  findUseCase: UseCaseInterface;
}

export default class InvoiceFacade implements InvoiceFacadeInterface {
  private _generateUseCase: UseCaseInterface;
  private _findUseCase: UseCaseInterface;

  constructor(useCaseProps: UseCaseProps) {
    this._generateUseCase = useCaseProps.generateUseCase;
    this._findUseCase = useCaseProps.findUseCase;
  }

  async generate(input: GenerateInvoiceFacadeInputDto): Promise<GenerateInvoiceFacadeOutputDto> {
    return await this._generateUseCase.execute(input);
  }

  async find(input: FindInvoiceFacadeInputDto): Promise<FindInvoiceFacadeOutputDto> {
    return await this._findUseCase.execute(input);
  }
}