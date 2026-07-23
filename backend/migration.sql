-- Migration: MO & Weight Tracking Tables — UUID chained FK
-- Chain: tbl_m_manufacturing_orders.id → tbl_mo_rm_details.mo_id → tbl_weight_records.rm_detail_id
-- Semua ID pakai UUID (CHAR(36)) untuk konsistensi referensial

CREATE TABLE IF NOT EXISTS tbl_m_manufacturing_orders (
  id              CHAR(36)        PRIMARY KEY,
  t_mo_id         VARCHAR(50)     DEFAULT NULL,
  work_center     VARCHAR(50)     DEFAULT NULL,
  nomor_mo        VARCHAR(60)     UNIQUE NOT NULL,
  nama_produk     VARCHAR(200)    DEFAULT NULL,
  schedule_mo     DATETIME        DEFAULT NULL,
  qty_plan        INT             NOT NULL DEFAULT 0,
  lot             INT             DEFAULT 0,
  total_rm        INT             NOT NULL DEFAULT 0,
  status          VARCHAR(20)     DEFAULT 'active',
  created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nomor_mo (nomor_mo),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_mo_rm_details (
  id             CHAR(36)        PRIMARY KEY,
  mo_id          CHAR(36)        NOT NULL,
  item           VARCHAR(100)    NOT NULL,
  qty            DECIMAL(10,2)   NOT NULL,
  target_weight  DECIMAL(10,4)   NOT NULL,
  created_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rm_detail_mo FOREIGN KEY (mo_id)
    REFERENCES tbl_m_manufacturing_orders(id) ON DELETE CASCADE,
  INDEX idx_mo_id (mo_id),
  INDEX idx_item (item)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tbl_weight_records (
  id             CHAR(36)        PRIMARY KEY,
  rm_detail_id   CHAR(36)        NOT NULL,
  actual_weight  DECIMAL(10,2)   NOT NULL,
  lot_number     INT             NOT NULL DEFAULT 1,
  no_lot         VARCHAR(50)     DEFAULT NULL,
  timestamp      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_weight_rm_detail FOREIGN KEY (rm_detail_id)
    REFERENCES tbl_mo_rm_details(id) ON DELETE CASCADE,
  INDEX idx_rm_detail_id (rm_detail_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_lot_number (lot_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Migration: add lot_number + no_lot to existing tbl_weight_records
-- Run this ONCE if table already exists
ALTER TABLE tbl_weight_records
  ADD COLUMN lot_number INT NOT NULL DEFAULT 1 AFTER actual_weight,
  ADD COLUMN no_lot VARCHAR(50) DEFAULT NULL AFTER lot_number,
  ADD INDEX idx_lot_number (lot_number);

-- Migration: add kategori column to tbl_mo_rm_details
ALTER TABLE tbl_mo_rm_details
  ADD COLUMN kategori VARCHAR(50) DEFAULT NULL AFTER target_weight,
  ADD INDEX idx_kategori (kategori);

-- Migration: add informasi column to tbl_mo_rm_details
ALTER TABLE tbl_mo_rm_details
  ADD COLUMN informasi TEXT DEFAULT NULL AFTER kategori;

