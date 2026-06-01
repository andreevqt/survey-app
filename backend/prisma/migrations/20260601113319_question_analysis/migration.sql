-- CreateTable
CREATE TABLE "QuestionAnalysis" (
    "questionId" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "answerCount" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionAnalysis_pkey" PRIMARY KEY ("questionId")
);

-- AddForeignKey
ALTER TABLE "QuestionAnalysis" ADD CONSTRAINT "QuestionAnalysis_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
