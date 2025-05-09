import { fetchTTSProvidersAndLanguages } from '../services/ttsInfo.service.js';

export const getTTSProvidersAndLanguages = async (req, res, next) => {
  try {
    const providers = await fetchTTSProvidersAndLanguages();
    res.json({ data: providers });
  } catch (error) {
    next(error);
  }
};

