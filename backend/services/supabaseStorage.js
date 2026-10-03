const axios = require('axios');

function getObjectPath(fileUrl, projectUrl, bucketName) {
  if (!fileUrl) return null;

  const objectUrl = new URL(fileUrl);
  if (objectUrl.origin !== projectUrl.origin) return null;

  const publicPrefix = `/storage/v1/object/public/${bucketName}/`;
  if (!objectUrl.pathname.startsWith(publicPrefix)) {
    throw new Error('Document URL is not a public object in the configured Supabase bucket');
  }

  const encodedPath = objectUrl.pathname.slice(publicPrefix.length);
  const pathSegments = encodedPath.split('/').map(segment => decodeURIComponent(segment));
  if (pathSegments.some(segment =>
    !segment || segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\')
  )) {
    throw new Error('Document URL contains an invalid Supabase object path');
  }

  return pathSegments.join('/');
}

async function deleteSupabaseObjects(fileUrls) {
  const urls = fileUrls.filter(Boolean);
  if (!urls.length) return;

  const storageUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName = process.env.SUPABASE_BUCKET || 'documents';

  if (!storageUrl || !serviceKey) {
    if (urls.some(url => String(url).includes('/storage/v1/object/'))) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in the backend');
    }
    return;
  }
  if (!bucketName) throw new Error('SUPABASE_BUCKET must not be empty');

  const projectUrl = new URL(storageUrl);
  const objectPaths = [...new Set(urls
    .map(url => getObjectPath(url, projectUrl, bucketName))
    .filter(Boolean))];
  if (!objectPaths.length) return;

  const url = `${projectUrl.origin}/storage/v1/object/${encodeURIComponent(bucketName)}`;
  const requestConfig = {
    data: { prefixes: objectPaths },
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  };
  const retryableNetworkErrors = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN']);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await axios.delete(url, requestConfig);
      return;
    } catch (error) {
      const status = error.response?.status;
      const canRetry = !status && retryableNetworkErrors.has(error.code) && attempt === 1;
      if (canRetry) {
        console.warn(`Supabase Storage delete timed out (${error.code}); retrying once.`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      throw new Error(status
        ? `Supabase Storage deletion failed with HTTP ${status}`
        : `Supabase Storage deletion failed (${error.code || 'network error'})`);
    }
  }
}

module.exports = { deleteSupabaseObjects };
