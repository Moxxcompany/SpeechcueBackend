import { request, gql } from 'graphql-request';
import dotenv from 'dotenv';
import logger from '../config/logger.js';
import fetch from 'node-fetch';
dotenv.config();

const endpoint = process.env.FREEPBX_GRAPHQL_ENDPOINT;
const tokenUrl = process.env.FREEPBX_TOKEN_URL;
const clientId = process.env.FREEPBX_CLIENT_ID;
const clientSecret = process.env.FREEPBX_CLIENT_SECRET;
const scope = process.env.FREEPBX_SCOPE || 'all';

export const createExtension = async ({ extensionId, password, displayname, name, email }) => {
  const mutation = gql`
    mutation {
      createExtension(input: {
        tech: "pjsip",
        extensionId: "${extensionId}",
        password: "${password}",
        displayname: "${displayname}",
        user: { name: "${name}", email: "${email}" }
      }) {
        extension {
          extensionId
          displayname
          tech
        }
      }
    }
  `;

  try {
    // Step 1: Fetch Access Token
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      logger.error(`❌ Failed to get FreePBX token: ${JSON.stringify(tokenData)}`);
      throw new Error(tokenData.error_description || 'Unable to fetch FreePBX token');
    }

    const token = tokenData.access_token;

    // Step 2: Perform GraphQL mutation
    const data = await request(endpoint, mutation, {}, {
      Authorization: `Bearer ${token}`
    });

    logger.info(`✅ FreePBX extension created: ${extensionId}`);
    return data.createExtension.extension;
  } catch (err) {
    logger.error(`❌ Failed to create FreePBX extension: ${err.message}`);
    throw err;
  }
};
