import { InvokeLLM } from './entities.js';

export { InvokeLLM };

export const SendEmail = async () => ({ success: true, message: 'Mock email sent' });
export const UploadFile = async () => ({ success: true, url: 'mock-file-url' });
export const GenerateImage = async () => ({ success: true, url: 'mock-image-url' });
export const ExtractDataFromUploadedFile = async () => ({ success: true, data: {} });
export const CreateFileSignedUrl = async () => ({ success: true, url: 'mock-signed-url' });
export const UploadPrivateFile = async () => ({ success: true, url: 'mock-private-url' });