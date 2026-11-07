CREATE TYPE "OrderStatus_new" AS ENUM ('NEW', 'CLOSED_SUCCESS', 'FAKE', 'BRAK');

ALTER TABLE "CustomerOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CustomerOrder" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE "status"::text
    WHEN 'DELIVERED' THEN 'CLOSED_SUCCESS'
    WHEN 'COMPLETED' THEN 'CLOSED_SUCCESS'
    WHEN 'CANCELLED' THEN 'BRAK'
    ELSE 'NEW'
  END::"OrderStatus_new"
);
ALTER TABLE "OrderStatusEvent" ALTER COLUMN "fromStatus" TYPE "OrderStatus_new" USING (
  CASE "fromStatus"::text
    WHEN 'DELIVERED' THEN 'CLOSED_SUCCESS'
    WHEN 'COMPLETED' THEN 'CLOSED_SUCCESS'
    WHEN 'CANCELLED' THEN 'BRAK'
    WHEN 'NEW' THEN 'NEW'
    WHEN 'CONFIRMED' THEN 'NEW'
    WHEN 'IN_PRODUCTION' THEN 'NEW'
    WHEN 'READY' THEN 'NEW'
    ELSE NULL
  END::"OrderStatus_new"
);
ALTER TABLE "OrderStatusEvent" ALTER COLUMN "toStatus" TYPE "OrderStatus_new" USING (
  CASE "toStatus"::text
    WHEN 'DELIVERED' THEN 'CLOSED_SUCCESS'
    WHEN 'COMPLETED' THEN 'CLOSED_SUCCESS'
    WHEN 'CANCELLED' THEN 'BRAK'
    ELSE 'NEW'
  END::"OrderStatus_new"
);
ALTER TABLE "CustomerOrder" ALTER COLUMN "status" SET DEFAULT 'NEW';

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

CREATE TYPE "MirrorStatus" AS ENUM (
  'WAITING',
  'TO_START',
  'ORDERED',
  'SENT_TO_SANDBLAST',
  'ASSEMBLED',
  'CLOSED_SUCCESS',
  'REFUSED',
  'BRAK'
);

ALTER TABLE "CustomerOrder" ADD COLUMN "mirrorStatus" "MirrorStatus" NOT NULL DEFAULT 'WAITING';
ALTER TABLE "CustomerOrderLine" ADD COLUMN "mirrorStatus" "MirrorStatus" NOT NULL DEFAULT 'WAITING';
