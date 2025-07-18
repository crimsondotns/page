import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { address, chainId } = req.body;

  if (!address || !chainId) {
    return res.status(400).json({ error: 'Missing address or chainId' });
  }

  const query = `
    query {
      score(address: "${address}" network: ${chainId}) {
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
      headers: { 'Content-Type': 'application/json' },
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
