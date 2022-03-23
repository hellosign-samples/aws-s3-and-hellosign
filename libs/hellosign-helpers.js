//** Imports **/

// Setting environment variables in ES6
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({path: path.resolve(__dirname, '../.env') });
// Utility tools
import fs from 'fs';
import crypto from 'crypto';
// Instantiate HelloSign SDK
import HelloSign from 'hellosign-sdk';
const hellosignClient = HelloSign({ key: process.env['HS_API_KEY'] });

//** Functions **/

// Sends file for signature using HelloSign API
// - This signature flow appends a signer page onto the document by default
// - Placing fields directly onto document with form_fields_per_document changes this behavior
const sendSignatureRequest = async (s3FileInfo, signerName, signerEmail, filePath) => {
    try {
        // Configure HelloSign signature request options
        const options = {
            test_mode: 1,
            clientId: process.env['HS_CLIENT_ID'],
            title: "Signature flow example using HelloSign and AWS S3",
            subject: "Please sign this document we discussed",
            message: "This text goes in the body of the email. Write your own message!",
            signers: [{
                email_address: signerEmail,
                name: signerName
            }],
            file_url: [s3FileInfo.presignedUrl],
            metadata: {
                s3_bucket: s3FileInfo.bucketName,
                file_name: path.basename(filePath)
            }
        };
        const response = await hellosignClient.signatureRequest.send(options);
        return response.signature_request;
    } catch (err) {
        console.log("Error sending signature request", err);
    }
};

// Helper function used to download signed file from HelloSign
const downloadSignedFile = async (signatureRequestId, fileName) => {
    console.log("Attempting to download completed signature request from HS:", signatureRequestId);
    try {
        // Make sure there's a local folder to store signed files
        const signedFileDir = path.resolve(__dirname, '../signed-files/');
        if (!fs.existsSync(signedFileDir)){
            fs.mkdirSync(signedFileDir);
        };
        // Download signed file from HelloSign
        const signedFile = await hellosignClient.signatureRequest.download(signatureRequestId);
        const filePath = path.resolve(__dirname, `../signed-files/signed-${fileName}`);
        // Ensure the file is written before we return the file path
        return new Promise ((resolve, reject) => {
            // Save file locally to be sent to S3
            const file = fs.createWriteStream(filePath);
            signedFile.pipe(file);
            file.on('finish', () => { 
                file.close(); 
                console.log("Signed file saved locally!");
                resolve(filePath);
            });
            file.on('error', err => {
                reject(err);
            });
        });
    } catch (err) {
        console.log ("Error saving file from HelloSign:", err);
    }
};

// Helper function to verify source of HelloSign events for security purposes
const verifyEventHash = (event) => {
    const eventHash = event.event_hash;
    const apiKey = process.env['HS_API_KEY'];
    const generatedHash = crypto.createHmac('sha256', apiKey).update(event.event_time + event.event_type).digest('hex').toString();
    // Sends back a boolean to confirm whether this payload is safe to process
    return Boolean(generatedHash === eventHash);
}

//** Exports **/

export { sendSignatureRequest, downloadSignedFile, verifyEventHash };