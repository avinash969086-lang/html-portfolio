-- Seed products if empty
IF NOT EXISTS (SELECT 1 FROM dbo.Products)
BEGIN
  INSERT INTO dbo.Products (name, description, price, image_url)
  VALUES
    (N'Wireless Earbuds', N'Compact earbuds with noise isolation and long battery life.', 39.99, N'https://picsum.photos/seed/earbuds/600/400'),
    (N'Smartphone Case', N'Shock-absorbing case with raised edges for screen protection.', 14.99, N'https://picsum.photos/seed/case/600/400'),
    (N'USB-C Fast Charger', N'20W USB-C power adapter for rapid charging.', 19.99, N'https://picsum.photos/seed/charger/600/400'),
    (N'Bluetooth Speaker', N'Portable speaker with deep bass and 10h playtime.', 49.99, N'https://picsum.photos/seed/speaker/600/400'),
    (N'Screen Protector (2-Pack)', N'Tempered glass with easy alignment tray.', 12.99, N'https://picsum.photos/seed/protector/600/400'),
    (N'MagSafe Power Bank', N'Magnetic wireless power bank, 5000mAh.', 34.99, N'https://picsum.photos/seed/powerbank/600/400'),
    (N'Car Phone Mount', N'Stable air-vent mount with one-hand operation.', 16.99, N'https://picsum.photos/seed/mount/600/400'),
    (N'Silicone Watch Band', N'Sweat-resistant band compatible with popular smartwatches.', 9.99, N'https://picsum.photos/seed/band/600/400');
END;
