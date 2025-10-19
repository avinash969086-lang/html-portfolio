-- Schema for simple mobile shopping app
-- Assumes the database (shopdb) already exists and is selected

IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Products (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    price DECIMAL(10,2) NOT NULL,
    image_url NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_Products_created_at DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Orders (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    customer_name NVARCHAR(200) NOT NULL,
    email NVARCHAR(300) NULL,
    address NVARCHAR(500) NULL,
    total_amount DECIMAL(10,2) NOT NULL CONSTRAINT DF_Orders_total_amount DEFAULT 0,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_Orders_created_at DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID(N'dbo.OrderItems', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.OrderItems (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CONSTRAINT CK_OrderItems_quantity CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    CONSTRAINT FK_OrderItems_Orders FOREIGN KEY (order_id) REFERENCES dbo.Orders(id) ON DELETE CASCADE,
    CONSTRAINT FK_OrderItems_Products FOREIGN KEY (product_id) REFERENCES dbo.Products(id)
  );
  CREATE INDEX IX_OrderItems_OrderId ON dbo.OrderItems(order_id);
END;
