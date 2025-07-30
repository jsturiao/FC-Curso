import { Sequelize } from 'sequelize-typescript';
import APIFactory from '../../factories/api.factory';

// Models de todos os módulos
import { ProductModel as ProductAdmModel } from '../../modules/product-adm/repository/product.model';
import ProductModel from '../../modules/store-catalog/repository/product.model';
import { ClientModel } from '../../modules/client-adm/repository/client.model';
import TransactionModel from '../../modules/payment/repository/transaction.model';
import InvoiceModel from '../../modules/invoice/repository/invoice.model';
import InvoiceItemsModel from '../../modules/invoice/repository/invoice-items.model';

let sequelize: Sequelize;

export const setupDatabase = async (): Promise<Sequelize> => {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    sync: { force: true },
  });

  // Adicionar todos os models
  await sequelize.addModels([
    ProductAdmModel,
    ProductModel,
    ClientModel,
    TransactionModel,
    InvoiceModel,
    InvoiceItemsModel
  ]);

  // Sincronizar database
  await sequelize.sync({ force: true });
  
  return sequelize;
};

export const clearDatabase = async (): Promise<void> => {
  if (sequelize) {
    await sequelize.sync({ force: true });
    APIFactory.clearCache();
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (sequelize) {
    await sequelize.close();
  }
};

// Helper para criar dados de teste
export const createTestProduct = async (data: any = {}) => {
  const defaultData = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    purchasePrice: 100,
    stock: 10,
    ...data
  };
  
  return await ProductAdmModel.create(defaultData);
};

export const createTestCatalogProduct = async (data: any = {}) => {
  const defaultData = {
    id: '1',
    name: 'Test Product',
    description: 'Test Description',
    salesPrice: 150,
    ...data
  };
  
  return await ProductModel.create(defaultData);
};

export const createTestClient = async (data: any = {}) => {
  const defaultData = {
    id: '1',
    name: 'Test Client',
    email: 'test@example.com',
    document: '123456789',
    street: 'Test Street',
    number: '123',
    complement: 'Test Complement',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345-678',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data
  };
  
  return await ClientModel.create(defaultData);
};
