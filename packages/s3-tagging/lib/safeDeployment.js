const { S3Client, ListObjectsV2Command, PutObjectTaggingCommand } = require('@aws-sdk/client-s3');

// GitHub converts action input variables to env vars with INPUT prefix
const s3Client = new S3Client({
  region:
    process.env.INPUT_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    process.env.AWS_REGION ||
    'us-east-1',
}); // Replace 'your-region' with your S3 bucket region

// Function to list all objects in the bucket
module.exports.listAllObjects = async function listAllObjects(bucketName) {
  const allObjects = [];
  let isTruncated = true;
  let continuationToken;

  while (isTruncated) {
    const params = {
      Bucket: bucketName,
      ContinuationToken: continuationToken,
    };

    const response = await s3Client.send(new ListObjectsV2Command(params));
    response.Contents.forEach((obj) => {
      allObjects.push(obj.Key);
    });

    isTruncated = response.IsTruncated;
    continuationToken = response.NextContinuationToken;
  }

  return allObjects;
};

// Function to add a tag to an object
async function addTagsToObject(bucketName, objectKey, tags) {
  const taggingParams = {
    Bucket: bucketName,
    Key: objectKey,
    Tagging: { TagSet: tags },
  };
  await s3Client.send(new PutObjectTaggingCommand(taggingParams));
}

// Function to match object key with the filter
function matchFilter(key, filter) {
  if (filter === '*') {
    return true;
  }

  if (filter.startsWith('*') && filter.endsWith('*')) {
    return key.includes(filter.slice(1, -1));
  } else if (filter.startsWith('*')) {
    return key.endsWith(filter.slice(1));
  } else if (filter.endsWith('*')) {
    return key.startsWith(filter.slice(0, -1));
  } else {
    return key === filter;
  }
}

// Function to process a batch of objects
module.exports.processBatch = async function processBatch(bucketName, objects, filters, batchSize) {
  for (let i = 0; i < objects.length; i += batchSize) {
    const batch = objects.slice(i, i + batchSize);

    const batchPromises = batch.map(async (objectKey) => {
      let tagsToApply = [];
      for (let filter in filters) {
        if (matchFilter(objectKey, filter)) {
          tagsToApply = tagsToApply.concat(
            [filters[filter]].flat().map((tag) => {
              const [key, value] = tag.split('=');
              return { Key: key, Value: value || 'true' };
            })
          );
        }
      }

      if (tagsToApply.length > 0) {
        await addTagsToObject(bucketName, objectKey, tagsToApply);
      }
    });

    await Promise.all(batchPromises);
    console.log(`Processed batch: ${i / batchSize + 1}, Files: ${batch.join(', ')}`);
  }
};
