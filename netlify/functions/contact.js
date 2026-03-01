// Netlify serverless function — receives contact form data and writes to Airtable
// Environment variables required (set in Netlify dashboard → Site settings → Environment variables):
//   AIRTABLE_TOKEN   — your Airtable Personal Access Token
//   AIRTABLE_BASE_ID — the Base ID from your Airtable base URL (e.g. appXXXXXXXXXXXXXX)
//   AIRTABLE_TABLE   — the table name inside the base (e.g. "Leads" or "Contacts")

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  // Basic validation
  if (!data.name || !data.email || !data.message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Name, email, and message are required.' }),
    };
  }

  const token   = process.env.AIRTABLE_TOKEN;
  const baseId  = process.env.AIRTABLE_BASE_ID;
  const table   = process.env.AIRTABLE_TABLE || 'Leads';

  if (!token || !baseId) {
    console.error('Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID env vars');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  // Post to Airtable
  // Column names here must match your Airtable table exactly (case-sensitive)
  const airtableRes = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'Full Name':    data.name,
          'Company':      data.company    || '',
          'Email':        data.email,
          'Phone':        data.phone      || '',
          'Service':      data.service    || '',
          'Message':      data.message,
          'Submitted At': new Date().toISOString(),
        },
      }),
    }
  );

  if (!airtableRes.ok) {
    const err = await airtableRes.text();
    console.error('Airtable error:', err);
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to save submission' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
