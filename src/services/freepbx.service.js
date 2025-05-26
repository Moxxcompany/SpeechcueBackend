import { gql, request } from 'graphql-request';
import logger from '../config/logger.js';
import fetch from 'node-fetch';
import db from '../models/index.js';
const { Extension, User } = db;

const endpoint = process.env.FREEPBX_GRAPHQL_ENDPOINT;
const tokenUrl = process.env.FREEPBX_TOKEN_URL;
const clientId = process.env.FREEPBX_CLIENT_ID;
const clientSecret = process.env.FREEPBX_CLIENT_SECRET;

async function getAccessToken() {
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    logger.error(`❌ Token fetch failed: ${JSON.stringify(data)}`);
    throw new Error(data.error_description || 'Token fetch failed');
  }

  return data.access_token;
}

export const createExtension = async ({ userId, displayname, email }) => {

  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  // Get next available extensionId
  const lastExtension = await Extension.findOne({ order: [['extensionId', 'DESC']] });
  const nextExtensionId = lastExtension ? lastExtension.extensionId + 1 : 1010;

  const mutation = gql`
    mutation {
      addExtension(input: {
        extensionId: "${nextExtensionId}",
        tech: "pjsip",
        name: "${displayname}",
        email: "${email}"
      }) {
        status
        message
      }
    }
  `;

  try {
    // Step 1: Fetch Access Token
    const token = await getAccessToken();

    // Step 2: Call FreePBX GraphQL
    const res = await request(endpoint, mutation, {}, {
      Authorization: `Bearer ${token}`
    });

    console.log("###res.addExtension?.status", res?.addExtension?.status)
    if (!res?.addExtension?.status) {
      throw new Error(res?.addExtension?.message || 'Failed to create extension on FreePBX');
    }

    // Step 3: Save in PostgreSQL
    const saved = await Extension.create({
      userId,
      extensionId: nextExtensionId,
      displayname,
      email
    });

    logger.info(`✅ Extension created and stored: ${nextExtensionId}`);
    return saved;

  } catch (err) {
    logger.error(`❌ Error in createExtension: ${err.message}`);
    throw err;
  }
};

export const getAllExtensions = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const dbExtensions = await Extension.findAll({ where: { userId }, raw: true });
  if (!dbExtensions.length) return [];

  const token = await getAccessToken();


  const gqlQuery = gql`
    query {
      fetchAllExtensions {
        count
        totalCount
        status
        message
        edges {
          cursor
          node {
            id
            extensionId
            tech
          }
        }
        extension {
          extensionId
          tech
          id
          tech
          user {
            id
            extension
            name
          }
        }
      }
    }
  `;

  const data = await request(endpoint, gqlQuery, {}, {
    Authorization: `Bearer ${token}`
  });

  const allRemote = data?.fetchAllExtensions?.extension || [];

  // Get just the extensionIds this user owns
  const userExtensionIds = dbExtensions.map(ext => ext.extensionId);

  // Filter and enrich with DB info
  const result = allRemote
    .filter(remote => userExtensionIds.includes(parseInt(remote.extensionId)))
    .map(remote => {
      const dbData = dbExtensions.find(db => db.extensionId === parseInt(remote.extensionId));
      return {
        ...remote,
        displayname: dbData?.displayname,
        email: dbData?.email,
        createdAt: dbData?.createdAt,
        updatedAt: dbData?.updatedAt
      };
    });

  return { result, totalCount: result.length };
};

export const getExtensionById = async (id, userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const dbExtension = await Extension.findOne({ where: { extensionId: id, userId }, raw: true });
  if (!dbExtension) return null;

  const token = await getAccessToken();

  const gqlQuery = gql`
    query {
      fetchExtension(extensionId: "${id}") {
        extensionId
        tech
        id
        user {
          id
          extension
          name
        }
      }
    }
  `;

  const data = await request(endpoint, gqlQuery, {}, {
    Authorization: `Bearer ${token}`
  });

  const remote = data?.fetchExtension;
  if (!remote) return null;

  // Merge remote with local DB values
  return {
    ...remote,
    displayname: dbExtension.displayname,
    email: dbExtension.email,
    createdAt: dbExtension.createdAt,
    updatedAt: dbExtension.updatedAt
  };
};

export const updateExtension = async (id, input, userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const dbExtension = await Extension.findOne({ where: { extensionId: id, userId } });
  if (!dbExtension) throw new Error('Extension not found or access denied');

  const mutation = gql`
    mutation {
      updateExtension(input: {
        extensionId: "${id}",
        name: "${input.displayname}",
        email: "${input.email}"
      }) {
        status
        message
      }
    }
  `;

  const token = await getAccessToken();
  const data = await request(endpoint, mutation, {}, {
    Authorization: `Bearer ${token}`
  });

  if (!data.updateExtension?.status) {
    throw new Error(data.updateExtension?.message || 'Failed to update FreePBX extension');
  }

  // Update local DB
  const updated = await dbExtension.update({
    displayname: input.displayname,
    email: input.email
  });

  return {
    ...data.updateExtension,
    extension: updated
  };
};

