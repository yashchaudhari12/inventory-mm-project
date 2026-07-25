# Inventory MM — Manufacturing Stock & Purchase Order System

A full-stack inventory management system for manufacturing, modeled on SAP's
**MM (Materials Management)** module. Tracks raw materials, components, and
finished goods, with vendor management, purchase order lifecycle, low-stock
alerts, and a stock movement audit trail (mirrors SAP's "material document" concept).

**Stack:** React (Vite) + Node/Express + MySQL

## Setup

### 1. Database
```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in your MySQL password
npm run dev
```
Runs on `http://localhost:5000`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:3000`

## Features
- **Dashboard** — total inventory value, low-stock count, open PO count, PO status breakdown chart
- **Products** — add/list raw materials, components, finished goods with reorder levels
- **Vendors** — supplier list with lead time and rating
- **Purchase Orders** — create POs, move through Pending → Ordered → Shipped → Received; receiving a PO automatically updates stock and logs a movement record
- **Low Stock Alerts** — SQL view joining products + stock + vendors

## Interview talking points
- "I modeled this after SAP MM — products/materials, vendors, purchase orders, and a stock movement audit trail like SAP's material documents."
- "Receiving a PO triggers an automatic stock update and movement log — that's a small state machine, not just a form."
- "The low-stock alert is a SQL view doing a 3-table join, not something computed in JS — shows I can push logic to the database layer."
- Talk through the PO status lifecycle (Pending → Ordered → Shipped → Received/Cancelled) as a simple workflow engine.
