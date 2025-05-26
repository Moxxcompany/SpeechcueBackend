import * as callRecordingsService from '../services/callrecording.service.js';
import path from 'path';
import axios from 'axios';
import { getAllCdrs } from '../services/freepbx.service.js';

export const getRecordingsByIVR = async (req, res, next) => {
  try {
    const { ivrId } = req.params;
    const recordings = await callRecordingsService.findByIVRId(ivrId);

    // Optionally fetch audio URLs for each recording
    const enriched = await Promise.all(recordings.map(async (r) => {
        const recordings = await getAllCdrs();
        console.log('recordings', recordings);
      try {
        await axios.head(remoteUrl);
        return { ...r.toJSON(), audioUrl: remoteUrl };
      } catch {
        return { ...r.toJSON(), audioUrl: null };
      }
    }));

    res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};
