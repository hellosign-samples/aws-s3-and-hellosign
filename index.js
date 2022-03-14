// Please refer to the README file and follow setup instructions before running demo
// IMPORTANT: remember to add your own info to .env.example and rename to .env

//** Imports **/

// Custom helper functions for AWS API
// Setting environment variables in ES6
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import dotenv from 'dotenv';
dotenv.config({path: __dirname + '/.env'});
// Custom helper functions for HelloSign API
import * as hsHelper from './libs/hellosign-helpers.js';
// Custom helper functions for AWS API
import * as awsHelper from './libs/aws-helpers.js';

//** Functions **/

// Ties together functions to initiate signature flow
const startSignatureFlow = async (userDefinedInfo) => {
    // Values from user originate from .env file
    const { signerName, signerEmail, unsignedFilePath, s3BucketName } = userDefinedInfo;
    try {
        // Upload file to s3 and return bucket data
        const bucketParams = await awsHelper.uploadFileToS3(unsignedFilePath, s3BucketName);
        // Use bucket params to generate presigned url
        const s3FileInfo = await awsHelper.getPresignedUrl(bucketParams);
        // Create signature request using file url from S3
        const signatureRequest = await hsHelper.sendSignatureRequest(s3FileInfo, signerName, signerEmail, unsignedFilePath);
        console.log(`Started signature request on HS: ${signatureRequest.signature_request_id}.`);
    } catch (err) {
        console.log('Something went wrong in initial signature flow:', err);
    }
};

// Grabbing the user defined values from .env
const userDefinedInfo = {
    signerName: process.env['signer_name'],
    signerEmail: process.env['signer_email'],
    unsignedFilePath: process.env['local_file_path'],
    s3BucketName: process.env['s3_bucket_name']
};

// Initiate the signature flow on server start
startSignatureFlow(userDefinedInfo);

//** Exports **/

export { startSignatureFlow };
