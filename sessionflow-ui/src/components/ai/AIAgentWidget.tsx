import React from 'react';
import { AIFloatingButton } from './AIFloatingButton';
import { AIChatPanel } from './AIChatPanel';

/** Single mount point — add <AIAgentWidget /> once in Shell.tsx */
export const AIAgentWidget: React.FC = () => (
  <>
    <AIFloatingButton />
    <AIChatPanel />
  </>
);
