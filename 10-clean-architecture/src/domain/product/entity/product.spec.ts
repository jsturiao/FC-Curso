import Product from "./product";

describe("Product unit tests", () => {
  it("should throw error when id is empty", () => {
    expect(() => {
      new Product("", "Product 1", 100);
    }).toThrowError("product: Id is required");
  });

  it("should throw error when name is empty", () => {
    expect(() => {
      new Product("123", "", 100);
    }).toThrowError("product: Name is required");
  });

  it("should throw error when price is negative", () => {
    expect(() => {
      new Product("123", "Product 1", -1);
    }).toThrowError("product: Price must be greater than zero");
  });

  it("should throw error when id and name are empty", () => {
    expect(() => {
      new Product("", "", 100);
    }).toThrowError("product: Id is required,product: Name is required");
  });

  it("should throw error when id is empty and price is negative", () => {
    expect(() => {
      new Product("", "Product 1", -1);
    }).toThrowError("product: Id is required,product: Price must be greater than zero");
  });

  it("should throw error when name is empty and price is negative", () => {
    expect(() => {
      new Product("123", "", -1);
    }).toThrowError("product: Name is required,product: Price must be greater than zero");
  });

  it("should throw error when all properties are invalid", () => {
    expect(() => {
      new Product("", "", -1);
    }).toThrowError("product: Id is required,product: Name is required,product: Price must be greater than zero");
  });

  it("should change name", () => {
    const product = new Product("123", "Product 1", 100);
    product.changeName("Product 2");
    expect(product.name).toBe("Product 2");
  });

  it("should change price", () => {
    const product = new Product("123", "Product 1", 100);
    product.changePrice(200);
    expect(product.price).toBe(200);
  });

  it("should throw error when changing name to empty", () => {
    expect(() => {
      const product = new Product("123", "Product 1", 100);
      product.changeName("");
    }).toThrowError("product: Name is required");
  });

  it("should throw error when changing price to negative", () => {
    expect(() => {
      const product = new Product("123", "Product 1", 100);
      product.changePrice(-1);
    }).toThrowError("product: Price must be greater than zero");
  });

  it("should create a valid product", () => {
    const product = new Product("123", "Product 1", 100);
    expect(product.id).toBe("123");
    expect(product.name).toBe("Product 1");
    expect(product.price).toBe(100);
  });
});
