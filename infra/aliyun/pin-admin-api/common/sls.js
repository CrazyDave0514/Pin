/**
 * @fileoverview 阿里云 SLS 日志服务工具
 * @description 通过 SLS REST API 查询 FC 函数访问日志，统计 PV
 */

'use strict';

const https = require('https');
const crypto = require('crypto');

// SLS 配置
const SLS_PROJECT = process.env.SLS_PROJECT || '';
const SLS_LOGSTORE = process.env.SLS_LOGSTORE || '';
const ALIYUN_REGION = process.env.ALIYUN_REGION || 'cn-hangzhou';
const ACCESS_KEY_ID = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || '';
const ACCESS_KEY_SECRET = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || '';

/**
 * SLS HMAC-SHA1 签名
 * @param {string} method - HTTP 方法
 * @param {string} uri - 请求 URI
 * @param {string} date - 日期头
 * @param {string} host - 主机头
 * @param {Object} queries - 查询参数
 * @returns {string} 签名
 */
const signSLS = (method, uri, date, host, queries) => {
  const qs = Object.keys(queries)
    .sort()
    .map(k => `${k}=${queries[k]}`)
    .join('&');
  const stringToSign = `${method}\n\n\n${date}\n${uri}?${qs}`;
  const signature = crypto
    .createHmac('sha1', ACCESS_KEY_SECRET)
    .update(stringToSign)
    .digest('base64');
  return signature;
};

/**
 * 查询指定时间范围的 PV
 * @param {number} from - 开始时间戳（秒）
 * @param {number} to - 结束时间戳（秒）
 * @returns {Promise<number>} 访问量
 */
const queryPV = async (from, to) => {
  if (!SLS_PROJECT || !SLS_LOGSTORE || !ACCESS_KEY_ID) {
    console.warn('SLS 配置缺失，返回 0');
    return 0;
  }

  try {
    const host = `${SLS_PROJECT}.${ALIYUN_REGION}.log.aliyuncs.com`;
    const date = new Date().toUTCString();
    const uri = `/logstores/${SLS_LOGSTORE}`;
    const queries = {
      type: 'log',
      from: String(from),
      to: String(to),
      query: encodeURIComponent('* | select count(*) as pv'),
    };

    const signature = signSLS('GET', uri, date, host, queries);
    const qs = Object.keys(queries)
      .sort()
      .map(k => `${k}=${queries[k]}`)
      .join('&');

    const url = `https://${host}${uri}?${qs}`;

    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'Authorization': `LOG ${ACCESS_KEY_ID}:${signature}`,
          'Date': date,
          'Host': host,
          'x-log-bodyrawsize': '0',
          'Content-Type': 'application/x-protobuf',
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            // SLS 返回格式可能是 JSON
            const result = JSON.parse(data);
            if (result && Array.isArray(result) && result.length > 0) {
              resolve(Number(result[0].pv) || 0);
            } else {
              resolve(0);
            }
          } catch {
            resolve(0);
          }
        });
      });

      req.on('error', (err) => {
        console.error('SLS 请求失败:', err.message);
        resolve(0);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve(0);
      });
    });
  } catch (error) {
    console.error('SLS 查询失败:', error.message);
    return 0;
  }
};

/**
 * 获取今日访问量
 * @returns {Promise<number>} 今日 PV
 */
const getTodayVisits = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = Math.floor(today.getTime() / 1000);
  const to = Math.floor(Date.now() / 1000);
  return await queryPV(from, to);
};

/**
 * 获取昨日访问量
 * @returns {Promise<number>} 昨日 PV
 */
const getYesterdayVisits = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const from = Math.floor(yesterday.getTime() / 1000);
  const to = Math.floor(today.getTime() / 1000);
  return await queryPV(from, to);
};

/**
 * 获取访问趋势（今日 vs 昨日）
 * @returns {Promise<{today: number, yesterday: number, trend: number}>}
 */
const getVisitStats = async () => {
  const [today, yesterday] = await Promise.all([
    getTodayVisits(),
    getYesterdayVisits(),
  ]);

  let trend = 0;
  if (yesterday > 0) {
    trend = Math.round(((today - yesterday) / yesterday) * 100);
  }

  return { today, yesterday, trend };
};

module.exports = {
  queryPV,
  getTodayVisits,
  getYesterdayVisits,
  getVisitStats,
};
