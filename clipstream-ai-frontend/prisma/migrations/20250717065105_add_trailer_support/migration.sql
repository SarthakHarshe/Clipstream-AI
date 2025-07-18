-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "s3Key" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'clip',
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "uploadedFileId" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Clip_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Clip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Clip" ("createdAt", "id", "s3Key", "updatedAt", "uploadedFileId", "userId") SELECT "createdAt", "id", "s3Key", "updatedAt", "uploadedFileId", "userId" FROM "Clip";
DROP TABLE "Clip";
ALTER TABLE "new_Clip" RENAME TO "Clip";
CREATE INDEX "Clip_s3Key_idx" ON "Clip"("s3Key");
CREATE TABLE "new_UploadedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "s3Key" TEXT NOT NULL,
    "displayName" TEXT,
    "uploaded" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'uploaded',
    "youtubeUrl" TEXT,
    "cookiesPath" TEXT,
    "generateTrailer" BOOLEAN NOT NULL DEFAULT false,
    "creditsUsed" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT NOT NULL,
    CONSTRAINT "UploadedFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UploadedFile" ("cookiesPath", "createdAt", "displayName", "id", "s3Key", "source", "status", "updatedAt", "uploaded", "userId", "youtubeUrl") SELECT "cookiesPath", "createdAt", "displayName", "id", "s3Key", "source", "status", "updatedAt", "uploaded", "userId", "youtubeUrl" FROM "UploadedFile";
DROP TABLE "UploadedFile";
ALTER TABLE "new_UploadedFile" RENAME TO "UploadedFile";
CREATE INDEX "UploadedFile_s3Key_idx" ON "UploadedFile"("s3Key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
