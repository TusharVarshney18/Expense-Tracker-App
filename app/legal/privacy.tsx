import React from 'react';

import { LegalScreen } from '@/components/LegalScreen';
import { PRIVACY_POLICY } from '@/content/legal';

export default function PrivacyPolicyScreen() {
  return (
    <LegalScreen
      title={PRIVACY_POLICY.title}
      updated={PRIVACY_POLICY.updated}
      sections={PRIVACY_POLICY.sections}
    />
  );
}
