// Barrel export for AI Agent system
export { AIFloatingButton } from './AIFloatingButton';
export { AIChatPanel } from './AIChatPanel';
export { AIMessageList } from './AIMessageList';
export { AIMessageInput } from './AIMessageInput';

// Convenience composite widget — mount this single component in Shell
import React from 'react';
import { AIFloatingButton } from './AIFloatingButton';
import { AIChatPanel } from './AIChatPanel';

export const AIAgentWidget: React.FC = () => (
  <>
    <AIFloatingButton />
    <AIChatPanel />
  </>
);
