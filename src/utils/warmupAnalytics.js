// src/utils/warmupAnalytics.js
const { Pool } = require('pg');

class WarmupAnalytics {
  constructor(databaseUri) {
    this.pool = new Pool({
      connectionString: databaseUri,
    });
  }

  async getWarmupStats(instanceId) {
    const query = `
      SELECT
        participant,
        COUNT(*) AS totalMessages,
        SUM(CASE WHEN messageType = 'conversation' THEN 1 ELSE 0 END) AS conversationCount,
        SUM(CASE WHEN messageType = 'imageMessage' THEN 1 ELSE 0 END) AS imageMessageCount,
        SUM(CASE WHEN messageType = 'audioMessage' THEN 1 ELSE 0 END) AS audioMessageCount,
        SUM(CASE WHEN messageType = 'stickerMessage' THEN 1 ELSE 0 END) AS stickerMessageCount,
        SUM(CASE WHEN messageType = 'videoMessage' THEN 1 ELSE 0 END) AS videoMessageCount,
        EXTRACT(EPOCH FROM (MAX(messageTimestamp) - MIN(messageTimestamp))) AS warmupDuration,
        MIN(messageTimestamp) AS firstMessageTimestamp,
        MAX(messageTimestamp) AS lastMessageTimestamp
      FROM
        Message
      WHERE
        instanceId = $1
      GROUP BY
        participant
    `;

    try {
      const { rows } = await this.pool.query(query, [instanceId]);
      return rows.map((row) => ({
        participant: row.participant,
        totalMessages: parseInt(row.totalmessages, 10),
        messageTypes: {
          conversation: parseInt(row.conversationcount, 10),
          imageMessage: parseInt(row.imagemessagecount, 10),
          audioMessage: parseInt(row.audiomessagecount, 10),
          stickerMessage: parseInt(row.stickermessagecount, 10),
          videoMessage: parseInt(row.videomessagecount, 10),
        },
        warmupDuration: parseFloat(row.warmupduration),
        firstMessageTimestamp: row.firstmessagetimestamp,
        lastMessageTimestamp: row.lastmessagetimestamp,
      }));
    } catch (error) {
      console.error("Erro ao buscar estatísticas de aquecimento:", error);
      return [];
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = WarmupAnalytics;
