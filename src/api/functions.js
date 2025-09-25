import { base44 } from './base44Client';

export const testReceiver = async (data) => ({ success: true, message: 'Mock test receiver' });
export const messageProcessor = async (data) => ({ success: true, message: 'Mock message processed' });
export const sendReply = base44.functions.sendReply;
export const emailHandler = async (data) => ({ success: true, message: 'Mock email handled' });