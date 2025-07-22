import type { NextApiRequest, NextApiResponse } from 'next'

function randomUserAgent() {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Mozilla/5.0 (X11; Linux x86_64)',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    'Mozilla/5.0 (Linux; Android 11)',
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}

async function fetchWithRetry(query: string, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch('https://api-scanner.defiyield.app/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': randomUserAgent(),
        'Origin': 'https://de.fi',
        'Referer': 'https://de.fi',
        'Accept': '*/*',
      },
      body: JSON.stringify({ query }),
    });

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      const score = json?.data?.score;

      if (score || attempt === retries) {
        return json;
      }

      // Wait before next retry
      const delay = 500 + Math.random() * 800; // 500–1300ms
      console.warn(`⚠️ Retry ${attempt + 1}: score=null. Waiting ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (err) {
      if (attempt === retries) throw err;
    }
  }

  throw new Error('Retries exhausted');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let address = '';
  let chainId = '';

  if (req.method === 'POST') {
    address = req.body.address;
    chainId = req.body.chainId || req.body.chainid;
  } else if (req.method === 'GET') {
    address = req.query.address as string;
    chainId = (req.query.chainId || req.query.chainid) as string;
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!address || !chainId) {
    return res.status(400).json({ error: 'Missing address or chainId' });
  }

  const query = `
    query {
      score(address: "${address}", network: ${chainId}) {
        score
        whitelisted
        exploited
        dimensionsAmount
        finalResult
        classicScore
        aiScore {
          dex
          organic
          totalScore
          reputation
          sybil
          utility
        }
        dimensions {
          score
          name
        }
      }
    }
  `;

  try {
    const json = await fetchWithRetry(query, 2);
    return res.status(200).json(json);
  } catch (err) {
    console.error('🚨 Proxy error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
