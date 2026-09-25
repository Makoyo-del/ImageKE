import React from 'react';
import { HookBunkerDashboard } from '../hookbunker/HookBunkerDashboard';

/**
 * Makoyocart Operations & Developer Workspace Console
 * Career Academy legacy modules (sprints, reviews, student lists, announcements, JForce affiliate)
 * have been permanently retired. This console directly mounts HookBunker with zero-spinner tab transitions.
 */
export default function AcademyDashboard({ onNavigate }) {
  return <HookBunkerDashboard onNavigate={onNavigate} />;
}
