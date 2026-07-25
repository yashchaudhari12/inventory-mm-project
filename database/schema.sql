-- ============================================================
-- Manufacturing Inventory & Purchase Order Management System
-- Maps to SAP MM (Materials Management) module
-- ============================================================

CREATE DATABASE IF NOT EXISTS inventory_mm;
USE inventory_mm;

-- ------------------------------------------------------------
-- VENDORS (Suppliers of raw materials / parts)
-- ------------------------------------------------------------
CREATE TABLE vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(150),
    contact_phone VARCHAR(30),
    lead_time_days INT NOT NULL DEFAULT 7,
    rating DECIMAL(2,1) DEFAULT 4.0,     -- 1.0 - 5.0 vendor performance rating
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- PRODUCTS (Raw materials, components, finished goods)
-- ------------------------------------------------------------
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category ENUM('Raw Material', 'Component', 'Finished Good') NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',   -- pcs, kg, meters, liters etc.
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    reorder_level INT NOT NULL DEFAULT 20,     -- trigger point for low-stock alert
    default_vendor_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (default_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- STOCK (Current on-hand quantity per warehouse location)
-- ------------------------------------------------------------
CREATE TABLE stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    warehouse_location VARCHAR(50) NOT NULL DEFAULT 'Main Warehouse',
    quantity_on_hand INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_product_location (product_id, warehouse_location)
);

-- ------------------------------------------------------------
-- PURCHASE ORDERS (Orders placed with vendors to replenish stock)
-- ------------------------------------------------------------
CREATE TABLE purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(20) NOT NULL UNIQUE,
    vendor_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    status ENUM('Pending', 'Ordered', 'Shipped', 'Received', 'Cancelled') NOT NULL DEFAULT 'Pending',
    order_date DATE NOT NULL,
    expected_date DATE,
    received_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- STOCK MOVEMENTS (Audit trail — every in/out adjustment)
-- Mirrors SAP's material document concept
-- ------------------------------------------------------------
CREATE TABLE stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
    quantity INT NOT NULL,
    reference_type ENUM('PURCHASE_ORDER', 'PRODUCTION_CONSUMPTION', 'MANUAL_ADJUSTMENT') NOT NULL,
    reference_id INT,           -- e.g. purchase_orders.id when reference_type = PURCHASE_ORDER
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- SEED DATA — realistic manufacturing scenario
-- ============================================================

INSERT INTO vendors (name, contact_email, contact_phone, lead_time_days, rating) VALUES
('SteelCore Metals Pvt Ltd', 'sales@steelcore.com', '+91-9820011234', 10, 4.5),
('Precision Bearings Co.', 'orders@precisionbearings.com', '+91-9845098450', 5, 4.8),
('IndoFasteners Ltd', 'info@indofasteners.in', '+91-9922334455', 3, 4.2),
('PolyPack Industries', 'contact@polypack.com', '+91-9911223344', 7, 3.9),
('ElectroDrive Motors', 'support@electrodrive.com', '+91-9876543210', 14, 4.6);

INSERT INTO products (sku, name, category, unit, unit_price, reorder_level, default_vendor_id) VALUES
('RM-STL-001', 'Cold Rolled Steel Sheet 2mm', 'Raw Material', 'kg', 68.50, 500, 1),
('RM-STL-002', 'Stainless Steel Rod 12mm', 'Raw Material', 'meters', 145.00, 200, 1),
('CMP-BRG-010', 'Deep Groove Ball Bearing 6205', 'Component', 'pcs', 92.00, 100, 2),
('CMP-BRG-011', 'Tapered Roller Bearing 30205', 'Component', 'pcs', 210.00, 60, 2),
('CMP-FST-020', 'Hex Bolt M8x40 Grade 8.8', 'Component', 'pcs', 3.20, 1000, 3),
('CMP-FST-021', 'Lock Washer M8', 'Component', 'pcs', 0.80, 2000, 3),
('RM-PLY-030', 'HDPE Packaging Sheet', 'Raw Material', 'meters', 22.00, 300, 4),
('CMP-MOT-040', 'BLDC Motor 750W 48V', 'Component', 'pcs', 3450.00, 25, 5),
('FG-CONV-100', 'Conveyor Roller Assembly', 'Finished Good', 'pcs', 5600.00, 15, NULL),
('FG-GEAR-101', 'Gearbox Unit GX-200', 'Finished Good', 'pcs', 12800.00, 10, NULL);

INSERT INTO stock (product_id, warehouse_location, quantity_on_hand) VALUES
(1, 'Main Warehouse', 420),   -- below reorder level (500) -> LOW STOCK
(2, 'Main Warehouse', 350),
(3, 'Main Warehouse', 85),    -- below reorder level (100) -> LOW STOCK
(4, 'Main Warehouse', 120),
(5, 'Main Warehouse', 4200),
(6, 'Main Warehouse', 1500),  -- below reorder level (2000) -> LOW STOCK
(7, 'Main Warehouse', 310),
(8, 'Main Warehouse', 18),    -- below reorder level (25) -> LOW STOCK
(9, 'Assembly Floor', 22),
(10, 'Assembly Floor', 12);

INSERT INTO purchase_orders (po_number, vendor_id, product_id, quantity, unit_price, status, order_date, expected_date, received_date) VALUES
('PO-2026-0001', 1, 1, 1000, 67.00, 'Received', '2026-06-01', '2026-06-11', '2026-06-10'),
('PO-2026-0002', 2, 3, 200, 90.00, 'Ordered', '2026-07-15', '2026-07-20', NULL),
('PO-2026-0003', 3, 6, 3000, 0.78, 'Shipped', '2026-07-10', '2026-07-13', NULL),
('PO-2026-0004', 5, 8, 30, 3400.00, 'Pending', '2026-07-22', '2026-08-05', NULL),
('PO-2026-0005', 1, 2, 400, 144.00, 'Received', '2026-05-20', '2026-05-30', '2026-05-29'),
('PO-2026-0006', 4, 7, 500, 21.50, 'Pending', '2026-07-23', '2026-07-30', NULL);

INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes) VALUES
(1, 'IN', 1000, 'PURCHASE_ORDER', 1, 'Received against PO-2026-0001'),
(1, 'OUT', 580, 'PRODUCTION_CONSUMPTION', NULL, 'Consumed in production run #4521'),
(2, 'IN', 400, 'PURCHASE_ORDER', 5, 'Received against PO-2026-0005'),
(2, 'OUT', 50, 'PRODUCTION_CONSUMPTION', NULL, 'Consumed in production run #4522'),
(3, 'OUT', 15, 'PRODUCTION_CONSUMPTION', NULL, 'Consumed in gearbox assembly'),
(8, 'OUT', 7, 'PRODUCTION_CONSUMPTION', NULL, 'Consumed in conveyor assembly');

-- ------------------------------------------------------------
-- USEFUL VIEW: Low stock alert (mirrors an MRP-style query)
-- ------------------------------------------------------------
CREATE VIEW low_stock_alert AS
SELECT
    p.id AS product_id,
    p.sku,
    p.name,
    p.category,
    s.quantity_on_hand,
    p.reorder_level,
    (p.reorder_level - s.quantity_on_hand) AS shortfall,
    v.name AS default_vendor,
    v.lead_time_days
FROM products p
JOIN stock s ON s.product_id = p.id
LEFT JOIN vendors v ON v.id = p.default_vendor_id
WHERE s.quantity_on_hand < p.reorder_level;
