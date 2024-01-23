const core = require('@actions/core');
const { listAllObjects, processBatch } = require('./lib/safeDeployment');

const bucketName = core.getInput('bucket-name', { required: true });
const filters = core.getInput('bucket-name', { required: false });
const batchSize = core.getInput('batch-size', { required: false });

(async () => {
  try {
    core.setOutput('bucket-name', bucketName);

    const objects = await listAllObjects(bucketName);
    await processBatch(bucketName, objects, filters, batchSize);
    console.log('All objects processed');
  } catch (error) {
    console.error(error);
    core.setFailed(error.message);
  }
})();
