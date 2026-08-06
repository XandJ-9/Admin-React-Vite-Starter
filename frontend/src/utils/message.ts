import type { MessageInstance } from 'antd/es/message/interface';

let messageInstance: MessageInstance | null = null;

export function setMessageInstance(instance: MessageInstance): void {
  messageInstance = instance;
}

export function getMessageInstance(): MessageInstance | null {
  return messageInstance;
}