export const deleteExtension = async (id, userId) => {
  try {

    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    // Step 1: Check if extension exists in local DB
    const extension = await Extension.findOne({
      where: { extensionId: id, userId }
    });

    console.log('DB Extension:', extension, { id, userId });
    if (!extension) {
      logger.warn(`⚠️ Extension ${id} not found for user ${userId} in local DB`);
      throw new Error('Extension not found or access denied');
    }

    // Step 2: Delete from FreePBX 
    const mutation = gql`
      mutation DeleteExtension($input: deleteExtensionInput!) {
        deleteExtension(input: $input) {
          status
          message
        }
      }
    `;

    const variables = {
      input: {
        extensionId: parseInt(id)
      }
    };

    const token = await getAccessToken();
    const data = await request(endpoint, mutation, variables, {
      Authorization: `Bearer ${token}`
    });

    logger.info(`✅ Deleted extension ${id} from FreePBX`);

    // Step 3: Delete from local DB
    await extension.destroy();
    logger.info(`🗑️ Deleted extension ${id} from local DB`);

    return data.deleteExtension;
  } catch (err) {
    logger.error(`❌ Failed to delete extension ${id}: ${err.message}`);
    throw err;
  }
};

export async function createRingGroup({ ringGroupId, strategy = 'ringall', members }) {
  try {
    const token = await getAccessToken();

    const mutation = gql`
      mutation {
        addRingGroup(input: {
          groupNumber: "${ringGroupId}",
          strategy: "${strategy}",
          extensionList: "${members.join('-')}"
        }) {
          status
          message
        }
      }
    `;

    const result = await request(endpoint, mutation, {}, {
      Authorization: `Bearer ${token}`
    });

    console.log("✅ Ring group mutation result:", result);

    if (!result?.addRingGroup?.status) {
      throw new Error(result?.addRingGroup?.message || 'Ring group creation failed');
    }

    return true;
  } catch (error) {
    console.error('❌ Unexpected error creating ring group:', error);
    throw new Error('Failed to create ring group');
  }
}

export async function updateRingGroup({ ringGroupId, strategy = 'ringall', members = [], description = '' }) {
  const token = await getAccessToken();

  const mutation = gql`
    mutation {
      updateRingGroup(input: {
        groupNumber: "${ringGroupId}",
        strategy: "${strategy}",
        extensionList: "${members.join('-')}",
        description: "${description}"
      }) {
        status
        message
      }
    }
  `;

  const result = await request(endpoint, mutation, {}, {
    Authorization: `Bearer ${token}`
  });

  if (!result?.updateRingGroup?.status) {
    logger.error(`❌ Failed to update ring group ${ringGroupId}: ${result?.updateRingGroup?.message}`);
    throw new Error(result?.updateRingGroup?.message || 'Ring group update failed');
  }

  logger.info(`✅ Ring group ${ringGroupId} updated successfully in FreePBX`);
  return true;
}

export async function deleteRingGroup(ringGroupId) {
  const token = await getAccessToken();

  const mutation = gql`
    mutation {
      deleteRingGroup(input: {
        groupNumber: ${ringGroupId}
      }) {
        status
        message
      }
    }
  `;

  const result = await request(endpoint, mutation, {}, {
    Authorization: `Bearer ${token}`
  });

  if (!result?.deleteRingGroup?.status) {
    logger.error(`❌ Failed to delete ring group ${ringGroupId}: ${result?.deleteRingGroup?.message}`);
    throw new Error(result?.deleteRingGroup?.message || 'Ring group deletion failed');
  }

  logger.info(`✅ Ring group ${ringGroupId} deleted successfully in FreePBX`);
  return true;
}


export const getAllCdrs = async (options = {}) => {
  const token = await getAccessToken();
  // cdrs {
  //   id
  //   uniqueid
  //   calldate
  //   timestamp
  //   clid
  //   src
  //   dst
  //   dcontext
  //   channel
  //   dstchannel
  //   lastapp
  //   lastdata
  //   duration
  //   billsec
  //   disposition
  //   accountcode
  //   userfield
  //   did
  //   recordingfile
  //   cnum
  //   outbound_cnum
  //   outbound_cnam
  //   dst_cnam
  //   linkedid
  //   peeraccount
  //   sequence
  //   amaflags
  // }
  const gqlQuery = gql`
    query {
      fetchAllCdrs {
        totalCount
        status
        message
      }
    }
  `;

  const variables = {
    first: options?.first || 10,
    after: options?.after || 0,
    orderby: options?.orderby || 'duration',
    startDate: options?.startDate || '2021-01-01',
    endDate: options?.endDate || '2025-12-31'
  };

  const data = await request(endpoint, gqlQuery, {}, {
    Authorization: `Bearer ${token}`
  });

  console.log("###data",data)
  // Return the raw result from the API
  return data?.fetchAllCdrs || {};
};
