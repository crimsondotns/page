import type { NextApiRequest, NextApiResponse } from 'next';

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
    const graphqlResponse = await fetch('https://api-scanner.defiyield.app/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Origin': 'https://de.fi',
        'Referer': 'https://de.fi',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
      },
      body: JSON.stringify({ query }),
    });

    const resultText = await graphqlResponse.text();

    try {
      const json = JSON.parse(resultText);
      return res.status(200).json(json);
    } catch (jsonErr) {
      console.error('❌ JSON parse error:', jsonErr);
      console.error('❗ Raw response:', resultText);
      return res.status(502).json({
        error: 'Invalid JSON response from target',
        raw: resultText,
      });
    }
  } catch (err) {
    console.error('🚨 Proxy error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
