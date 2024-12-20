-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "maxInstances" INTEGER NOT NULL DEFAULT 2,
    "trialEndDate" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instance" (
    "id" SERIAL NOT NULL,
    "instanceName" TEXT NOT NULL,
    "connectionStatus" TEXT NOT NULL DEFAULT 'pending',
    "ownerJid" TEXT,
    "profilePicUrl" TEXT,
    "integration" TEXT NOT NULL DEFAULT 'WHATSAPP-BAILEYS',
    "token" TEXT,
    "number" TEXT,
    "clientName" TEXT,
    "profileName" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disconnectedAt" TIMESTAMP(3),
    "disconnectionObject" JSONB,
    "disconnectionReasonCode" TEXT,

    CONSTRAINT "Instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarmupStats" (
    "id" SERIAL NOT NULL,
    "instanceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paused',
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "messagesReceived" INTEGER NOT NULL DEFAULT 0,
    "mediaStats" JSONB NOT NULL DEFAULT '{"text": 0, "image": 0, "audio": 0, "sticker": 0, "reaction": 0}',
    "mediaReceived" JSONB NOT NULL DEFAULT '{"text": 0, "image": 0, "audio": 0, "sticker": 0, "reaction": 0}',
    "warmupTime" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP(3),
    "pauseTime" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarmupStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Instance_instanceName_key" ON "Instance"("instanceName");

-- CreateIndex
CREATE UNIQUE INDEX "WarmupStats_instanceId_key" ON "WarmupStats"("instanceId");

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarmupStats" ADD CONSTRAINT "WarmupStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarmupStats" ADD CONSTRAINT "WarmupStats_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("instanceName") ON DELETE RESTRICT ON UPDATE CASCADE;
