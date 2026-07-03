-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "shopName" TEXT NOT NULL DEFAULT 'ร้านของฉัน',
    "promptPayId" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL DEFAULT '',
    "tableCount" INTEGER NOT NULL DEFAULT 0,
    "acceptingOrders" BOOLEAN NOT NULL DEFAULT true,
    "useTrueMoneyBox" BOOLEAN NOT NULL DEFAULT false,
    "trueMoneyApiKey" TEXT NOT NULL DEFAULT '',
    "trueMoneyMerchantCode" TEXT NOT NULL DEFAULT '',
    "trueMoneySecret" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_Settings" ("acceptingOrders", "accountName", "id", "promptPayId", "shopName", "tableCount") SELECT "acceptingOrders", "accountName", "id", "promptPayId", "shopName", "tableCount" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
