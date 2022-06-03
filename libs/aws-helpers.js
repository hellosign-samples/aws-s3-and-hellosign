//** Imports **/

// Utility tools
import { basename } from 'path';
import fs from 'fs';
// Helper function creates new S3 client
import { s3Client } from "./s3Client.js";
// Methods being used from the aws-sdk
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

//** Functions **/

// Uploads local file to s3 bucket
//  - Used for both signed and unsigned files
const uploadFileToS3 = async (filePath, bucketName) => {
    const splitPath = filePath.split('/');
    const parentFolder = splitPath[splitPath.length - 2];
    const fileName = basename(filePath);
    try {
        // Set key to store file in correct folder
        const fileKey = (
            parentFolder === "signed-files"
                ? `signed-docs/${fileName}`
                : `unsigned-docs/${fileName}`
        );
        // Configure S3 bucket parameters
        const bucketParams = {
            Bucket: bucketName,
            Key: fileKey,
            Body: fs.readFileSync(filePath)
        };
        await s3Client.send(new PutObjectCommand(bucketParams));
        console.log(`Uploaded ${fileName} to S3 bucket: ${bucketName}.`);
        return { Bucket: bucketName, Key: fileKey};
    } catch (err) {
        console.log("Something went wrong uploading file to S3 bucket:", err);
    }
};

// Grabs presigned url for file in s3
// - Passed directly to HelloSign instead of downloading
const getPresignedUrl = async (bucketParams) => {
    try {
        const command = new GetObjectCommand(bucketParams);
        // Presigned URL set to expire after 30 seconds
        const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 30,
        });
        console.log(`Created presigned url for ${bucketParams.Key}.`);
        return { presignedUrl: signedUrl, bucketName: bucketParams.Bucket };
    } catch (err) {
        console.log ("Error creating presigned URL", err);
    }
};

//** Exports **/

export { uploadFileToS3, getPresignedUrl };