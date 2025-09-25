import { base44 } from './base44Client';

export const Core = base44.integrations.Core;
export const InvokeLLM = base44.integrations.Core.InvokeLLM;

// Mock implementations for other integrations
export const SendEmail = async (data) => ({ success: true, message: 'Mock email sent' });
export const UploadFile = async (file) => ({ success: true, url: 'mock-file-url' });
export const GenerateImage = async (prompt) => ({ success: true, url: 'mock-image-url' });
export const ExtractDataFromUploadedFile = async (file) => ({ success: true, data: {} });
export const CreateFileSignedUrl = async (filename) => ({ success: true, url: 'mock-signed-url' });
export const UploadPrivateFile = async (file) => ({ success: true, url: 'mock-private-url' });