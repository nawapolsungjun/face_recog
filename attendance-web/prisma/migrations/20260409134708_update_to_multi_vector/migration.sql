/*
  Warnings:

  - You are about to drop the column `date` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `faceVector` on the `Student` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attendance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Attendance" ("courseId", "id", "status", "studentId") SELECT "courseId", "id", "status", "studentId" FROM "Attendance";
DROP TABLE "Attendance";
ALTER TABLE "new_Attendance" RENAME TO "Attendance";
CREATE TABLE "new_Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "faceVectors" TEXT,
    "courseId" INTEGER NOT NULL,
    CONSTRAINT "Student_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("courseId", "id", "name", "studentCode") SELECT "courseId", "id", "name", "studentCode" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_studentCode_key" ON "Student"("studentCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
