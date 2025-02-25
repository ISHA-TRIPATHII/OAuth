import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import querystring from 'querystring';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_REDIRECT_URI = process.env.AZURE_REDIRECT_URI;
const AZURE_AUTH_URL = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize`;
const AZURE_TOKEN_URL = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;

const generateCodeVerifier = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateCodeChallenge = (codeVerifier) => {
  return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
};

app.get('/login', (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  req.session.codeVerifier = codeVerifier;

  const params = querystring.stringify({
    client_id: AZURE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: AZURE_REDIRECT_URI,
    response_mode: 'query',
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.redirect(`${AZURE_AUTH_URL}?${params}`);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code || !req.session.codeVerifier) {
    return res.status(400).send('Invalid request');
  }

  try {
    const response = await axios.post(
      AZURE_TOKEN_URL,
      querystring.stringify({
        client_id: AZURE_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: AZURE_REDIRECT_URI,
        code_verifier: req.session.codeVerifier,
        client_secret: AZURE_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    req.session.token = response.data;
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Token exchange failed', details: error.response?.data });
  }
});

app.get('/user', async (req, res) => {
  if (!req.session.token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${req.session.token.access_token}` },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
